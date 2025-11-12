(() => {
    const body = document.body;
    const card = document.getElementById("stripe-connect-card");
    if (!card || !body) {
        return;
    }

    const vendorId = body.dataset.vendorId || "";
    const vendorEmail = body.dataset.vendorEmail || "";
    console.log("Stripe Connect: dataset inicial", {
        vendorId,
        vendorEmail,
    });

    const statusPill = document.getElementById("stripe-status-pill");
    const statusGrid = document.getElementById("stripe-status-grid");
    const calloutsContainer = document.getElementById("stripe-callouts");
    const onboardingBtn = document.getElementById("stripe-onboarding-btn");
    const refreshBtn = document.getElementById("stripe-refresh-btn");
    const lastUpdateLabel = document.getElementById("stripe-last-update");

    let resolvedVendorId = vendorId || localStorage.getItem("firebase_uid") || sessionStorage.getItem("firebase_uid");
    let resolvedVendorEmail = vendorEmail || localStorage.getItem("firebase_email") || sessionStorage.getItem("firebase_email");

    if (resolvedVendorId) {
        body.dataset.vendorId = resolvedVendorId;
    }
    if (resolvedVendorEmail) {
        body.dataset.vendorEmail = resolvedVendorEmail;
    }

    if (!resolvedVendorId || !resolvedVendorEmail) {
        console.warn(
            "Stripe Connect: datos de vendedor no disponibles.",
            { dataset: { vendorId: body.dataset.vendorId, vendorEmail: body.dataset.vendorEmail } }
        );
        setCardDisabled("No se pudo identificar al vendedor. Inicia sesión nuevamente.");
        return;
    }

    const vendorIdFinal = resolvedVendorId;
    const vendorEmailFinal = resolvedVendorEmail;

    onboardingBtn?.addEventListener("click", async (event) => {
        console.log("Stripe Connect: click en onboarding", {
            vendorId: body.dataset.vendorId,
            vendorEmail: body.dataset.vendorEmail,
        });
        await handleOnboarding();
    });

    refreshBtn?.addEventListener("click", async () => {
        console.log("Stripe Connect: actualización manual solicitada.");
        await loadStatus();
    });

    (async () => {
        const cachedStatus = readCachedStatus(vendorIdFinal);
        if (cachedStatus) {
            console.log("Stripe Connect: usando estado en caché.");
            try {
                renderStatus(cachedStatus);
            } catch (err) {
                console.warn("Stripe Connect: no se pudo renderizar estado en caché:", err);
            }
        }
        await loadStatus(false);
    })();

    window.addEventListener("focus", () => {
        if (!document.hidden) {
            console.log("Stripe Connect: foco recuperado, refrescando estado.");
            loadStatus(true);
        }
    });

    async function handleOnboarding() {
        if (!onboardingBtn) {
            return;
        }

        const storedUrl = onboardingBtn.dataset.onboardingUrl || "";

        // Si ya tenemos un enlace válido, úsalo sin llamar al backend.
        if (storedUrl) {
            abrirEnlaceStripe(storedUrl);
            return;
        }

        let stripeWindow = null;
        let popupBlocked = false;
        try {
            stripeWindow = window.open("", "_blank", "noopener");
            if (!stripeWindow) {
                popupBlocked = true;
            } else {
                const doc = stripeWindow.document;
                doc.open();
                doc.write("<p style='font-family:Arial;margin:24px;'>Redirigiendo al asistente de Stripe...</p>");
                doc.close();
            }
        } catch (err) {
            popupBlocked = true;
            console.warn("No se pudo crear la pestaña previa para Stripe:", err);
        }
        console.log("🔄 Solicitando enlace de onboarding a /vendors/create-account…");

        setButtonLoading(onboardingBtn, true);
        hideCallouts();

        try {
            console.log("Stripe Connect: solicitando enlace de onboarding…", {
                vendorId: vendorIdFinal,
                vendorEmail: vendorEmailFinal,
            });
            const response = await fetch("/vendors/create-account", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "same-origin",
                body: JSON.stringify({
                    vendorId: vendorIdFinal,
                    email: vendorEmailFinal || undefined,
                }),
            });

            const data = await response.json();
            console.log("Stripe Connect: respuesta de onboarding", data);
            if (data.account) {
                console.log("Stripe Connect: estado reportado por Stripe", {
                    accountId: data.account.id || data.stripeAccountId,
                    charges_enabled: data.account.charges_enabled,
                    payouts_enabled: data.account.payouts_enabled,
                    details_submitted: data.account.details_submitted,
                });
            }
            if (!response.ok || data.success === false) {
                const err = new Error(data.error || "No fue posible iniciar el onboarding con Stripe.");
                if (data.code) err.code = data.code;
                err.payload = data;
                throw err;
            }

            const onboardingUrl =
                data.onboardingUrl || (data.account && data.account.onboardingUrl) || storedUrl;
            if (!onboardingUrl) {
                throw new Error("Stripe no devolvió un enlace de onboarding válido.");
            }

            const accountStatus = data.account || {};
            const alreadyCompleted =
                Boolean(data.alreadyCompleted) ||
                Boolean(
                    (accountStatus.charges_enabled && accountStatus.payouts_enabled && accountStatus.details_submitted) ||
                        accountStatus.alreadyCompleted
                );

            onboardingBtn.dataset.onboardingUrl = onboardingUrl;

            if (alreadyCompleted) {
                console.log("Stripe Connect: cuenta ya está completa, actualizando estado sin redirigir.");
                showCallout("success", "Tu cuenta de Stripe ya está activa.");
                await loadStatus();
                return;
            }

            // Forzar redirección en la misma pestaña para evitar bloqueos de pop-up
            window.location.href = onboardingUrl;

            console.log("✅ Enlace de onboarding recibido:", onboardingUrl);
            showCallout("info", "Te redirigimos al asistente de Stripe para completar tu registro.");
            await loadStatus();
        } catch (error) {
            console.error("❌ Error al generar enlace de onboarding:", error);
            if (stripeWindow && !error.code) {
                try {
                    stripeWindow.close();
                } catch (_) {}
            }

            if (error.code === "stripe_account_already_configured") {
                showCallout("error", error.message || "Este correo ya completó su configuración de cobros.");
                return;
            }

            if (storedUrl) {
                showCallout("warning", "Hubo un problema al generar un nuevo enlace, usando el último enlace disponible.");
                abrirEnlaceStripe(storedUrl);
            } else {
                showCallout("error", error.message || "No se pudo abrir el asistente de Stripe. Intenta de nuevo.");
            }
        } finally {
            setButtonLoading(onboardingBtn, false);
        }
    }

    async function loadStatus(refresh = true) {
        if (refresh) {
            removeCachedStatus(vendorIdFinal);
        }

        if (refresh) {
        setLoadingState(true);
        }
        hideCallouts();
        try {
            const statusUrl = new URL(`/vendors/status/${encodeURIComponent(vendorId)}`, window.location.origin);
            if (vendorEmailFinal) {
                statusUrl.searchParams.set("email", vendorEmailFinal);
            }
            const response = await fetch(statusUrl.toString(), {
                credentials: "same-origin",
            });
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "No se pudo consultar el estado de Stripe.");
            }

            renderStatus(data);
            cacheStatus(vendorIdFinal, data);
        } catch (error) {
            showCallout("error", error.message);
            setStatusPill("Error", "error");
        } finally {
            setLoadingState(false);
        }
    }

    function renderStatus(payload) {
        if (payload.pending) {
            setStatusPill("Pendiente", "warning");
            resetStatusItems();
            lastUpdateLabel.textContent = "Aún no conectas tu cuenta de Stripe.";
            onboardingBtn?.setAttribute("aria-label", "Iniciar configuración de Stripe");
            return;
        }

        const status = payload.status || {};
        const chargesEnabled = Boolean(status.charges_enabled);
        const payoutsEnabled = Boolean(status.payouts_enabled);
        const detailsSubmitted = Boolean(status.details_submitted);
        const requirementsDue = status.requirements_due || [];

        updateStatusItem("charges", chargesEnabled);
        updateStatusItem("payouts", payoutsEnabled);
        updateStatusItem("details", detailsSubmitted);

        if (chargesEnabled && payoutsEnabled && detailsSubmitted) {
            setStatusPill("Activo", "success");
            onboardingBtn?.classList.remove("disabled");
            onboardingBtn?.removeAttribute("disabled");
            onboardingBtn?.setAttribute("aria-disabled", "false");
            if (onboardingBtn) {
                onboardingBtn.textContent = "Actualizar datos en Stripe";
            }
            hideCallouts();
        } else {
            setStatusPill("Acción requerida", "warning");
            onboardingBtn?.removeAttribute("disabled");
            onboardingBtn?.classList.remove("disabled");
            if (onboardingBtn) {
                onboardingBtn.textContent = "Completar configuración de cobros";
            }
            onboardingBtn?.setAttribute("aria-disabled", "false");
        }

        if (requirementsDue.length > 0) {
            const list = requirementsDue.map((item) => `<li>${formatRequirement(item)}</li>`).join("");
            showCallout(
                "warning",
                `Stripe requiere información adicional:<ul>${list}</ul>`
            );
        } else if (!detailsSubmitted) {
            showCallout("info", "Completa la verificación para activar cobros y transferencias.");
        }

        if (onboardingBtn) {
            if (status.onboardingUrl) {
                onboardingBtn.dataset.onboardingUrl = status.onboardingUrl;
            } else {
                delete onboardingBtn.dataset.onboardingUrl;
            }
        }

        if (lastUpdateLabel) {
            const lastChecked = status.last_checked ? formatDate(status.last_checked) : null;
            lastUpdateLabel.textContent = lastChecked
                ? `Última sincronización: ${lastChecked}`
                : "";
        }
    }

    function resetStatusItems() {
        ["charges", "payouts", "details"].forEach((key) => updateStatusItem(key, false));
    }

    function updateStatusItem(key, enabled) {
        if (!statusGrid) return;
        const item = statusGrid.querySelector(`[data-status="${key}"]`);
        if (!item) return;
        item.classList.toggle("active", enabled);
        item.classList.toggle("pending", !enabled);

        const icon = item.querySelector(".icon i");
        if (icon) {
            icon.className = `fas ${enabled ? "fa-circle-check" : "fa-circle-xmark"}`;
        }
    }

    function setStatusPill(text, variant) {
        if (!statusPill) return;
        statusPill.textContent = text;
        statusPill.className = "stripe-status-pill";
        statusPill.classList.add(variant);
    }

    function setLoadingState(isLoading) {
        card.classList.toggle("loading", isLoading);
        if (isLoading && statusGrid) {
            statusGrid.setAttribute("aria-busy", "true");
        } else {
            statusGrid?.removeAttribute("aria-busy");
        }
        if (isLoading && onboardingBtn) {
            onboardingBtn.setAttribute("disabled", "true");
        } else if (!isLoading && onboardingBtn && !onboardingBtn.classList.contains("disabled")) {
            onboardingBtn.removeAttribute("disabled");
        }
        if (isLoading) {
            refreshBtn?.setAttribute("disabled", "true");
        } else {
            refreshBtn?.removeAttribute("disabled");
        }
    }

    function setButtonLoading(button, loading) {
        if (!button) return;
        if (loading) {
            button.setAttribute("disabled", "true");
            button.classList.add("is-loading");
            button.dataset.originalLabel = button.textContent || "";
            button.innerHTML = `<span class="spinner"></span> Procesando...`;
        } else {
            button.classList.remove("is-loading");
            if (!button.classList.contains("disabled")) {
                button.removeAttribute("disabled");
            }
            const original = button.dataset.originalLabel || "Completar configuración de cobros";
            button.textContent = original;
            delete button.dataset.originalLabel;
        }
    }

    function showCallout(type, message) {
        if (!calloutsContainer) return;
        calloutsContainer.innerHTML = `
            <div class="stripe-callout ${type}">
                <div class="icon">
                    <i class="fas ${type === "success" ? "fa-circle-check" : type === "error" ? "fa-circle-exclamation" : "fa-circle-info"}"></i>
                </div>
                <div class="content">${message}</div>
            </div>
        `;
    }

    function cacheStatus(vendorId, payload) {
        try {
            const entry = {
                vendorId,
                payload,
                updatedAt: Date.now(),
            };
            localStorage.setItem(`stripe_status_${vendorId}`, JSON.stringify(entry));
            sessionStorage.setItem(`stripe_status_${vendorId}`, JSON.stringify(entry));
        } catch (error) {
            console.warn("Stripe Connect: no se pudo guardar caché de estado:", error);
        }
    }

    function readCachedStatus(vendorId) {
        const key = `stripe_status_${vendorId}`;
        const raw =
            sessionStorage.getItem(key) ||
            localStorage.getItem(key);
        if (!raw) {
            return null;
        }

        try {
            const parsed = JSON.parse(raw);
            if (!parsed || !parsed.payload) {
                return null;
            }

            return parsed.payload;
        } catch (error) {
            console.warn("Stripe Connect: no se pudo leer caché de estado:", error);
            return null;
        }
    }

    function removeCachedStatus(vendorId) {
        const key = `stripe_status_${vendorId}`;
        try {
            localStorage.removeItem(key);
        } catch (error) {
            console.warn("Stripe Connect: no se pudo limpiar caché local:", error);
        }
        try {
            sessionStorage.removeItem(key);
        } catch (error) {
            console.warn("Stripe Connect: no se pudo limpiar caché de sesión:", error);
        }
    }

    function hideCallouts() {
        if (calloutsContainer) {
            calloutsContainer.innerHTML = "";
        }
    }

    function setCardDisabled(message) {
        setStatusPill("Sin sesión", "error");
        if (onboardingBtn) {
            onboardingBtn.setAttribute("disabled", "true");
            onboardingBtn.classList.add("disabled");
        }
        showCallout("error", message);
    }

    function formatRequirement(key) {
        return key.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
    }

    function formatDate(value) {
        try {
            const date = new Date(value);
            return date.toLocaleString("es-MX", {
                day: "2-digit",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
            });
        } catch {
            return value;
        }
    }

    function abrirEnlaceStripe(url) {
        try {
            const nuevaPestana = window.open(url, "_blank", "noopener");
            if (!nuevaPestana) {
                // Bloqueado por el navegador, abrir en la misma pestaña como último recurso.
                window.location.href = url;
            }
        } catch (err) {
            console.error("No se pudo abrir el enlace de Stripe:", err);
            window.location.href = url;
        }
    }

    if (typeof window.iniciarStripeConnectOnboarding !== "function") {
        window.iniciarStripeConnectOnboarding = async () => {
            await handleOnboarding();
        };
    }

    window.StripeConnectPanel = {
        openOnboarding: () => handleOnboarding(),
        refreshStatus: () => loadStatus(),
    };
})();

