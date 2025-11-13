from datetime import datetime

from flask import Blueprint, current_app, jsonify, request, url_for

import stripe

from modules.auth.decorators import login_required, role_required
from modules.services.firestore_client import get_firestore_client

if hasattr(stripe, "error"):
    StripeError = stripe.error.StripeError  # type: ignore[attr-defined]
    InvalidRequestError = stripe.error.InvalidRequestError  # type: ignore[attr-defined]
else:
    # Compatibilidad con versiones donde los errores están en stripe._error
    from stripe._error import InvalidRequestError, StripeError

vendors_bp = Blueprint("vendors_api", __name__)

def _now_iso():
    return datetime.utcnow().isoformat()


def _get_stripe_client():
    """
    Inicializa la librería de Stripe con la API key configurada.
    """
    secret_key = current_app.config.get("STRIPE_SECRET_KEY")
    if not secret_key:
        raise RuntimeError("Stripe no está configurado en el servidor.")

    stripe.api_key = secret_key
    return stripe


def _ensure_firestore_vendor(vendor_id):
    """
    Obtiene una referencia al documento del vendedor en Firestore.
    Devuelve (doc_ref, snapshot_dict) o (None, None) si Firestore no está disponible.
    """
    client = get_firestore_client()
    if not client:
        return None, None

    doc_ref = client.collection("usuarios").document(vendor_id)
    snapshot = doc_ref.get()
    if snapshot.exists:
        return doc_ref, snapshot.to_dict()

    return doc_ref, {}


def _save_vendor_account(vendor_id, account_id, email=None, status=None, extra=None):
    client = get_firestore_client()
    if not client:
        return

    doc_ref = client.collection("usuarios").document(vendor_id)
    payload = {
        "stripe_account_id": account_id,
        "stripe_account_email": (email or "").lower(),
        "stripe_account_link_created_at": _now_iso(),
        "updated_at": _now_iso(),
    }
    if status:
        payload["stripe_status"] = status
        payload["stripe_account_status"] = status
    if extra:
        payload.update(extra)

    doc_ref.set(payload, merge=True)


def _get_vendor_account(vendor_id):
    client = get_firestore_client()
    if not client:
        return None
    snapshot = client.collection("usuarios").document(vendor_id).get()
    if not snapshot.exists:
        return None
    data = snapshot.to_dict() or {}
    account_id = data.get("stripe_account_id")
    if not account_id:
        return None
    return {
        "vendor_id": vendor_id,
        "account_id": account_id,
        "email": data.get("stripe_account_email"),
        "status": data.get("stripe_status") or data.get("stripe_account_status") or {},
    }


def _ensure_vendor_exists(vendor_id):
    account = _get_vendor_account(vendor_id)
    if not account:
        raise ValueError("No existe una cuenta conectada para este vendedor.")
    return account


def _ensure_vendor_ready(vendor_id):
    vendor_account = _ensure_vendor_exists(vendor_id)
    stripe_client = _get_stripe_client()
    account = stripe_client.Account.retrieve(vendor_account["account_id"])

    status = {
        "charges_enabled": account.charges_enabled,
        "payouts_enabled": account.payouts_enabled,
        "details_submitted": account.details_submitted,
        "last_checked": _now_iso(),
    }

    _save_vendor_account(
        vendor_id,
        vendor_account["account_id"],
        email=account.email or vendor_account.get("email"),
        status=status,
    )

    if not (account.charges_enabled and account.payouts_enabled and account.details_submitted):
        raise ValueError("La cuenta del vendedor aún no está habilitada para cobrar.")

    return vendor_account, account


