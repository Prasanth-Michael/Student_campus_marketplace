document.addEventListener('DOMContentLoaded', () => {
    // Mobile sidebar toggle
    const mobileToggle = document.getElementById('mobile-toggle');
    const sidebar = document.getElementById('sidebar');
    if (mobileToggle && sidebar) {
        mobileToggle.addEventListener('click', () => sidebar.classList.toggle('open'));
    }

    // Active nav highlighting
    const currentPage = window.location.pathname.split('/').pop();
    document.querySelectorAll('.nav-item').forEach(item => {
        if (item.getAttribute('href') === currentPage) {
            item.classList.add('active');
        }
    });

    // Login form
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', e => {
            e.preventDefault();
            window.location.href = 'dashboard.html';
        });
    }

    // Register form
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        registerForm.addEventListener('submit', e => {
            e.preventDefault();
            window.location.href = 'login.html';
        });
    }

    // Checkout / Razorpay simulation
    const checkoutForm = document.getElementById('checkout-form');
    if (checkoutForm) {
        checkoutForm.addEventListener('submit', e => {
            e.preventDefault();
            const btn = checkoutForm.querySelector('button[type="submit"]');
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Processing...';
            btn.disabled = true;
            setTimeout(() => {
                alert('Payment Successful via Razorpay! Redirecting to your orders.');
                window.location.href = 'orders.html';
            }, 2000);
        });
    }

    // Chat
    const chatForm = document.getElementById('chat-form');
    const chatInput = document.getElementById('chat-input');
    const chatMessages = document.getElementById('chat-messages');
    if (chatForm && chatInput && chatMessages) {
        chatForm.addEventListener('submit', e => {
            e.preventDefault();
            const text = chatInput.value.trim();
            if (!text) return;

            const sent = document.createElement('div');
            sent.className = 'message sent';
            sent.innerHTML = `<div class="msg-bubble">${text}</div><span class="msg-time">Just now</span>`;
            chatMessages.appendChild(sent);
            chatInput.value = '';
            chatMessages.scrollTop = chatMessages.scrollHeight;

            setTimeout(() => {
                const recv = document.createElement('div');
                recv.className = 'message received';
                recv.innerHTML = `<div class="msg-bubble">Got your message! I'll be in touch shortly.</div><span class="msg-time">Just now</span>`;
                chatMessages.appendChild(recv);
                chatMessages.scrollTop = chatMessages.scrollHeight;
            }, 1000);
        });
    }

    // Star rating in review modal
    const stars = document.querySelectorAll('#star-rating i');
    stars.forEach((star, idx) => {
        star.addEventListener('click', () => {
            stars.forEach((s, i) => {
                s.style.color = i <= idx ? 'var(--warning)' : 'var(--border)';
            });
        });
    });
});
