(() => {
    const body = document.body;
    const chatMessagesEl = document.getElementById("chatMessages");
    const chatMessagesLoadingEl = document.getElementById("chatMessagesLoading");
    const chatInputEl = document.getElementById("chatInput");
    const chatSendBtn = document.getElementById("chatSendBtn");
    const chatListAvatar = document.getElementById("chatListAvatar");
    const chatListVendorName = document.getElementById("chatListVendorName");
    const chatListMeta = document.getElementById("chatListMeta");
    const chatListPreview = document.getElementById("chatListPreview");
    const chatPartnerAvatar = document.getElementById("chatPartnerAvatar");
    const chatPartnerName = document.getElementById("chatPartnerName");
    const chatOrderLabel = document.getElementById("chatOrderLabel");
    const chatOrderLink = document.getElementById("chatOrderLink");

    const dataset = body?.dataset || {};
    const chatRole = dataset.chatRole || "comprador";
    const partnerRole = dataset.partnerRole || (chatRole === "comprador" ? "vendedor" : "comprador");
    const orderLinkBase =
        dataset.orderLinkBase ||
        (chatRole === "comprador"
            ? "/comprador/detalle_pedido/"
            : "/vendedor/ventas?pedido=");

    if (!body || !chatMessagesEl || !chatInputEl || !chatSendBtn) {
        return;
    }

    let auth = null;
    let db = null;

    let currentUser = null;
    let chatDocId = null;
    let chatRef = null;
    let messagesUnsubscribe = null;
    let chatSnapshotUnsubscribe = null;

    const firebaseReady = initializeFirebase();

    firebaseReady
        .then(() => {
            if (!auth) {
                throw new Error("Firebase Auth no está disponible.");
            }
            auth.onAuthStateChanged(async (user) => {
                if (!user) {
                    window.location.href = "/auth/login";
                    return;
                }

                currentUser = user;
                await prepararChat();
                configurarEventos();
            });
        })
        .catch((error) => {
            console.error("❌ Error inicializando Firebase en chat:", error);
            mostrarError("No fue posible cargar el chat. Intenta nuevamente más tarde.");
        });

    window.addEventListener("beforeunload", () => {
        if (typeof messagesUnsubscribe === "function") {
            messagesUnsubscribe();
        }
        if (typeof chatSnapshotUnsubscribe === "function") {
            chatSnapshotUnsubscribe();
        }
    });

    async function initializeFirebase() {
        if (typeof firebase === "undefined") {
            throw new Error("Firebase SDK no está disponible en la página de chat.");
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

    async function prepararChat() {
        const pedidoId = dataset.pedidoId || dataset.chatId || "pedido";

        const currentUserId = currentUser.uid;
        const currentUserName = dataset.userName || currentUser.displayName || "Usuario";

        let partnerId =
            dataset.partnerId ||
            dataset.vendedorId ||
            dataset.compradorId ||
            "";
        let partnerName =
            dataset.partnerName ||
            dataset.vendedorName ||
            dataset.compradorName ||
            (partnerRole === "vendedor" ? "Vendedor" : "Cliente");

        // Si hay un vendedor_id específico, usarlo para buscar el chat correcto
        const vendedorIdEspecifico = partnerId && chatRole === "comprador" ? partnerId : null;
        const existingChat = await buscarChatExistente(pedidoId, currentUserId, vendedorIdEspecifico);

        if (existingChat) {
            chatDocId = existingChat.id;
            chatRef = existingChat.ref;
            const data = existingChat.data;

            const dataCompradorId =
                data.comprador_id ||
                (chatRole === "comprador" ? currentUserId : partnerId);
            const dataCompradorNombre =
                data.comprador_nombre ||
                (chatRole === "comprador" ? currentUserName : partnerName);
            const dataVendedorId =
                data.vendedor_id ||
                (chatRole === "comprador" ? partnerId : currentUserId);
            const dataVendedorNombre =
                data.vendedor_nombre ||
                (chatRole === "comprador" ? partnerName : currentUserName);

            partnerId =
                chatRole === "comprador"
                    ? data.vendedor_id || partnerId
                    : data.comprador_id || partnerId;
            partnerName =
                chatRole === "comprador"
                    ? data.vendedor_nombre || partnerName
                    : data.comprador_nombre || partnerName;

            if (!partnerId || !partnerName) {
                const partner = obtenerParticipanteDesdeDatos(data, currentUserId);
                partnerId = partner.id || partnerId;
                partnerName = partner.nombre || partnerName;
            }

            dataset.partnerId = partnerId || "";
            dataset.partnerName =
                partnerName || (partnerRole === "vendedor" ? "Vendedor" : "Cliente");

            const updates = {};

            const participantsToAdd = [];

            if (!data.vendedor_id && dataVendedorId) {
                updates.vendedor_id = dataVendedorId;
            }
            if (!data.vendedor_nombre && dataVendedorNombre) {
                updates.vendedor_nombre = dataVendedorNombre;
            }
            if (!data.comprador_id && dataCompradorId) {
                updates.comprador_id = dataCompradorId;
            }
            if (!data.comprador_nombre && dataCompradorNombre) {
                updates.comprador_nombre = dataCompradorNombre;
            }
            if (!data.pedido_folio) {
                updates.pedido_folio = generarFolioPedido(pedidoId);
            }
            if (
                dataVendedorId &&
                (!Array.isArray(data.participants) ||
                    !data.participants.includes(dataVendedorId))
            ) {
                participantsToAdd.push(dataVendedorId);
            }
            if (
                dataCompradorId &&
                (!Array.isArray(data.participants) ||
                    !data.participants.includes(dataCompradorId))
            ) {
                participantsToAdd.push(dataCompradorId);
            }
            if (!data.participantsData) {
                updates.participantsData = {};
                if (dataCompradorId) {
                    updates.participantsData[dataCompradorId] = {
                        id: dataCompradorId,
                        nombre: dataCompradorNombre,
                        rol_activo: "comprador",
                    };
                }
                if (dataVendedorId) {
                    updates.participantsData[dataVendedorId] = {
                        id: dataVendedorId,
                        nombre: dataVendedorNombre,
                        rol_activo: "vendedor",
                    };
                }
            }
            if (!data.unreadCounts && dataCompradorId && dataVendedorId) {
                updates.unreadCounts = {
                    [dataCompradorId]: 0,
                    [dataVendedorId]: 0,
                };
            }
            if (participantsToAdd.length > 0) {
                updates.participants = firebase.firestore.FieldValue.arrayUnion(
                    ...participantsToAdd
                );
            }

            if (Object.keys(updates).length > 0) {
                await chatRef.set(updates, { merge: true });
                Object.assign(data, updates);
            }

            actualizarCabeceraChat(data);
        } else {
            if (!partnerId) {
                mostrarError("No se pudo iniciar el chat porque falta el participante.");
                chatSendBtn.disabled = true;
                return;
            }

            const compradorId = chatRole === "comprador" ? currentUserId : partnerId;
            const compradorNombre =
                chatRole === "comprador" ? currentUserName : partnerName;
            const vendedorId = chatRole === "comprador" ? partnerId : currentUserId;
            const vendedorNombre =
                chatRole === "comprador" ? partnerName : currentUserName;

            chatDocId = construirChatId(pedidoId, compradorId, vendedorId);
            chatRef = db.collection("chats").doc(chatDocId);

            const pedidoFolio = generarFolioPedido(pedidoId);

            const payload = {
                pedido_id: pedidoId,
                pedido_folio: pedidoFolio,
                metadata: {
                    orderId: pedidoId,
                },
                comprador_id: compradorId,
                comprador_nombre: compradorNombre,
                vendedor_id: vendedorId,
                vendedor_nombre: vendedorNombre,
                participants: [compradorId, vendedorId],
                participantsData: {
                    [compradorId]: {
                        id: compradorId,
                        nombre: compradorNombre,
                        rol_activo: "comprador",
                    },
                    [vendedorId]: {
                        id: vendedorId,
                        nombre: vendedorNombre,
                        rol_activo: "vendedor",
                    },
                },
                unreadCounts: {
                    [compradorId]: 0,
                    [vendedorId]: 0,
                },
                created_at: firebase.firestore.FieldValue.serverTimestamp(),
                updated_at: firebase.firestore.FieldValue.serverTimestamp(),
                last_message: "",
                last_message_at: firebase.firestore.FieldValue.serverTimestamp(),
            };

            await chatRef.set(payload, { merge: true });

            dataset.partnerId = partnerId;
            dataset.partnerName = partnerName;

            actualizarCabeceraChat(payload);
        }

        suscribirseAChatMetadata();
        suscribirseAMensajes();
    }

    function construirChatId(pedidoId, compradorId, vendedorId) {
        const safePedido = (pedidoId || "pedido").replace(/[^\w\-]+/g, "-");
        const safeComprador = (compradorId || "comprador").replace(/[^\w\-]+/g, "-");
        const safeVendedor = (vendedorId || "vendedor").replace(/[^\w\-]+/g, "-");
        return `${safePedido}_${safeComprador}_${safeVendedor}`;
    }

    async function buscarChatExistente(pedidoId, userId, vendedorIdEspecifico = null) {
        if (!pedidoId) {
            return null;
        }

        try {
            const candidatosMap = new Map();

            // Si hay un vendedor_id específico, buscar directamente por pedido_id y vendedor_id
            if (vendedorIdEspecifico) {
                let snapshot = await db
                    .collection("chats")
                    .where("metadata.orderId", "==", pedidoId)
                    .where("vendedor_id", "==", vendedorIdEspecifico)
                    .limit(5)
                    .get();
                snapshot.forEach((doc) => candidatosMap.set(doc.id, doc));

                if (candidatosMap.size === 0) {
                    snapshot = await db
                        .collection("chats")
                        .where("pedido_id", "==", pedidoId)
                        .where("vendedor_id", "==", vendedorIdEspecifico)
                        .limit(5)
                        .get();
                    snapshot.forEach((doc) => candidatosMap.set(doc.id, doc));
                }
            } else {
                // Búsqueda general sin filtro de vendedor
                let snapshot = await db
                    .collection("chats")
                    .where("metadata.orderId", "==", pedidoId)
                    .limit(10)
                    .get();
                snapshot.forEach((doc) => candidatosMap.set(doc.id, doc));

                if (candidatosMap.size === 0) {
                    snapshot = await db
                        .collection("chats")
                        .where("pedido_id", "==", pedidoId)
                        .limit(10)
                        .get();
                    snapshot.forEach((doc) => candidatosMap.set(doc.id, doc));
                }
            }

            const candidatos = Array.from(candidatosMap.values());
            if (candidatos.length === 0) {
                return null;
            }

            const candidatosOrdenados = candidatos.sort((a, b) => {
                const fechaA = obtenerTimestampChat(a.data());
                const fechaB = obtenerTimestampChat(b.data());
                return fechaB - fechaA;
            });

            const candidatosConUsuario = candidatosOrdenados.filter((doc) => {
                const data = doc.data();
                if (Array.isArray(data.participants) && data.participants.includes(userId)) {
                    return true;
                }
                if (
                    data.participantsData &&
                    Object.prototype.hasOwnProperty.call(data.participantsData, userId)
                ) {
                    return true;
                }
                return (
                    data.comprador_id === userId ||
                    data.vendedor_id === userId
                );
            });

            const seleccionado = (candidatosConUsuario[0] || candidatosOrdenados[0]);

            return {
                id: seleccionado.id,
                ref: seleccionado.ref,
                data: seleccionado.data(),
            };
        } catch (error) {
            console.warn("⚠️ No se pudo recuperar un chat existente:", error);
            return null;
        }
    }

    function obtenerTimestampChat(data = {}) {
        const fecha =
            data.last_message_at ||
            data.updated_at ||
            data.updatedAt ||
            data.created_at ||
            data.createdAt ||
            null;
        if (fecha && typeof fecha.toDate === "function") {
            return fecha.toDate().getTime();
        }
        if (fecha && typeof fecha.seconds === "number") {
            return fecha.seconds * 1000;
        }
        if (typeof fecha === "string") {
            const parsed = Date.parse(fecha);
            return Number.isNaN(parsed) ? 0 : parsed;
        }
        return 0;
    }

    function suscribirseAChatMetadata() {
        if (typeof chatSnapshotUnsubscribe === "function") {
            chatSnapshotUnsubscribe();
        }

        chatSnapshotUnsubscribe = chatRef.onSnapshot(
            (snapshot) => {
                if (!snapshot.exists) {
                    return;
                }
                const data = snapshot.data();
                actualizarCabeceraChat(data);
            },
            (error) => {
                console.error("❌ Error escuchando metadatos del chat:", error);
            }
        );
    }

    function actualizarCabeceraChat(chatData = {}) {
        const pedidoId =
            (chatData.metadata && chatData.metadata.orderId) ||
            chatData.pedido_id ||
            dataset.pedidoId ||
            dataset.chatId ||
            "pedido";
        const pedidoFolio =
            chatData.pedido_folio || generarFolioPedido(pedidoId);

        const partnerName =
            chatRole === "comprador"
                ? chatData.vendedor_nombre || dataset.partnerName || "Vendedor"
                : chatData.comprador_nombre || dataset.partnerName || "Cliente";
        const partnerId =
            chatRole === "comprador"
                ? chatData.vendedor_id || dataset.partnerId || ""
                : chatData.comprador_id || dataset.partnerId || "";

        dataset.partnerName = partnerName;
        dataset.partnerId = partnerId;

        const iniciales = generarIniciales(partnerName);

        if (chatListAvatar) chatListAvatar.textContent = iniciales;
        if (chatListVendorName) chatListVendorName.textContent = partnerName;
        if (chatListMeta) chatListMeta.textContent = `Pedido #${pedidoFolio}`;
        if (chatPartnerAvatar) chatPartnerAvatar.textContent = iniciales;
        if (chatPartnerName) chatPartnerName.textContent = partnerName;
        if (chatOrderLabel) chatOrderLabel.textContent = `Pedido #${pedidoFolio}`;
        if (chatOrderLink) {
            chatOrderLink.href = `${orderLinkBase}${encodeURIComponent(pedidoId)}`;
        }

        if (chatData.last_message && chatListPreview) {
            chatListPreview.textContent = chatData.last_message;
        } else if (chatData.lastMessage && chatListPreview) {
            chatListPreview.textContent = chatData.lastMessage;
        }
    }

    function suscribirseAMensajes() {
        if (typeof messagesUnsubscribe === "function") {
            messagesUnsubscribe();
        }

        try {
            const mensajesRef = chatRef.collection("messages");

            messagesUnsubscribe = mensajesRef.onSnapshot(
                (snapshot) => {
                    const mensajes = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
                    renderizarMensajes(mensajes);

                    if (chatRef && currentUser) {
                        chatRef
                            .set(
                                { [`unreadCounts.${currentUser.uid}`]: 0 },
                                { merge: true }
                            )
                            .catch((error) =>
                                console.warn("No se pudo actualizar unreadCounts:", error)
                            );
                    }
                },
                (error) => {
                    console.error("❌ Error escuchando mensajes:", error);
                    mostrarError("Error al cargar los mensajes.");
                }
            );
        } catch (error) {
            console.error("❌ Error configurando suscripción de mensajes:", error);
            mostrarError("No se pudieron cargar los mensajes.");
        }
    }

    function renderizarMensajes(mensajes) {
        if (chatMessagesLoadingEl) {
            chatMessagesLoadingEl.style.display = "none";
        }

        chatMessagesEl.innerHTML = "";

        if (!mensajes.length) {
            const placeholder = document.createElement("div");
            placeholder.className = "chat-empty-messages";
            placeholder.innerHTML = `
                <i class="fas fa-comments"></i>
                <p>Empieza la conversación con tu vendedor.</p>
            `;
            chatMessagesEl.appendChild(placeholder);
            if (chatListPreview) {
                chatListPreview.textContent = "Aún no hay mensajes";
            }
            actualizarCacheUltimoMensaje(chatDocId, "");
            return;
        }

        mensajes.sort((a, b) => obtenerFechaMensaje(a) - obtenerFechaMensaje(b));

        const fragment = document.createDocumentFragment();
        let ultimoDia = "";

        mensajes.forEach((mensaje) => {
            const fecha = obtenerFechaMensaje(mensaje);
            const diaEtiqueta = formatearFechaDia(fecha);

            if (diaEtiqueta !== ultimoDia) {
                const separator = document.createElement("div");
                separator.className = "chat-day-separator";
                separator.textContent = diaEtiqueta;
                fragment.appendChild(separator);
                ultimoDia = diaEtiqueta;
            }

            const senderIdMensaje =
                mensaje.sender_id ||
                mensaje.senderId ||
                mensaje.user_id ||
                mensaje.userId ||
                "";
            const esPropio = senderIdMensaje === currentUser.uid;
            const messageEl = document.createElement("div");
            messageEl.className = `chat-message ${esPropio ? "enviado" : "recibido"}`;

            const bubbleEl = document.createElement("div");
            bubbleEl.className = "chat-message-bubble";

            const textEl = document.createElement("p");
            textEl.textContent =
                mensaje.message ||
                mensaje.texto ||
                mensaje.text ||
                mensaje.body ||
                mensaje.content ||
                mensaje.mensaje ||
                "";

            const timeEl = document.createElement("span");
            timeEl.className = "chat-message-time";
            timeEl.textContent = fecha
                ? fecha.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })
                : "";

            bubbleEl.appendChild(textEl);
            bubbleEl.appendChild(timeEl);

            messageEl.appendChild(bubbleEl);
            fragment.appendChild(messageEl);
        });

        chatMessagesEl.appendChild(fragment);
        chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;

        const ultimoMensaje = mensajes[mensajes.length - 1] || {};
        const textoUltimoMensaje =
            ultimoMensaje.message ||
            ultimoMensaje.texto ||
            ultimoMensaje.text ||
            ultimoMensaje.body ||
            ultimoMensaje.content ||
            ultimoMensaje.mensaje ||
            "";
        if (chatListPreview && textoUltimoMensaje) {
            chatListPreview.textContent = textoUltimoMensaje;
        }
        actualizarCacheUltimoMensaje(chatDocId, textoUltimoMensaje);
    }

    function obtenerFechaMensaje(mensaje) {
        const fecha =
            mensaje.created_at ||
            mensaje.createdAt ||
            mensaje.fecha ||
            mensaje.timestamp ||
            mensaje.time ||
            null;
        if (!fecha) {
            return new Date(0);
        }
        if (typeof fecha.toDate === "function") {
            return fecha.toDate();
        }
        if (fecha.seconds) {
            return new Date(fecha.seconds * 1000);
        }
        if (typeof fecha === "string") {
            const parsed = Date.parse(fecha);
            return Number.isNaN(parsed) ? new Date(0) : new Date(parsed);
        }
        if (typeof fecha === "number") {
            return new Date(fecha);
        }
        return new Date(0);
    }

    function formatearFechaDia(fecha) {
        if (!fecha) {
            return "";
        }
        const hoy = new Date();
        if (
            fecha.getFullYear() === hoy.getFullYear() &&
            fecha.getMonth() === hoy.getMonth() &&
            fecha.getDate() === hoy.getDate()
        ) {
            return "Hoy";
        }
        return fecha.toLocaleDateString("es-MX", {
            year: "numeric",
            month: "long",
            day: "numeric",
        });
    }

    function configurarEventos() {
        chatSendBtn.addEventListener("click", enviarMensaje);
        chatInputEl.addEventListener("keydown", (event) => {
            if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                enviarMensaje();
            }
        });
    }

    async function enviarMensaje() {
        const texto = (chatInputEl.value || "").trim();
        if (!texto || !chatRef || !currentUser) {
            return;
        }

        chatSendBtn.disabled = true;

        try {
            const mensajesRef = chatRef.collection("messages");
            const serverTimestamp = firebase.firestore.FieldValue.serverTimestamp();
            const senderName = currentUser.displayName || body.dataset.userName || "Usuario";

            const messageData = {
                chatId: chatDocId,
                text: texto,
                message: texto,
                type: "text",
                senderId: currentUser.uid,
                senderName: senderName,
                status: "sent",
                createdAt: serverTimestamp,
                updatedAt: serverTimestamp,
                created_at: serverTimestamp,
                updated_at: serverTimestamp,
                readBy: [currentUser.uid],
            };

            if (body.dataset.userEmail) {
                messageData.senderEmail = body.dataset.userEmail;
            }

            await mensajesRef.add(messageData);

            const partnerId = dataset.partnerId || "";
            const partnerName = dataset.partnerName || "";
            const currentUserName =
                currentUser.displayName || dataset.userName || "Usuario";

            const timestamp = firebase.firestore.FieldValue.serverTimestamp();

            await db.runTransaction(async (transaction) => {
                const snapshot = await transaction.get(chatRef);
                const previousData = snapshot.exists ? snapshot.data() || {} : {};

                const updates = {
                    updated_at: timestamp,
                    updatedAt: timestamp,
                    lastMessage: texto,
                    lastMessageAt: timestamp,
                    lastMessageSenderId: currentUser.uid,
                    lastMessageSenderName: currentUserName,
                    lastMessageSenderRole: chatRole,
                    lastSenderId: currentUser.uid,
                    lastSenderName: currentUserName,
                    lastSenderRole: chatRole,
                    [`unreadCounts.${currentUser.uid}`]: 0,
                    [`participantsData.${currentUser.uid}`]: {
                        id: currentUser.uid,
                        nombre: currentUserName,
                        rol_activo: chatRole,
                    },
                };

                if (partnerId) {
                    updates[`unreadCounts.${partnerId}`] =
                        firebase.firestore.FieldValue.increment(1);
                    updates[`participantsData.${partnerId}`] = {
                        id: partnerId,
                        nombre: partnerName,
                        rol_activo: partnerRole,
                    };
                }

                if (previousData && typeof previousData === "object") {
                    if (Object.prototype.hasOwnProperty.call(previousData, "last_message")) {
                        updates.last_message = previousData.last_message;
                    }
                    if (Object.prototype.hasOwnProperty.call(previousData, "last_message_at")) {
                        updates.last_message_at = previousData.last_message_at;
                    }
                    if (
                        Object.prototype.hasOwnProperty.call(
                            previousData,
                            "last_message_sender_id"
                        )
                    ) {
                        updates.last_message_sender_id = previousData.last_message_sender_id;
                    }
                    if (
                        Object.prototype.hasOwnProperty.call(
                            previousData,
                            "last_message_sender_name"
                        )
                    ) {
                        updates.last_message_sender_name = previousData.last_message_sender_name;
                    }
                    if (
                        Object.prototype.hasOwnProperty.call(
                            previousData,
                            "last_message_sender_role"
                        )
                    ) {
                        updates.last_message_sender_role = previousData.last_message_sender_role;
                    }
                    if (
                        Object.prototype.hasOwnProperty.call(previousData, "last_sender_id")
                    ) {
                        updates.last_sender_id = previousData.last_sender_id;
                    }
                    if (
                        Object.prototype.hasOwnProperty.call(previousData, "last_sender_name")
                    ) {
                        updates.last_sender_name = previousData.last_sender_name;
                    }
                    if (
                        Object.prototype.hasOwnProperty.call(previousData, "last_sender_role")
                    ) {
                        updates.last_sender_role = previousData.last_sender_role;
                    }
                }

                transaction.set(chatRef, updates, { merge: true });
            });

            chatInputEl.value = "";
            chatInputEl.focus();
        } catch (error) {
            console.error("❌ Error enviando mensaje:", error);
            alert("No se pudo enviar tu mensaje. Inténtalo nuevamente.");
        } finally {
            chatSendBtn.disabled = false;
        }
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

    function obtenerParticipanteDesdeDatos(chatData, currentUserId) {
        if (chatData.participantsData) {
            for (const [id, datos] of Object.entries(chatData.participantsData)) {
                if (id !== currentUserId) {
                    return {
                        id,
                        nombre:
                            datos.nombre ||
                            datos.nombre_tienda ||
                            datos.email?.split("@")[0] ||
                            "",
                    };
                }
            }
        }

        if (chatData.comprador_id && chatData.comprador_id !== currentUserId) {
            return {
                id: chatData.comprador_id,
                nombre: chatData.comprador_nombre || "",
            };
        }
        if (chatData.vendedor_id && chatData.vendedor_id !== currentUserId) {
            return {
                id: chatData.vendedor_id,
                nombre: chatData.vendedor_nombre || "",
            };
        }

        const participantes = Array.isArray(chatData.participants)
            ? chatData.participants
            : [];
        const otherId = participantes.find((id) => id !== currentUserId) || "";

        return {
            id: otherId,
            nombre: chatData[`perfil_${otherId}`] || "",
        };
    }

    function generarFolioPedido(pedidoId) {
        const base = (pedidoId || "PEDIDO").toString().toUpperCase();
        const clean = base.replace(/[^\w]/g, "").substring(0, 8);
        return `PED-${clean}`;
    }

    function mostrarError(mensaje) {
        if (chatMessagesEl) {
            chatMessagesEl.innerHTML = `
                <div class="chat-error">
                    <i class="fas fa-exclamation-circle"></i>
                    <p>${mensaje}</p>
                </div>
            `;
        }
    }

    function actualizarCacheUltimoMensaje(chatId, texto) {
        if (!chatId) return;
        try {
            const event = new CustomEvent("chat-last-message-update", {
                detail: {
                    chatId,
                    texto: (texto || "").toString().trim(),
                },
            });
            window.dispatchEvent(event);
        } catch (error) {
            console.warn("No se pudo notificar el último mensaje", error);
        }
    }
})();