def _find_completed_account_by_email(email, exclude_vendor_id=None):
    """
    Busca en Firestore si existe otro vendedor (distinto a exclude_vendor_id) cuyo correo
    ya tenga una cuenta de Stripe con cobros y pagos habilitados.
    """
    if not email:
        return None

    client = get_firestore_client()
    if not client:
        return None

    try:
        query = (
            client.collection("usuarios")
            .where("stripe_account_email", "==", email.lower())
            .limit(5)
            .stream()
        )
    except Exception as exc:
        current_app.logger.warning("No se pudo consultar Firestore por email: %s", exc)
        return None

    for doc in query:
        if exclude_vendor_id and doc.id == exclude_vendor_id:
            continue
        data = doc.to_dict() or {}
        account_id = data.get("stripe_account_id")
        status = data.get("stripe_status") or data.get("stripe_account_status") or {}
        charges = bool(status.get("charges_enabled"))
        payouts = bool(status.get("payouts_enabled"))
        details = status.get("details_submitted")

        if not details and charges and payouts:
            details = True

        if account_id and charges and payouts:
            return {
                "vendor_id": doc.id,
                "account_id": account_id,
                "status": {
                    "charges_enabled": charges,
                    "payouts_enabled": payouts,
                    "details_submitted": bool(details),
                    "last_checked": status.get("last_checked"),
                },
                "data": data,
            }
    return None


def _lookup_stripe_account_by_email(email):
    """
    Consulta directamente a Stripe para encontrar una cuenta cuyo correo coincida.
    Devuelve el objeto Account o None si no se encuentra coincidencia.
    """
    if not email:
        return None

    try:
        stripe_client = _get_stripe_client()
        normalized_email = email.strip().lower()
        account_search = getattr(stripe_client.Account, "search", None)

        if callable(account_search):
            accounts = account_search(query=f"email:'{normalized_email}'", limit=10)
            iterator = accounts.auto_paging_iter()
        else:
            accounts = stripe_client.Account.list(limit=25)
            iterator = getattr(accounts, "auto_paging_iter", lambda: accounts.data)()

        for account in iterator:
            account_email = (account.email or "").strip().lower()
            if account_email == normalized_email:
                return account
    except InvalidRequestError as exc:
        current_app.logger.warning("Stripe no permite búsqueda directa por email: %s", exc)
    except StripeError as exc:
        current_app.logger.warning("No se pudo buscar cuenta de Stripe por email %s: %s", email, exc)
    except Exception as exc:
        current_app.logger.warning("Error inesperado buscando cuenta por email %s: %s", email, exc)
    return None


def _process_create_account(payload):
    current_app.logger.info("🟢 _process_create_account para vendorId=%s payload=%s", payload.get("vendorId"), payload)
    stripe_client = _get_stripe_client()
    vendor_id = (payload.get("vendorId") or payload.get("vendor_id") or "").strip()
    if not vendor_id:
        raise ValueError("vendorId es obligatorio.")

    email = (payload.get("email") or "").strip().lower()
    business_type = (payload.get("businessType") or payload.get("business_type") or "individual").lower()

    doc_ref, vendor_doc = _ensure_firestore_vendor(vendor_id)
    stripe_account_id = vendor_doc.get("stripe_account_id") if vendor_doc else None

    if not email and vendor_doc:
        email = (
            vendor_doc.get("stripe_account_email")
            or vendor_doc.get("email")
            or vendor_doc.get("correo")
            or ""
        ).strip().lower()

    if not email:
        raise ValueError("email es obligatorio.")

    reuse_candidate = None
    if email and not stripe_account_id:
        reuse_candidate = _find_completed_account_by_email(email, exclude_vendor_id=vendor_id)

    if reuse_candidate:
        current_app.logger.info("♻️ Reutilizando cuenta Stripe existente %s para vendorId=%s", reuse_candidate["account_id"], vendor_id)
        account = stripe_client.Account.retrieve(reuse_candidate["account_id"])
        status_payload = {
            "charges_enabled": account.charges_enabled,
            "payouts_enabled": account.payouts_enabled,
            "details_submitted": account.details_submitted,
            "last_checked": _now_iso(),
        }
        onboarding_url = _create_account_link(stripe_client, account.id, account)

        metadata_extra = {
            "stripe_account_created_at": reuse_candidate["data"].get("stripe_account_created_at")
            or _now_iso(),
            "stripe_account_source_vendor": reuse_candidate["vendor_id"],
        }

        _save_vendor_account(
            vendor_id,
            account.id,
            email=account.email or email,
            status=status_payload,
            extra=metadata_extra,
        )

        already_completed = (
            status_payload["charges_enabled"]
            and status_payload["payouts_enabled"]
            and status_payload["details_submitted"]
        )

        return {
            "success": True,
            "vendorId": vendor_id,
            "reusedAccount": True,
            "sourceVendorId": reuse_candidate["vendor_id"],
            "stripeAccountId": account.id,
            "onboardingUrl": onboarding_url,
            "account": status_payload,
            "alreadyCompleted": already_completed,
        }

    if stripe_account_id:
        current_app.logger.info("🔁 Recuperando cuenta existente %s para vendorId=%s", stripe_account_id, vendor_id)
        account = stripe_client.Account.retrieve(stripe_account_id)
    else:
        current_app.logger.info("🆕 Creando cuenta nueva para vendorId=%s email=%s", vendor_id, email)
        account_params = {
            "type": "standard",
            "business_type": business_type,
            "capabilities": {
                "card_payments": {"requested": True},
                "transfers": {"requested": True},
            },
        }
        if email:
            account_params["email"] = email
        account = stripe_client.Account.create(**account_params)
        stripe_account_id = account.id

    onboarding_url = _create_account_link(stripe_client, stripe_account_id, account)

    status_payload = {
        "charges_enabled": account.charges_enabled,
        "payouts_enabled": account.payouts_enabled,
        "details_submitted": account.details_submitted,
        "last_checked": _now_iso(),
    }

    _save_vendor_account(
        vendor_id,
        stripe_account_id,
        email=account.email or email,
        status=status_payload,
    )

    already_completed = (
        status_payload["charges_enabled"]
        and status_payload["payouts_enabled"]
        and status_payload["details_submitted"]
    )

    return {
        "success": True,
        "vendorId": vendor_id,
        "reusedAccount": False,
        "stripeAccountId": stripe_account_id,
        "onboardingUrl": onboarding_url,
        "account": status_payload,
        "alreadyCompleted": already_completed,
    }


