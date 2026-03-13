document.addEventListener("DOMContentLoaded", () => {
    const { api, auth, ui, utils } = window.CampusApp;
    const page = window.location.pathname.split("/").pop();
    const buyerHome = "/buyer-platform/dashboard.html";
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
                auth.logout("/buyer-platform/login.html");
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

    const renderOrderStatus = (status) => {
        return status.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
    };

    const handleLogin = () => {
        auth.redirectIfAuthenticated({
            provider: "/provider-dashboard/dashboard.html",
            buyer: buyerHome
        });

        document.getElementById("login-form").addEventListener("submit", async (event) => {
            event.preventDefault();
            setStatusText("Signing in...");

            try {
                const response = await api.request("/api/auth/login", {
                    method: "POST",
                    body: JSON.stringify({
                        email: document.getElementById("buyer-email").value.trim(),
                        password: document.getElementById("buyer-password").value
                    })
                });

                auth.setSession({ token: response.token, user: response.user });
                window.location.href = buyerHome;
            } catch (error) {
                setStatusText(error.message, true);
            }
        });
    };

    const handleRegister = () => {
        auth.redirectIfAuthenticated({
            provider: "/provider-dashboard/dashboard.html",
            buyer: buyerHome
        });

        document.getElementById("register-form").addEventListener("submit", async (event) => {
            event.preventDefault();
            setStatusText("Creating account...");

            try {
                const response = await api.request("/api/auth/register", {
                    method: "POST",
                    body: JSON.stringify({
                        name: document.getElementById("buyer-name").value.trim(),
                        email: document.getElementById("buyer-register-email").value.trim(),
                        department: document.getElementById("buyer-department").value.trim(),
                        password: document.getElementById("buyer-register-password").value,
                        roles: ["student"]
                    })
                });

                auth.setSession({ token: response.token, user: response.user });
                window.location.href = buyerHome;
            } catch (error) {
                setStatusText(error.message, true);
            }
        });
    };

    const loadDashboard = async () => {
        const user = auth.requireAuth({ redirectTo: "/buyer-platform/login.html" });
        if (!user) {
            return;
        }

        document.getElementById("buyer-profile-name").textContent = user.name;

        try {
            const { orders } = await api.request("/api/orders/mine?type=buyer");
            document.getElementById("buyer-total-orders").textContent = orders.length;
            document.getElementById("buyer-active-orders").textContent =
                orders.filter((order) => ["pending", "accepted", "in_progress"].includes(order.status)).length;
            document.getElementById("buyer-completed-orders").textContent =
                orders.filter((order) => order.status === "completed").length;

            const activity = document.getElementById("buyer-recent-activity");
            activity.innerHTML = orders.length ? orders.slice(0, 5).map((order) => `
                <div style="display: flex; justify-content: space-between; border-bottom: 1px solid var(--border); padding-bottom: 12px;">
                    <div>
                        <p style="color: var(--text-dark); font-weight: 500;">${escapeHtml(order.service.title)}</p>
                        <p style="font-size: 0.85rem;">Provider: ${escapeHtml(order.provider.name)}</p>
                    </div>
                    <span class="badge ${ui.statusToBadgeClass(order.status)}" style="height: fit-content;">${escapeHtml(renderOrderStatus(order.status))}</span>
                </div>
            `).join("") : "<p>You have not placed any orders yet.</p>";
        } catch (error) {
            ui.showMessage(error.message, "error");
        }
    };

    const loadBrowsePage = async () => {
        const user = auth.requireAuth({ redirectTo: "/buyer-platform/login.html" });
        if (!user) {
            return;
        }

        const categories = ["All", "Tutoring", "Tech Repair", "Printing", "Food Delivery", "Assignment Help"];
        const filters = document.getElementById("browse-category-filters");
        const grid = document.getElementById("browse-grid");
        const searchInput = document.getElementById("browse-search-input");
        const searchForm = document.getElementById("browse-search-form");
        let currentCategory = "All";

        const renderCategories = () => {
            filters.innerHTML = categories.map((category) => `
                <button class="btn ${currentCategory === category ? "btn-primary" : "btn-secondary"}" data-category="${category}" style="border-radius: 20px; padding: 6px 14px; font-size: 0.85rem;">
                    ${escapeHtml(category)}
                </button>
            `).join("");

            filters.querySelectorAll("[data-category]").forEach((button) => {
                button.addEventListener("click", async () => {
                    currentCategory = button.dataset.category;
                    renderCategories();
                    await fetchServices();
                });
            });
        };

        const fetchServices = async () => {
            grid.innerHTML = "<p>Loading services...</p>";
            const params = new URLSearchParams();
            if (searchInput.value.trim()) {
                params.set("search", searchInput.value.trim());
            }
            if (currentCategory !== "All") {
                params.set("category", currentCategory);
            }

            try {
                const { services } = await api.request(`/api/services${params.toString() ? `?${params.toString()}` : ""}`);
                grid.innerHTML = services.length ? services.map((service) => `
                    <div class="card" style="display: flex; flex-direction: column; gap: 12px;">
                        <div>
                            <span class="badge ${ui.statusToBadgeClass(service.status)}" style="margin-bottom: 10px; display: inline-block;">${escapeHtml(service.category)}</span>
                            <h3 style="font-size: 1.1rem; margin-bottom: 8px;">${escapeHtml(service.title)}</h3>
                            <div style="display: flex; align-items: center; gap: 8px; font-size: 0.85rem; color: var(--text-muted); margin-bottom: 8px;">
                                <img src="https://i.pravatar.cc/150?img=11" alt="" style="width: 24px; border-radius: 50%;">
                                ${escapeHtml(service.provider.name)}${service.provider.department ? ` - ${escapeHtml(service.provider.department)}` : ""}
                            </div>
                            <p style="font-size: 0.9rem;">${escapeHtml(service.description.slice(0, 120))}${service.description.length > 120 ? "..." : ""}</p>
                        </div>
                        <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 12px; border-top: 1px solid var(--border);">
                            <span style="font-size: 1.2rem; font-weight: 700; color: var(--primary);">${ui.formatCurrency(service.price)}</span>
                            <span class="rating"><i class="fa-solid fa-star"></i> ${Number(service.averageRating || 0).toFixed(1)} <span style="color: var(--text-muted); font-weight: 400;">(${service.totalReviews || 0})</span></span>
                        </div>
                        <a href="service-details.html?id=${service._id}" class="btn btn-primary btn-block">View Details</a>
                    </div>
                `).join("") : "<p>No services found for the selected filters.</p>";
            } catch (error) {
                grid.innerHTML = `<p>${escapeHtml(error.message)}</p>`;
            }
        };

        searchForm.addEventListener("submit", async (event) => {
            event.preventDefault();
            await fetchServices();
        });

        renderCategories();
        await fetchServices();
    };

    const loadServiceDetailsPage = async () => {
        const user = auth.requireAuth({ redirectTo: "/buyer-platform/login.html" });
        if (!user) {
            return;
        }

        const serviceId = utils.getQueryParam("id");
        if (!serviceId) {
            ui.showMessage("Service ID is missing.", "error");
            return;
        }

        try {
            const [{ service }, { reviews }] = await Promise.all([
                api.request(`/api/services/${serviceId}`),
                api.request(`/api/reviews/service/${serviceId}`)
            ]);

            document.getElementById("service-title").textContent = service.title;
            document.getElementById("service-provider-name").textContent = service.provider.name;
            document.getElementById("service-provider-meta").textContent =
                service.provider.department || service.provider.email;
            document.getElementById("service-rating").innerHTML =
                `<i class="fa-solid fa-star"></i> ${Number(service.averageRating || 0).toFixed(1)} (${service.totalReviews || 0} reviews)`;
            document.getElementById("service-description").textContent = service.description;
            document.getElementById("service-price").textContent = ui.formatCurrency(service.price);
            document.getElementById("service-meta").textContent =
                `${service.category}${service.deliveryTime ? ` - ${service.deliveryTime}` : ""}${service.location ? ` - ${service.location}` : ""}`;
            document.getElementById("order-service-link").href = `checkout.html?id=${service._id}`;
            document.getElementById("message-provider-link").href =
                `chat.html?participantId=${service.provider._id}&serviceId=${service._id}`;

            const reviewsContainer = document.getElementById("service-reviews");
            reviewsContainer.innerHTML = reviews.length ? reviews.map((review) => `
                <div class="card" style="padding: 16px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                        <strong>${escapeHtml(review.reviewer.name)}</strong>
                        <span class="rating"><i class="fa-solid fa-star"></i> ${review.rating}</span>
                    </div>
                    <p style="margin: 0;">${escapeHtml(review.comment || "Great service.")}</p>
                </div>
            `).join("") : "<p>No reviews yet for this service.</p>";
        } catch (error) {
            ui.showMessage(error.message, "error");
        }
    };

    const loadCheckoutPage = async () => {
        const user = auth.requireAuth({ redirectTo: "/buyer-platform/login.html" });
        if (!user) {
            return;
        }

        const serviceId = utils.getQueryParam("id");
        if (!serviceId) {
            ui.showMessage("Service ID is missing.", "error");
            return;
        }

        let service;
        try {
            const response = await api.request(`/api/services/${serviceId}`);
            service = response.service;
        } catch (error) {
            ui.showMessage(error.message, "error");
            return;
        }

        document.getElementById("checkout-service-summary").innerHTML = `
            <div style="display: flex; gap: 16px; align-items: center;">
                <div style="width: 60px; height: 60px; background: rgba(37, 99, 235, 0.1); border-radius: 12px; display: flex; align-items: center; justify-content: center; color: var(--primary); font-size: 1.5rem;">
                    <i class="fa-solid fa-briefcase"></i>
                </div>
                <div>
                    <div style="font-weight: 600;">${escapeHtml(service.title)}</div>
                    <div style="font-size: 0.85rem; color: var(--text-muted); margin-top: 4px;">Provider: ${escapeHtml(service.provider.name)}</div>
                </div>
            </div>
        `;
        document.getElementById("checkout-base-price").textContent = ui.formatCurrency(service.price);
        document.getElementById("checkout-total").textContent = ui.formatCurrency(service.price);
        document.getElementById("pay-button").textContent = `Pay ${ui.formatCurrency(service.price)} via Razorpay`;

        document.getElementById("checkout-form").addEventListener("submit", async (event) => {
            event.preventDefault();
            const button = document.getElementById("pay-button");
            button.disabled = true;
            button.textContent = "Creating order...";

            try {
                const orderResponse = await api.request("/api/orders", {
                    method: "POST",
                    body: JSON.stringify({
                        serviceId: service._id,
                        requirements: document.getElementById("order-requirements").value.trim(),
                        campusLocation: document.getElementById("campus-location").value.trim(),
                        scheduledFor: document.getElementById("scheduled-for").value || undefined
                    })
                });

                const order = orderResponse.order;
                const clientConfig = await api.request("/api/config/client");
                const paymentData = await api.request(`/api/orders/${order._id}/payment/create`, {
                    method: "POST"
                });

                const paymentOrder = paymentData.paymentOrder;
                if (!window.Razorpay || !clientConfig.razorpayKeyId) {
                    ui.showMessage("Order created, but Razorpay checkout could not be loaded.", "error");
                    window.location.href = "orders.html";
                    return;
                }

                const razorpay = new Razorpay({
                    key: clientConfig.razorpayKeyId,
                    amount: paymentOrder.amount,
                    currency: paymentOrder.currency,
                    name: "CampusConnect",
                    description: service.title,
                    order_id: paymentOrder.id,
                    handler: async (paymentResponse) => {
                        try {
                            await api.request(`/api/orders/${order._id}/payment/verify`, {
                                method: "POST",
                                body: JSON.stringify({
                                    razorpayOrderId: paymentResponse.razorpay_order_id,
                                    razorpayPaymentId: paymentResponse.razorpay_payment_id,
                                    razorpaySignature: paymentResponse.razorpay_signature
                                })
                            });
                            ui.showMessage("Payment completed successfully.", "success");
                            window.location.href = "orders.html";
                        } catch (error) {
                            ui.showMessage(error.message, "error");
                            button.disabled = false;
                            button.textContent = `Pay ${ui.formatCurrency(service.price)} via Razorpay`;
                        }
                    },
                    prefill: {
                        name: user.name,
                        email: user.email
                    },
                    theme: {
                        color: "#2563eb"
                    },
                    modal: {
                        ondismiss: () => {
                            button.disabled = false;
                            button.textContent = `Pay ${ui.formatCurrency(service.price)} via Razorpay`;
                        }
                    }
                });

                button.textContent = "Opening Razorpay...";
                razorpay.open();
            } catch (error) {
                ui.showMessage(error.message, "error");
                button.disabled = false;
                button.textContent = `Pay ${ui.formatCurrency(service.price)} via Razorpay`;
            }
        });
    };

    const initializeReviewModal = () => {
        const modal = document.getElementById("review-modal");
        if (!modal) {
            return;
        }

        document.querySelectorAll("#star-rating i").forEach((star) => {
            star.addEventListener("click", () => {
                const rating = Number(star.dataset.value);
                modal.dataset.rating = String(rating);
                document.querySelectorAll("#star-rating i").forEach((currentStar) => {
                    currentStar.style.color =
                        Number(currentStar.dataset.value) <= rating ? "var(--warning)" : "var(--border)";
                });
            });
        });

        document.getElementById("review-cancel").addEventListener("click", () => {
            modal.classList.remove("open");
        });

        document.getElementById("review-submit").addEventListener("click", async () => {
            const orderId = modal.dataset.orderId;
            const rating = Number(modal.dataset.rating || 0);
            const comment = document.getElementById("review-comment").value.trim();

            if (!orderId || !rating) {
                ui.showMessage("Please select a rating first.", "error");
                return;
            }

            try {
                await api.request("/api/reviews", {
                    method: "POST",
                    body: JSON.stringify({ orderId, rating, comment })
                });
                modal.classList.remove("open");
                ui.showMessage("Review submitted successfully.", "success");
                await loadOrdersPage();
            } catch (error) {
                ui.showMessage(error.message, "error");
            }
        });
    };

    const openReviewModal = (order) => {
        const modal = document.getElementById("review-modal");
        if (!modal) {
            return;
        }

        modal.dataset.orderId = order._id;
        modal.dataset.rating = "0";
        document.getElementById("review-service-name").textContent = `How was ${order.service.title}?`;
        document.getElementById("review-comment").value = "";
        document.querySelectorAll("#star-rating i").forEach((star) => {
            star.style.color = "var(--border)";
        });
        modal.classList.add("open");
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
        const user = auth.requireAuth({ redirectTo: "/buyer-platform/login.html" });
        if (!user) {
            return;
        }

        const list = document.getElementById("buyer-orders-list");
        if (!list) {
            return;
        }

        try {
            const { orders } = await api.request("/api/orders/mine?type=buyer");
            list.innerHTML = orders.length ? orders.map((order) => {
                const actions = [
                    `<a href="chat.html?participantId=${order.provider._id}&orderId=${order._id}" class="btn btn-secondary" style="padding: 7px 14px; font-size: 0.85rem;"><i class="fa-solid fa-comment"></i> Message</a>`
                ];

                if (["pending", "accepted", "in_progress"].includes(order.status)) {
                    actions.push(
                        `<button class="btn btn-secondary" data-status-action="cancelled" data-order-id="${order._id}" style="padding: 7px 14px; font-size: 0.85rem;">Cancel</button>`
                    );
                }

                if (["accepted", "in_progress"].includes(order.status)) {
                    actions.push(
                        `<button class="btn btn-primary" data-status-action="completed" data-order-id="${order._id}" style="padding: 7px 14px; font-size: 0.85rem;">Mark Completed</button>`
                    );
                }

                if (order.status === "completed") {
                    actions.push(
                        `<button class="btn btn-primary" data-review-order="${order._id}" style="padding: 7px 14px; font-size: 0.85rem;"><i class="fa-solid fa-star"></i> Leave Review</button>`
                    );
                }

                return `
                    <div class="card order-card ${order.status === "completed" ? "completed" : order.status === "pending" ? "pending" : "active"}" style="display: flex; justify-content: space-between; align-items: center; gap: 20px;">
                        <div style="display: flex; gap: 20px; align-items: center;">
                            <div style="width: 52px; height: 52px; background: rgba(37,99,235,0.1); border-radius: 12px; display: flex; align-items: center; justify-content: center; color: var(--primary); font-size: 1.4rem;">
                                <i class="fa-solid fa-briefcase"></i>
                            </div>
                            <div>
                                <h3 style="font-size: 1.1rem; margin-bottom: 4px;">${escapeHtml(order.service.title)}</h3>
                                <div style="font-size: 0.85rem; color: var(--text-muted); display: flex; gap: 10px; flex-wrap: wrap;">
                                    <span>${escapeHtml(order._id.slice(-8).toUpperCase())}</span>
                                    <span>Provider: ${escapeHtml(order.provider.name)}</span>
                                    <span style="font-weight: 600; color: var(--text-dark);">${ui.formatCurrency(order.totalAmount)}</span>
                                    <span>${escapeHtml(ui.formatDate(order.scheduledFor))}</span>
                                </div>
                            </div>
                        </div>
                        <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 10px;">
                            <span class="badge ${ui.statusToBadgeClass(order.status)}">${escapeHtml(renderOrderStatus(order.status))}</span>
                            <div style="display: flex; gap: 10px; flex-wrap: wrap; justify-content: flex-end;">${actions.join("")}</div>
                        </div>
                    </div>
                `;
            }).join("") : `
                <div class="card">
                    <h3>No orders yet</h3>
                    <p>Browse available services and place your first order.</p>
                    <a href="browse.html" class="btn btn-primary" style="width: fit-content;">Browse Services</a>
                </div>
            `;

            list.querySelectorAll("[data-status-action]").forEach((button) => {
                button.addEventListener("click", async () => {
                    await updateOrderStatus(button.dataset.orderId, button.dataset.statusAction);
                });
            });

            list.querySelectorAll("[data-review-order]").forEach((button) => {
                button.addEventListener("click", () => {
                    const order = orders.find((item) => item._id === button.dataset.reviewOrder);
                    if (order) {
                        openReviewModal(order);
                    }
                });
            });
        } catch (error) {
            list.innerHTML = `<p>${escapeHtml(error.message)}</p>`;
        }
    }

    const loadChatPage = async () => {
        const user = auth.requireAuth({ redirectTo: "/buyer-platform/login.html" });
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
                        <img src="https://i.pravatar.cc/150?img=11" alt="${escapeHtml(other.name)}">
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
            chatOrderLink.textContent = current.order ? "View Related Order" : "Browse Services";
            chatOrderLink.href = current.order ? "orders.html" : "browse.html";

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
    initializeReviewModal();

    if (page === "login.html") handleLogin();
    if (page === "register.html") handleRegister();
    if (page === "dashboard.html") loadDashboard();
    if (page === "browse.html") loadBrowsePage();
    if (page === "service-details.html") loadServiceDetailsPage();
    if (page === "checkout.html") loadCheckoutPage();
    if (page === "orders.html") loadOrdersPage();
    if (page === "chat.html") loadChatPage();
});
