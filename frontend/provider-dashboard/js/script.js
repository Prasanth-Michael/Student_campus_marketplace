document.addEventListener("DOMContentLoaded", () => {
    const { api, auth, ui, utils } = window.CampusApp;
    const page = window.location.pathname.split("/").pop();
    const providerHome = "/provider-dashboard/dashboard.html";
    const escapeHtml = ui.htmlEscape;

    const setupLayout = () => {
        const mobileToggle = document.getElementById("mobile-toggle");
        const sidebar = document.getElementById("sidebar");
        if (mobileToggle && sidebar) {
            mobileToggle.addEventListener("click", () => sidebar.classList.toggle("open"));
        }

        document.querySelectorAll('[data-action="logout"]').forEach((link) => {
            link.addEventListener("click", (event) => {
                event.preventDefault();
                auth.logout("/provider-dashboard/login.html");
            });
        });

        document.querySelectorAll(".nav-item").forEach((item) => {
            if (item.getAttribute("href") === page) {
                item.classList.add("active");
            }
        });
    };

    const setStatusText = (text, isError = false) => {
        const statusElement = document.getElementById("auth-status");
        if (!statusElement) {
            return;
        }

        statusElement.textContent = text;
        statusElement.style.color = isError ? "#dc2626" : "inherit";
    };

    const requireProvider = () => {
        return auth.requireAuth({
            role: "provider",
            redirectTo: "/provider-dashboard/login.html",
            fallbackTo: "/buyer-platform/dashboard.html"
        });
    };

    const renderOrderStatus = (status) => {
        return status.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
    };

    const handleLogin = () => {
        auth.redirectIfAuthenticated({
            provider: providerHome,
            buyer: "/buyer-platform/dashboard.html"
        });

        document.getElementById("login-form").addEventListener("submit", async (event) => {
            event.preventDefault();
            setStatusText("Signing in...");

            try {
                const response = await api.request("/api/auth/login", {
                    method: "POST",
                    body: JSON.stringify({
                        email: document.getElementById("provider-email").value.trim(),
                        password: document.getElementById("provider-password").value
                    })
                });

                auth.setSession({ token: response.token, user: response.user });
                if (!auth.hasRole("provider") && !auth.hasRole("admin")) {
                    auth.clearSession();
                    throw new Error("This account does not have provider access.");
                }

                window.location.href = providerHome;
            } catch (error) {
                setStatusText(error.message, true);
            }
        });
    };

    const handleRegister = () => {
        auth.redirectIfAuthenticated({
            provider: providerHome,
            buyer: "/buyer-platform/dashboard.html"
        });

        document.getElementById("register-form").addEventListener("submit", async (event) => {
            event.preventDefault();
            setStatusText("Creating provider account...");

            try {
                const response = await api.request("/api/auth/register", {
                    method: "POST",
                    body: JSON.stringify({
                        name: document.getElementById("provider-name").value.trim(),
                        email: document.getElementById("provider-register-email").value.trim(),
                        department: document.getElementById("provider-department").value.trim(),
                        bio: document.getElementById("provider-bio").value.trim(),
                        password: document.getElementById("provider-register-password").value,
                        roles: ["student", "provider"]
                    })
                });

                auth.setSession({ token: response.token, user: response.user });
                window.location.href = providerHome;
            } catch (error) {
                setStatusText(error.message, true);
            }
        });
    };

    const loadDashboard = async () => {
        const user = requireProvider();
        if (!user) {
            return;
        }

        document.getElementById("provider-profile-name").textContent = user.name;

        try {
            const [{ services }, { orders }] = await Promise.all([
                api.request("/api/services/mine"),
                api.request("/api/orders/mine?type=provider")
            ]);

            document.getElementById("provider-total-services").textContent = services.length;
            document.getElementById("provider-total-orders").textContent = orders.length;
            document.getElementById("provider-completed-orders").textContent =
                orders.filter((order) => order.status === "completed").length;

            const activity = document.getElementById("provider-recent-activity");
            activity.innerHTML = orders.length ? orders.slice(0, 5).map((order) => `
                <div style="display: flex; justify-content: space-between; border-bottom: 1px solid var(--border); padding-bottom: 12px;">
                    <div>
                        <p style="color: var(--text-dark); font-weight: 500;">${escapeHtml(order.service.title)}</p>
                        <p style="font-size: 0.85rem;">Buyer: ${escapeHtml(order.buyer.name)}</p>
                    </div>
                    <span class="badge ${ui.statusToBadgeClass(order.status)}" style="height: fit-content;">${escapeHtml(renderOrderStatus(order.status))}</span>
                </div>
            `).join("") : "<p>No provider activity yet.</p>";
        } catch (error) {
            ui.showMessage(error.message, "error");
        }
    };

    const loadServiceForm = async () => {
        const user = requireProvider();
        if (!user) {
            return;
        }

        document.getElementById("provider-form-name").textContent = user.name;
        const serviceId = utils.getQueryParam("id");
        const form = document.getElementById("create-form");
        const title = document.getElementById("service-form-title");
        const submitButton = document.getElementById("service-submit-button");

        if (serviceId) {
            try {
                const response = await api.request(`/api/services/${serviceId}`);
                const service = response.service;
                title.textContent = "Edit Service";
                submitButton.innerHTML = '<i class="fa-solid fa-pen"></i> Update Service';
                document.getElementById("service-title-input").value = service.title;
                document.getElementById("service-category-input").value = service.category;
                document.getElementById("service-price-input").value = service.price;
                document.getElementById("service-delivery-input").value = service.deliveryTime || "";
                document.getElementById("service-location-input").value = service.location || "";
                document.getElementById("service-tags-input").value = Array.isArray(service.tags) ? service.tags.join(", ") : "";
                document.getElementById("service-description-input").value = service.description;
            } catch (error) {
                ui.showMessage(error.message, "error");
            }
        }

        form.addEventListener("submit", async (event) => {
            event.preventDefault();
            submitButton.disabled = true;

            const payload = {
                title: document.getElementById("service-title-input").value.trim(),
                category: document.getElementById("service-category-input").value.trim(),
                price: Number(document.getElementById("service-price-input").value),
                deliveryTime: document.getElementById("service-delivery-input").value.trim(),
                location: document.getElementById("service-location-input").value.trim(),
                tags: document.getElementById("service-tags-input").value
                    .split(",")
                    .map((tag) => tag.trim())
                    .filter(Boolean),
                description: document.getElementById("service-description-input").value.trim()
            };

            try {
                await api.request(serviceId ? `/api/services/${serviceId}` : "/api/services", {
                    method: serviceId ? "PUT" : "POST",
                    body: JSON.stringify(payload)
                });
                ui.showMessage(serviceId ? "Service updated successfully." : "Service created successfully.", "success");
                window.location.href = "/provider-dashboard/services.html";
            } catch (error) {
                ui.showMessage(error.message, "error");
                submitButton.disabled = false;
            }
        });
    };

    const loadServicesPage = async () => {
        const user = requireProvider();
        if (!user) {
            return;
        }

        const list = document.getElementById("provider-services-list");
        try {
            const { services } = await api.request("/api/services/mine");
            list.innerHTML = services.length ? services.map((service) => `
                <div class="card" style="display: flex; flex-direction: column; justify-content: space-between; gap: 12px;">
                    <div>
                        <span class="badge ${ui.statusToBadgeClass(service.status)}" style="margin-bottom: 12px; display: inline-block;">${escapeHtml(service.category)}</span>
                        <h3 style="font-size: 1.15rem; margin-bottom: 8px;">${escapeHtml(service.title)}</h3>
                        <p style="font-size: 0.9rem;">${escapeHtml(service.description.slice(0, 120))}${service.description.length > 120 ? "..." : ""}</p>
                        <div style="font-size: 1.25rem; font-weight: 700; color: var(--primary); margin: 12px 0 20px 0;">${ui.formatCurrency(service.price)}</div>
                    </div>
                    <div style="display: flex; gap: 10px; margin-top: auto;">
                        <a href="create-service.html?id=${service._id}" class="btn btn-secondary" style="flex: 1;"><i class="fa-solid fa-pen"></i> Edit</a>
                        <button class="btn btn-danger" data-delete-service="${service._id}"><i class="fa-solid fa-trash"></i></button>
                    </div>
                </div>
            `).join("") : `
                <div class="card">
                    <h3>No services yet</h3>
                    <p>Create your first campus service to start receiving orders.</p>
                    <a href="create-service.html" class="btn btn-primary" style="width: fit-content;">Create Service</a>
                </div>
            `;

            list.querySelectorAll("[data-delete-service]").forEach((button) => {
                button.addEventListener("click", async () => {
                    try {
                        await api.request(`/api/services/${button.dataset.deleteService}`, {
                            method: "DELETE"
                        });
                        ui.showMessage("Service deleted successfully.", "success");
                        await loadServicesPage();
                    } catch (error) {
                        ui.showMessage(error.message, "error");
                    }
                });
            });
        } catch (error) {
            list.innerHTML = `<p>${escapeHtml(error.message)}</p>`;
        }
    };

    const updateOrderStatus = async (orderId, status) => {
        try {
            await api.request(`/api/orders/${orderId}/status`, {
                method: "PATCH",
                body: JSON.stringify({ status })
            });
            ui.showMessage("Order updated successfully.", "success");
            await loadOrdersPage();
        } catch (error) {
            ui.showMessage(error.message, "error");
        }
    };

    async function loadOrdersPage() {
        const user = requireProvider();
        if (!user) {
            return;
        }

        const list = document.getElementById("provider-orders-list");
        if (!list) {
            return;
        }

        try {
            const { orders } = await api.request("/api/orders/mine?type=provider");
            list.innerHTML = orders.length ? orders.map((order) => {
                const actions = [
                    `<a href="chat.html?participantId=${order.buyer._id}&orderId=${order._id}" class="btn btn-secondary"><i class="fa-solid fa-comment"></i> Chat</a>`
                ];

                if (order.status === "pending") {
                    actions.unshift(`<button class="btn btn-primary" data-status-action="accepted" data-order-id="${order._id}"><i class="fa-solid fa-check"></i> Accept</button>`);
                }

                if (order.status === "accepted") {
                    actions.unshift(`<button class="btn btn-primary" data-status-action="in_progress" data-order-id="${order._id}"><i class="fa-solid fa-play"></i> Start</button>`);
                }

                if (order.status === "in_progress") {
                    actions.unshift(`<button class="btn btn-success" data-status-action="completed" data-order-id="${order._id}"><i class="fa-solid fa-flag-checkered"></i> Complete</button>`);
                }

                if (["pending", "accepted", "in_progress"].includes(order.status)) {
                    actions.push(`<button class="btn btn-secondary" data-status-action="cancelled" data-order-id="${order._id}">Cancel</button>`);
                }

                return `
                    <div class="card">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; padding-bottom: 16px; border-bottom: 1px solid var(--border);">
                            <div style="display: flex; align-items: center; gap: 12px;">
                                <img src="https://i.pravatar.cc/150?img=12" alt="Buyer" style="width: 48px; height: 48px; border-radius: 50%; object-fit: cover;">
                                <div>
                                    <h4 style="margin-bottom: 2px;">${escapeHtml(order.buyer.name)}</h4>
                                    <span style="font-size: 0.8rem; color: var(--text-muted);">${escapeHtml(order.campusLocation || "Campus location not set")}</span>
                                </div>
                            </div>
                            <span class="badge ${ui.statusToBadgeClass(order.status)}">${escapeHtml(renderOrderStatus(order.status))}</span>
                        </div>
                        <div style="margin-bottom: 20px;">
                            <strong style="display: block; margin-bottom: 4px; color: var(--text-dark); font-size: 1.1rem;">${escapeHtml(order.service.title)}</strong>
                            <p>Total: ${ui.formatCurrency(order.totalAmount)}</p>
                            <p style="font-size: 0.85rem; color: var(--text-muted);">Scheduled: ${escapeHtml(ui.formatDate(order.scheduledFor))}</p>
                            <p style="font-size: 0.85rem; color: var(--text-muted);">Payment: ${escapeHtml(renderOrderStatus(order.paymentStatus))}</p>
                        </div>
                        <div style="display: flex; gap: 10px; flex-wrap: wrap;">${actions.join("")}</div>
                    </div>
                `;
            }).join("") : `
                <div class="card">
                    <h3>No orders yet</h3>
                    <p>Your incoming buyer orders will show up here.</p>
                </div>
            `;

            list.querySelectorAll("[data-status-action]").forEach((button) => {
                button.addEventListener("click", async () => {
                    await updateOrderStatus(button.dataset.orderId, button.dataset.statusAction);
                });
            });
        } catch (error) {
            list.innerHTML = `<p>${escapeHtml(error.message)}</p>`;
        }
    }

    const loadChatPage = async () => {
        const user = requireProvider();
        if (!user) {
            return;
        }

        const conversationList = document.getElementById("conversation-list");
        const chatMessages = document.getElementById("chat-messages");
        const chatPartnerName = document.getElementById("chat-partner-name");
        const chatPartnerStatus = document.getElementById("chat-partner-status");
        const chatOrderLink = document.getElementById("chat-order-link");
        const chatForm = document.getElementById("chat-form");
        const chatInput = document.getElementById("chat-input");
        const conversationSearch = document.getElementById("conversation-search");
        const socket = utils.startSocket();

        let conversations = [];
        let currentConversationId = null;

        const renderConversationList = (items) => {
            conversationList.innerHTML = items.length ? items.map((conversation) => {
                const other = conversation.participants.find((participant) => participant._id !== user._id) || conversation.participants[0];
                return `
                    <div class="contact-item ${conversation._id === currentConversationId ? "active" : ""}" data-conversation-id="${conversation._id}">
                        <img src="https://i.pravatar.cc/150?img=32" alt="${escapeHtml(other.name)}">
                        <div style="flex:1; min-width:0;">
                            <div style="display: flex; justify-content: space-between;">
                                <span style="font-weight: 600; font-size: 0.9rem;">${escapeHtml(other.name)}</span>
                                <span style="font-size: 0.75rem; color: var(--text-muted);">${conversation.lastMessageAt ? new Date(conversation.lastMessageAt).toLocaleDateString("en-IN") : ""}</span>
                            </div>
                            <div style="font-size: 0.83rem; color: var(--text-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHtml(conversation.lastMessage || "No messages yet")}</div>
                        </div>
                    </div>
                `;
            }).join("") : "<p style='padding: 12px;'>No conversations yet.</p>";

            conversationList.querySelectorAll("[data-conversation-id]").forEach((item) => {
                item.addEventListener("click", async () => {
                    await loadConversation(item.dataset.conversationId);
                });
            });
        };

        const fetchConversations = async () => {
            const response = await api.request("/api/chat/conversations");
            conversations = response.conversations;
            const query = conversationSearch.value.trim().toLowerCase();
            const filtered = query
                ? conversations.filter((conversation) =>
                    conversation.participants.some((participant) =>
                        participant._id !== user._id && participant.name.toLowerCase().includes(query)
                    )
                )
                : conversations;
            renderConversationList(filtered);
        };

        const loadConversation = async (conversationId) => {
            currentConversationId = conversationId;
            await fetchConversations();

            const { messages } = await api.request(`/api/chat/conversations/${conversationId}/messages`);
            const current = conversations.find((item) => item._id === conversationId);
            const other = current.participants.find((participant) => participant._id !== user._id) || current.participants[0];

            chatPartnerName.textContent = other.name;
            chatPartnerStatus.textContent = current.order ? `Order: ${renderOrderStatus(current.order.status)}` : "Direct conversation";
            chatOrderLink.textContent = current.order ? "View Related Order" : "View Services";
            chatOrderLink.href = current.order ? "orders.html" : "services.html";

            chatMessages.innerHTML = messages.length ? messages.map((message) => `
                <div class="message ${message.sender._id === user._id ? "sent" : "received"}">
                    <div class="msg-bubble">${escapeHtml(message.text)}</div>
                    <span class="msg-time">${new Date(message.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</span>
                </div>
            `).join("") : "<div class='message received'><div class='msg-bubble'>No messages yet.</div></div>";

            chatMessages.scrollTop = chatMessages.scrollHeight;
            if (socket) {
                socket.emit("conversation:join", conversationId);
            }
        };

        const maybeCreateConversation = async () => {
            const participantId = utils.getQueryParam("participantId");
            const orderId = utils.getQueryParam("orderId");
            const serviceId = utils.getQueryParam("serviceId");
            const conversationId = utils.getQueryParam("conversationId");

            if (conversationId) {
                currentConversationId = conversationId;
                return;
            }

            if (!participantId) {
                return;
            }

            const response = await api.request("/api/chat/conversations", {
                method: "POST",
                body: JSON.stringify({ participantId, orderId, serviceId })
            });
            currentConversationId = response.conversation._id;
        };

        chatForm.addEventListener("submit", async (event) => {
            event.preventDefault();
            const text = chatInput.value.trim();
            if (!text || !currentConversationId) {
                return;
            }

            try {
                await api.request("/api/chat/messages", {
                    method: "POST",
                    body: JSON.stringify({ conversationId: currentConversationId, text })
                });
                chatInput.value = "";
                await loadConversation(currentConversationId);
            } catch (error) {
                ui.showMessage(error.message, "error");
            }
        });

        conversationSearch.addEventListener("input", () => {
            const query = conversationSearch.value.trim().toLowerCase();
            renderConversationList(
                conversations.filter((conversation) =>
                    !query || conversation.participants.some((participant) =>
                        participant._id !== user._id && participant.name.toLowerCase().includes(query)
                    )
                )
            );
        });

        if (socket) {
            socket.on("message:new", async ({ conversationId }) => {
                await fetchConversations();
                if (conversationId === currentConversationId) {
                    await loadConversation(conversationId);
                }
            });
        }

        try {
            await maybeCreateConversation();
            await fetchConversations();
            if (currentConversationId) {
                await loadConversation(currentConversationId);
            }
        } catch (error) {
            ui.showMessage(error.message, "error");
        }
    };

    setupLayout();

    if (page === "login.html") handleLogin();
    if (page === "register.html") handleRegister();
    if (page === "dashboard.html") loadDashboard();
    if (page === "create-service.html") loadServiceForm();
    if (page === "services.html") loadServicesPage();
    if (page === "orders.html") loadOrdersPage();
    if (page === "chat.html") loadChatPage();
});