@vendors_bp.route("/create-account", methods=["POST"])
@login_required
@role_required("vendedor")
def create_connect_account():
    """
    Crea una cuenta de Stripe Connect Standard para el vendedor y devuelve la URL de onboarding.
    Si el vendedor ya tiene una cuenta asociada, se reutiliza.
    """
    payload = request.get_json() or {}
    try:
        current_app.logger.info("📩 /vendors/create-account payload=%s", payload)
        result = _process_create_account(payload)
        current_app.logger.info("✅ /vendors/create-account resultado=%s", result)
        return jsonify(result)
    except ValueError as exc:
        current_app.logger.warning("⚠️ Datos inválidos create-account: %s", exc)
        return jsonify({"success": False, "error": str(exc)}), 400
    except StripeError as exc:
        current_app.logger.error("❌ Stripe error al crear cuenta: %s", exc, exc_info=True)
        return jsonify({"success": False, "error": str(exc)}), 400
    except Exception as exc:
        current_app.logger.exception("💥 Error inesperado creando cuenta de Stripe.")
        return jsonify({"success": False, "error": "No fue posible crear la cuenta de Stripe."}), 500


@vendors_bp.route("/create-account/public", methods=["POST"])
def create_connect_account_public():
    """
    Versión sin autenticación, útil para pruebas locales o consumo externo.
    """
    payload = request.get_json() or {}
    try:
        current_app.logger.info("📩 /vendors/create-account/public payload=%s", payload)
        result = _process_create_account(payload)
        current_app.logger.info("✅ /vendors/create-account/public resultado=%s", result)
        return jsonify(result)
    except ValueError as exc:
        current_app.logger.warning("⚠️ Datos inválidos create-account/public: %s", exc)
        return jsonify({"success": False, "error": str(exc)}), 400
    except StripeError as exc:
        current_app.logger.error("❌ Stripe error al crear cuenta (public): %s", exc, exc_info=True)
        return jsonify({"success": False, "error": str(exc)}), 400
    except Exception as exc:
        current_app.logger.exception("💥 Error inesperado creando cuenta de Stripe (public).")
        return jsonify({"success": False, "error": "No fue posible crear la cuenta de Stripe."}), 500


