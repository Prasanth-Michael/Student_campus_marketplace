(function initializeCampusApp() {
  const STORAGE_KEY = "campus-connect-auth";

  const safeJsonParse = (value) => {
    try {
      return JSON.parse(value);
    } catch (error) {
      return null;
    }
  };

  const getSession = () => {
    return safeJsonParse(localStorage.getItem(STORAGE_KEY)) || { token: null, user: null };
  };

  const setSession = (session) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  };

  const clearSession = () => {
    localStorage.removeItem(STORAGE_KEY);
  };

  const getToken = () => getSession().token;
  const getUser = () => getSession().user;

  const hasRole = (role) => {
    const user = getUser();
    return Boolean(user && Array.isArray(user.roles) && user.roles.includes(role));
  };

  const htmlEscape = (value) => {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  };

  const formatCurrency = (amount) => {
    const numericAmount = Number(amount || 0);
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0
    }).format(numericAmount);
  };

  const formatDate = (value) => {
    if (!value) {
      return "Not scheduled";
    }

    return new Date(value).toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short"
    });
  };

  const getQueryParam = (name) => {
    return new URLSearchParams(window.location.search).get(name);
  };

  const showMessage = (message, type = "info") => {
    let container = document.getElementById("app-message");
    if (!container) {
      container = document.createElement("div");
      container.id = "app-message";
      container.style.position = "fixed";
      container.style.top = "18px";
      container.style.right = "18px";
      container.style.zIndex = "9999";
      container.style.maxWidth = "360px";
      document.body.appendChild(container);
    }

    const toast = document.createElement("div");
    toast.textContent = message;
    toast.style.padding = "12px 14px";
    toast.style.marginBottom = "10px";
    toast.style.borderRadius = "12px";
    toast.style.boxShadow = "0 12px 30px rgba(15, 23, 42, 0.15)";
    toast.style.color = "#fff";
    toast.style.fontSize = "0.95rem";
    toast.style.background =
      type === "error" ? "#dc2626" : type === "success" ? "#16a34a" : "#2563eb";

    container.appendChild(toast);

    setTimeout(() => {
      toast.remove();
      if (!container.children.length) {
        container.remove();
      }
    }, 3500);
  };

  const request = async (url, options = {}) => {
    const token = getToken();
    const headers = new Headers(options.headers || {});

    if (!headers.has("Content-Type") && options.body && !(options.body instanceof FormData)) {
      headers.set("Content-Type", "application/json");
    }

    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    const response = await fetch(url, {
      ...options,
      headers
    });

    const text = await response.text();
    const data = text ? safeJsonParse(text) || { message: text } : {};

    if (!response.ok) {
      const error = new Error(data.message || "Request failed");
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  };

  const authRedirect = (target) => {
    window.location.href = target;
  };

  const requireAuth = (options = {}) => {
    const session = getSession();
    if (!session.token || !session.user) {
      authRedirect(options.redirectTo || "/buyer-platform/login.html");
      return null;
    }

    if (options.role && !hasRole(options.role) && !hasRole("admin")) {
      showMessage(`This page requires the ${options.role} role.`, "error");
      authRedirect(options.fallbackTo || "/");
      return null;
    }

    return session.user;
  };

  const redirectIfAuthenticated = (fallbackByRole) => {
    const user = getUser();
    if (!user) {
      return;
    }

    if (hasRole("provider") || hasRole("admin")) {
      authRedirect(fallbackByRole.provider);
      return;
    }

    authRedirect(fallbackByRole.buyer);
  };

  const logout = (nextUrl) => {
    clearSession();
    authRedirect(nextUrl || "/");
  };

  const statusToBadgeClass = (status) => {
    const map = {
      pending: "badge-pending",
      accepted: "badge-active",
      in_progress: "badge-active",
      completed: "badge-completed",
      cancelled: "badge",
      disputed: "badge-pending",
      active: "badge-active",
      paused: "badge-pending",
      archived: "badge"
    };

    return map[status] || "badge";
  };

  const startSocket = () => {
    if (typeof io === "undefined" || !getToken()) {
      return null;
    }

    return io({
      auth: {
        token: getToken()
      }
    });
  };

  window.CampusApp = {
    api: {
      request
    },
    auth: {
      getSession,
      setSession,
      clearSession,
      getToken,
      getUser,
      hasRole,
      requireAuth,
      redirectIfAuthenticated,
      logout
    },
    ui: {
      showMessage,
      htmlEscape,
      formatCurrency,
      formatDate,
      statusToBadgeClass
    },
    utils: {
      getQueryParam,
      startSocket
    }
  };
})();
