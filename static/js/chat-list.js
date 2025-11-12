(() => {
    const body = document.body;
    const chatListEl = document.getElementById("chatList");
    const emptyStateEl = document.getElementById("chatEmptyState");
    const loadingEl = document.getElementById("chatLoading");

    if (!chatListEl || !body) {
        return;
    }

    const chatBaseUrl = body.dataset.chatBaseUrl || "/comprador/chats/";
    const partnerNameParam = body.dataset.partnerNameParam || "vendedor";
    const partnerIdParam = body.dataset.partnerIdParam || "vendedor_id";
    const defaultEmptyMessage =
        body.dataset.emptyMessage || "No tienes conversaciones aún.";
    const defaultPreview = "No hay mensajes todavía.";

    let auth = null;
    let db = null;
    let unsubscribeHandlers = [];
    const chatsMap = new Map();
    const lastMessageCache = new Map();

    window.addEventListener("chat-last-message-update", (event) => {
        const { chatId, texto } = event.detail || {};
        if (!chatId) return;
        lastMessageCache.set(chatId, texto || "");
        const enlace = chatListEl.querySelector(`[data-chat-id="${chatId}"]`);
        if (enlace) {
            const previewEl = enlace.querySelector(".chat-preview");
            if (previewEl && texto) {
                previewEl.textContent = texto;
            }
        }
    });

    const firebaseReady = initializeFirebase();

    firebaseReady
        .then(() => {
            if (!auth) {
                throw new Error("Firebase Auth no está disponible.");
            }
            auth.onAuthStateChanged((user) => {
                if (!user) {
                    limpiarSuscripciones();
                    mostrarEmptyState("Debes iniciar sesión para ver tus chats.");
                    return;
                }
                suscribirseAChats(user.uid);
            });
        })
        .catch((error) => {
            console.error("❌ Error inicializando Firebase en chats:", error);
            mostrarEmptyState("No fue posible cargar tus chats en este momento.");
        });

    window.addEventListener("beforeunload", () => {
        limpiarSuscripciones();
    });

    async function initializeFirebase() {
        if (typeof firebase === "undefined") {
            throw new Error("Firebase SDK no está disponible en la página de chats.");
        }

        if (firebase.apps.length === 0) {
            if (!window.firebaseConfig) {
                throw new Error("No se encontró la configuración de Firebase.");
            }
            firebase.initializeApp(window.firebaseConfig);
        }

        auth = firebase.auth();
        db = firebase.firestore();

        db.settings({
            cacheSizeBytes: firebase.firestore.CACHE_SIZE_UNLIMITED,
            ignoreUndefinedProperties: true,
        });
    }

    function limpiarSuscripciones() {
        if (Array.isArray(unsubscribeHandlers)) {
            unsubscribeHandlers.forEach((fn) => {
                if (typeof fn === "function") {
                    fn();
                }
            });
        }
        unsubscribeHandlers = [];
        chatsMap.clear();
        lastMessageCache.clear();
    }

    function suscribirseAChats(uid) {
        limpiarSuscripciones();
        mostrarLoading(true);

        try {
            const chatsRef = db.collection("chats");

            const queries = [
                chatsRef.where("participants", "array-contains", uid),
                chatsRef.where("comprador_id", "==", uid),
                chatsRef.where("vendedor_id", "==", uid),
            ];

            queries.forEach((query) => agregarSuscripcion(query, uid));
        } catch (error) {
            console.error("❌ Error configurando suscripción a chats:", error);
            mostrarEmptyState("No fue posible cargar tus chats.");
        }
    }

    function agregarSuscripcion(query, uid) {
        const unsubscribe = query.onSnapshot(
            (snapshot) => {
                snapshot.docChanges().forEach((change) => {
                    const data = {
                        id: change.doc.id,
                        ...change.doc.data(),
                    };

                    if (change.type === "removed") {
                        chatsMap.delete(change.doc.id);
                        lastMessageCache.delete(change.doc.id);
                        return;
                    }

                    chatsMap.set(change.doc.id, data);

                    const preview = obtenerPreview(data);
                    if (preview && preview !== defaultPreview) {
                        lastMessageCache.set(change.doc.id, preview);
                    } else {
                        actualizarPreviewDesdeMensajes(change.doc.id);
                    }
                });

                const chats = Array.from(chatsMap.values());
                chats.sort((a, b) => {
                    const fechaA = obtenerFecha(a);
                    const fechaB = obtenerFecha(b);
                    return fechaB - fechaA;
                });

                renderChats(uid, chats);
            },
            (error) => {
                console.error("❌ Error escuchando chats:", error);
                mostrarEmptyState("Ocurrió un error al cargar tus chats.");
            }
        );

        unsubscribeHandlers.push(unsubscribe);
    }

    function actualizarPreviewDesdeMensajes(chatId) {
        if (!db || !chatId) {
            return;
        }

        db.collection("chats")
            .doc(chatId)
            .collection("messages")
            .orderBy("created_at", "desc")
            .limit(1)
            .get()
            .then((snapshot) => {
                const mensaje = snapshot.docs[0]?.data() || {};
                const texto =
                    (mensaje.message ||
                        mensaje.texto ||
                        mensaje.text ||
                        mensaje.body ||
                        mensaje.content ||
                        "")
                        .toString()
                        .trim();
                if (texto) {
                    lastMessageCache.set(chatId, texto);
                }
            })
            .catch((error) => {
                console.warn("No se pudo actualizar el preview desde mensajes", chatId, error);
            });
    }

    function obtenerFecha(chat) {
        const fecha =
            chat.last_message_at ||
            chat.lastMessageAt ||
            chat.updated_at ||
            chat.updatedAt ||
            chat.created_at ||
            chat.createdAt ||
            null;
        if (fecha && typeof fecha.toDate === "function") {
            return fecha.toDate().getTime();
        }
        if (fecha && typeof fecha.seconds === "number") {
            return fecha.seconds * 1000;
        }
        if (typeof fecha === "string") {
            return new Date(fecha).getTime();
        }
        if (typeof fecha === "number") {
            return fecha;
        }
        return 0;
    }

    function renderChats(currentUserId, chats) {
        chatListEl.innerHTML = "";

        if (!chats.length) {
            mostrarEmptyState();
            return;
        }

        mostrarEmptyState(false);

        const fragment = document.createDocumentFragment();

        chats.forEach((chat) => {
            const partner = obtenerOtroParticipante(chat, currentUserId);
            const nombre = partner.nombre || "Contacto";
            const iniciales = generarIniciales(nombre);
            const pedidoId = obtenerPedidoId(chat);
            const pedidoEtiqueta = obtenerEtiquetaPedido(chat, pedidoId);
            const partnerId = partner.id || "";
            let previewText = obtenerPreview(chat);
            const fecha = obtenerFecha(chat);

            const enlace = document.createElement("a");
            enlace.className = "chat-item";
            enlace.href = crearEnlaceConversacion(pedidoId, nombre, partnerId);
            enlace.dataset.chatId = chat.id || "";

            const avatar = document.createElement("div");
            avatar.className = "chat-avatar";
            avatar.textContent = iniciales;

            const info = document.createElement("div");
            info.className = "chat-info";

            const header = document.createElement("div");
            header.className = "chat-info-header";

            const titulo = document.createElement("h3");
            titulo.textContent = nombre;

            const time = document.createElement("span");
            time.className = "chat-time";
            time.textContent = fecha ? formatearFechaRelativa(fecha) : "Sin fecha";

            header.appendChild(titulo);
            header.appendChild(time);

            const previewEl = document.createElement("p");
            previewEl.className = "chat-preview";

            if (chat.id && lastMessageCache.has(chat.id)) {
                previewText = lastMessageCache.get(chat.id) || previewText;
            } else if (!previewText || previewText === defaultPreview) {
                previewText = defaultPreview;
                if (chat.id) {
                    completarPreviewDesdeMensajes(chat.id, previewEl);
                }
            }

            previewEl.textContent = previewText;

            const tag = document.createElement("span");
            tag.className = "chat-tag";
            tag.textContent = pedidoEtiqueta;

            info.appendChild(header);
            info.appendChild(previewEl);
            info.appendChild(tag);

            const tieneNuevosMensajes = partner.unread > 0;

            if (tieneNuevosMensajes) {
                enlace.classList.add("chat-item-unread");

                const badge = document.createElement("span");
                badge.className = "chat-unread-badge";
                badge.textContent = partner.unread > 99 ? "99+" : partner.unread;
                header.appendChild(badge);

                const indicador = document.createElement("span");
                indicador.className = "chat-new-indicator";
                indicador.textContent = "Nuevo mensaje";
                info.appendChild(indicador);
            } else if (partner.unread === 0 && enlace.classList.contains("chat-item-unread")) {
                enlace.classList.remove("chat-item-unread");
            }

            enlace.appendChild(avatar);
            enlace.appendChild(info);

            fragment.appendChild(enlace);
        });

        chatListEl.appendChild(fragment);
        mostrarLoading(false);
    }

    function completarPreviewDesdeMensajes(chatId, previewEl) {
        if (!db) return;

        if (lastMessageCache.has(chatId)) {
            const cached = lastMessageCache.get(chatId);
            if (cached) {
                previewEl.textContent = cached;
            }
            return;
        }

        db.collection("chats")
            .doc(chatId)
            .collection("messages")
            .orderBy("created_at", "desc")
            .limit(1)
            .get()
            .then((snapshot) => {
                const mensaje = snapshot.docs[0]?.data() || {};
                const texto =
                    (mensaje.message ||
                        mensaje.texto ||
                        mensaje.text ||
                        mensaje.body ||
                        mensaje.content ||
                        "")
                        .toString()
                        .trim() || defaultPreview;
                lastMessageCache.set(chatId, texto);
                previewEl.textContent = texto;
            })
            .catch((error) => {
                console.warn("No se pudo obtener el último mensaje del chat", chatId, error);
            });
    }

    function obtenerPedidoId(chat) {
        return (
            chat.pedido_id ||
            chat.metadata?.orderId ||
            chat.metadata?.pedidoId ||
            chat.order_id ||
            chat.id ||
            "pedido"
        );
    }

    function obtenerEtiquetaPedido(chat, pedidoId) {
        if (chat.pedido_folio) {
            return chat.pedido_folio;
        }
        if (chat.metadata?.orderFolio) {
            return chat.metadata.orderFolio;
        }
        const folio = pedidoId.toString().toUpperCase();
        if (!folio || folio === "PEDIDO") {
            return `Chat #${(chat.id || "").substring(0, 8).toUpperCase()}`;
        }
        return `Pedido #${folio.substring(0, 8)}`;
    }

    function obtenerPreview(chat) {
        const texto =
            chat.last_message ||
            chat.lastMessage ||
            chat.last_message_text ||
            chat.lastMessageText ||
            chat.ultimo_mensaje ||
            chat.preview ||
            chat.lastMessage?.text ||
            chat.last_message?.text ||
            "";
        return (texto || "").toString().trim();
    }

    function obtenerOtroParticipante(chat, currentUserId) {
        if (chat.participantsData) {
            for (const [id, datos] of Object.entries(chat.participantsData)) {
                if (id !== currentUserId) {
                    return {
                        id,
                        nombre:
                            datos.nombre ||
                            datos.nombre_tienda ||
                            datos.email?.split("@")[0] ||
                            "Contacto",
                        unread:
                            chat.unreadCounts && typeof chat.unreadCounts[id] === "number"
                                ? chat.unreadCounts[id]
                                : 0,
                    };
                }
            }
        }

        if (chat.comprador_id && chat.comprador_id !== currentUserId) {
            return {
                id: chat.comprador_id,
                nombre: chat.comprador_nombre,
                unread: chat.unreadCounts?.[chat.comprador_id] || 0,
            };
        }
        if (chat.vendedor_id && chat.vendedor_id !== currentUserId) {
            return {
                id: chat.vendedor_id,
                nombre: chat.vendedor_nombre,
                unread: chat.unreadCounts?.[chat.vendedor_id] || 0,
            };
        }

        const participantes = Array.isArray(chat.participants) ? chat.participants : [];
        const otherId = participantes.find((id) => id !== currentUserId) || "";

        return {
            id: otherId,
            nombre: chat[`perfil_${otherId}`] || chat.nombre_vendedor || "",
            unread: chat.unreadCounts?.[otherId] || 0,
        };
    }

    function generarIniciales(nombre) {
        if (!nombre) {
            return "AG";
        }
        return nombre
            .trim()
            .split(/\s+/)
            .slice(0, 2)
            .map((parte) => parte.charAt(0).toUpperCase())
            .join("") || "AG";
    }

    function crearEnlaceConversacion(pedidoId, partnerName, partnerId) {
        const params = new URLSearchParams();
        params.set(partnerNameParam, partnerName);
        if (partnerId) {
            params.set(partnerIdParam, partnerId);
        }
        return `${chatBaseUrl}${encodeURIComponent(pedidoId)}?${params.toString()}`;
    }

    function formatearFechaRelativa(timestampMs) {
        const ahora = Date.now();
        const diff = ahora - timestampMs;

        if (Number.isNaN(diff)) {
            return "";
        }

        const minutos = Math.floor(diff / 60000);
        if (minutos < 1) return "Hace un momento";
        if (minutos < 60) return `Hace ${minutos} min`;

        const horas = Math.floor(minutos / 60);
        if (horas < 24) return `Hace ${horas} h`;

        const fecha = new Date(timestampMs);
        return fecha.toLocaleDateString("es-MX", {
            year: "numeric",
            month: "short",
            day: "numeric",
        });
    }

    function mostrarLoading(estado) {
        if (loadingEl) {
            loadingEl.style.display = estado ? "flex" : "none";
        }
    }

    function mostrarEmptyState(mensaje) {
        if (!emptyStateEl) {
            return;
        }

        if (mensaje === false) {
            emptyStateEl.style.display = "none";
            return;
        }

        if (loadingEl) {
            loadingEl.style.display = "none";
        }

        const texto = mensaje || defaultEmptyMessage;
        const paragraph = emptyStateEl.querySelector("p");
        if (paragraph) {
            paragraph.textContent = texto;
        } else {
            const p = document.createElement("p");
            p.textContent = texto;
            emptyStateEl.appendChild(p);
        }

        emptyStateEl.style.display = "flex";
    }
})();