@vendors_bp.route("/status/<vendor_id>", methods=["GET"])
@login_required
@role_required("vendedor")
def get_connect_status(vendor_id):
    """
    Devuelve el estado actual de la cuenta de Stripe Connect del vendedor.
    Si no existe cuenta asociada, responde con pending=True.
    """
    vendor_id = (vendor_id or "").strip()
    if not vendor_id:
        return jsonify({"error": "vendorId es obligatorio."}), 400

    requested_email = (request.args.get("email") or "").strip().lower()

    doc_ref, vendor_doc = _ensure_firestore_vendor(vendor_id)
    stripe_account_id = vendor_doc.get("stripe_account_id") if vendor_doc else None
    vendor_email = (
        requested_email
        or (vendor_doc.get("stripe_account_email") if vendor_doc else None)
        or (vendor_doc.get("email") if vendor_doc else None)
        or (vendor_doc.get("correo") if vendor_doc else None)
        or ""
    ).strip().lower()

    stripe_client = None
    account = None

    if stripe_account_id:
        try:
            stripe_client = _get_stripe_client()
            account = stripe_client.Account.retrieve(stripe_account_id)
        except InvalidRequestError:
            current_app.logger.warning("Cuenta de Stripe %s no encontrada, intentando recuperar por email.", stripe_account_id)
            stripe_account_id = None
            account = None
        except Exception as exc:
            current_app.logger.exception("Error obteniendo account %s: %s", stripe_account_id, exc)
            return jsonify({"error": "No fue posible obtener el estado de Stripe."}), 500

    if not stripe_account_id and vendor_email:
        current_app.logger.info("Buscando cuenta de Stripe por email %s", vendor_email)
        account = _lookup_stripe_account_by_email(vendor_email)
        if account:
            stripe_account_id = account.id
            stripe_client = stripe_client or _get_stripe_client()
            status_payload = {
                "charges_enabled": account.charges_enabled,
                "payouts_enabled": account.payouts_enabled,
                "details_submitted": account.details_submitted,
                "requirements_due": account.requirements.currently_due if hasattr(account, "requirements") else [],
                "disabled_reason": getattr(account, "disabled_reason", None),
                "last_checked": datetime.utcnow().isoformat(),
                "stripe_account_id": stripe_account_id,
                "dashboard_url": f"https://dashboard.stripe.com/connect/accounts/{stripe_account_id}",
            }
            if doc_ref:
                doc_ref.set(
                    {
                        "stripe_account_id": stripe_account_id,
                        "stripe_account_email": vendor_email,
                        "stripe_status": status_payload,
                        "stripe_account_status": status_payload,
                        "stripe_account_link_created_at": _now_iso(),
                        "updated_at": _now_iso(),
                    },
                    merge=True,
                )
            return jsonify({"pending": False, "status": status_payload})

    if not stripe_account_id:
        return jsonify(
            {
                "pending": True,
                "message": "El vendedor aún no tiene una cuenta de Stripe conectada.",
            }
        ), 200

    try:
        stripe_client = stripe_client or _get_stripe_client()
        account = account or stripe_client.Account.retrieve(stripe_account_id)

        status_payload = {
            "charges_enabled": account.charges_enabled,
            "payouts_enabled": account.payouts_enabled,
            "details_submitted": account.details_submitted,
            "requirements_due": account.requirements.currently_due if hasattr(account, "requirements") else [],
            "disabled_reason": getattr(account, "disabled_reason", None),
            "last_checked": datetime.utcnow().isoformat(),
            "stripe_account_id": stripe_account_id,
            "dashboard_url": f"https://dashboard.stripe.com/connect/accounts/{stripe_account_id}",
        }

        status_payload["onboardingUrl"] = _create_account_link(stripe_client, stripe_account_id, account)
        status_payload["alreadyCompleted"] = (
            status_payload["charges_enabled"]
            and status_payload["payouts_enabled"]
            and status_payload["details_submitted"]
        )

        if doc_ref:
            doc_ref.set(
                {"stripe_status": status_payload, "stripe_account_status": status_payload},
                merge=True,
            )

        return jsonify({"pending": False, "status": status_payload})
    except StripeError as exc:
        current_app.logger.error("Stripe error consultando estado: %s", exc)
        return jsonify({"error": str(exc)}), 400
    except Exception as exc:
        current_app.logger.exception("Error inesperado obteniendo estado de Stripe.")
        return jsonify({"error": "No fue posible obtener el estado de Stripe."}), 500


