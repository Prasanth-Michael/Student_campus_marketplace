(function initializeCampusApp() {
  const STORAGE_KEY = "campus-connect-auth";
  const THEME = {
    ink: "#37353E",
    slate: "#44444E",
    clay: "#715A5A",
    mist: "#D3DAD9",
    mistDark: "#B7C1C0"
  };

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
      type === "error" ? "#b91c1c" : type === "success" ? "#365947" : THEME.clay;

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
      if (response.status === 401) {
        clearSession();
      }
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

  const mountHistoryButtons = () => {
    if (document.body.dataset.historyMounted === "true") {
      return;
    }

    if (window.location.pathname === "/" || window.location.pathname.endsWith("/index.html")) {
      return;
    }

    const rail = document.createElement("div");
    rail.setAttribute("aria-label", "Page navigation");
    rail.style.position = "fixed";
    rail.style.left = "18px";
    rail.style.bottom = "18px";
    rail.style.zIndex = "9998";
    rail.style.display = "flex";
    rail.style.gap = "10px";

    const buttons = [
      {
        label: "Back",
        icon: "fa-arrow-left",
        onClick: () => window.history.back()
      },
      {
        label: "Forward",
        icon: "fa-arrow-right",
        onClick: () => window.history.forward()
      },
      {
        label: "Home",
        icon: "fa-house",
        onClick: () => authRedirect("/")
      }
    ];

    buttons.forEach((item) => {
      const button = document.createElement("button");
      button.type = "button";
      button.innerHTML = `<i class="fa-solid ${item.icon}"></i> ${item.label}`;
      button.style.border = "1px solid rgba(211, 218, 217, 0.45)";
      button.style.background = "rgba(55, 53, 62, 0.92)";
      button.style.color = THEME.mist;
      button.style.padding = "11px 14px";
      button.style.borderRadius = "999px";
      button.style.cursor = "pointer";
      button.style.backdropFilter = "blur(14px)";
      button.style.boxShadow = "0 18px 40px rgba(17, 18, 22, 0.28)";
      button.addEventListener("click", item.onClick);
      rail.appendChild(button);
    });

    document.body.appendChild(rail);
    document.body.dataset.historyMounted = "true";
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
      startSocket,
      mountHistoryButtons
    }
  };
})();