@vendors_bp.route("/payments/create-intent", methods=["POST"])
@login_required
@role_required("vendedor")
def create_payment_intent():
    """
    Crea un PaymentIntent conectado, enviando la comisión a la plataforma y el resto al vendedor.
    Espera vendorId, amount (centavos) y applicationFeeAmount o platformFeePercent.
    """
    try:
        payload = request.get_json() or {}
        vendor_id = (payload.get("vendorId") or payload.get("vendor_id") or "").strip()
        amount = payload.get("amount")
        currency = (payload.get("currency") or "mxn").lower()
        application_fee_amount = payload.get("applicationFeeAmount")
        platform_fee_percent = payload.get("platformFeePercent")
        metadata = payload.get("metadata") or {}

        if not vendor_id:
            return jsonify({"error": "vendorId es obligatorio"}), 400

        if amount is None or not isinstance(amount, (int, float)) or amount <= 0:
            return jsonify({"error": "amount (centavos) es obligatorio y debe ser numérico"}), 400

        vendor_account, account = _ensure_vendor_ready(vendor_id)

        calculated_fee = application_fee_amount
        if calculated_fee is None and platform_fee_percent is not None:
            try:
                calculated_fee = int(amount * (float(platform_fee_percent) / 100))
            except Exception:
                return jsonify({"error": "platformFeePercent debe ser numérico"}), 400

        if calculated_fee is None:
            return jsonify(
                {"error": "Debes enviar applicationFeeAmount o platformFeePercent"},
                400,
            )

        stripe_client = _get_stripe_client()
        payment_intent = stripe_client.PaymentIntent.create(
            amount=int(amount),
            currency=currency,
            automatic_payment_methods={"enabled": True},
            application_fee_amount=int(calculated_fee),
            transfer_data={
                "destination": vendor_account["account_id"],
            },
            metadata={
                "vendor_id": vendor_id,
                **metadata,
            },
        )

        return jsonify(
            {
                "success": True,
                "paymentIntentId": payment_intent.id,
                "clientSecret": payment_intent.client_secret,
                "chargesEnabled": account.charges_enabled,
                "payoutsEnabled": account.payouts_enabled,
            }
        )

    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    except StripeError as exc:
        current_app.logger.error("Stripe error creando PaymentIntent: %s", exc, exc_info=True)
        return jsonify({"error": str(exc)}), 400
    except Exception as exc:
        current_app.logger.exception("Error inesperado creando PaymentIntent.")
        return jsonify({"error": f"No fue posible crear el PaymentIntent: {exc}"}), 500


def _create_account_link(stripe_client, account_id, account=None):
    """
    Genera un enlace (onboarding/update) para que el vendedor complete o edite su información en Stripe.
    """
    if account is None:
        account = stripe_client.Account.retrieve(account_id)

    refresh_url, return_url = _get_onboarding_urls()

    link_type = _resolve_account_link_type(account)

    try:
        return _generate_account_link(stripe_client, account_id, link_type, refresh_url, return_url)
    except InvalidRequestError:
        if link_type == "account_onboarding":
            # Si el onboarding ya está completo, intentar con account_update
            return _generate_account_link(stripe_client, account_id, "account_update", refresh_url, return_url)
        raise


def _generate_account_link(stripe_client, account_id, link_type, refresh_url, return_url):
    link = stripe_client.AccountLink.create(
        account=account_id,
        refresh_url=refresh_url,
        return_url=return_url,
        type=link_type,
    )
    return link.url


def _resolve_account_link_type(account):
    """
    Determina qué tipo de AccountLink generar según el estado del vendedor.
    """
    if not account.details_submitted or not account.charges_enabled or not account.payouts_enabled:
        return "account_onboarding"
    return "account_update"


def _get_onboarding_urls():
    refresh_url = current_app.config.get("STRIPE_ONBOARDING_REFRESH_URL")
    return_url = current_app.config.get("STRIPE_ONBOARDING_RETURN_URL")

    if not refresh_url or not return_url:
        base = request.host_url.rstrip("/")
        refresh_url = refresh_url or f"{base}{url_for('vendedor.panel_vendedor')}"
        return_url = return_url or f"{base}{url_for('vendedor.panel_vendedor')}"

    return refresh_url, return_url

