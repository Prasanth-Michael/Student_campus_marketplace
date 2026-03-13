document.addEventListener('DOMContentLoaded', () => {
    // Mobile Sidebar Toggle
    const mobileToggle = document.getElementById('mobile-toggle');
    const sidebar = document.getElementById('sidebar');
    
    if (mobileToggle && sidebar) {
        mobileToggle.addEventListener('click', () => {
            sidebar.classList.toggle('open');
        });
    }

    // Set active nav item based on current page
    const currentPath = window.location.pathname.split('/').pop();
    const navItems = document.querySelectorAll('.nav-item');
    
    navItems.forEach(item => {
        const href = item.getAttribute('href');
        if (href === currentPath || (currentPath === '' && href === 'dashboard.html')) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });

    // Dummy Login Handler
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            window.location.href = 'dashboard.html';
        });
    }

    // Dummy Create Service Handler
    const createForm = document.getElementById('create-form');
    if (createForm) {
        createForm.addEventListener('submit', (e) => {
            e.preventDefault();
            alert('Service created successfully!');
            window.location.href = 'services.html';
        });
    }

    // Chat functionality (UI only)
    const chatForm = document.getElementById('chat-form');
    const chatInput = document.getElementById('chat-input');
    const chatMessages = document.getElementById('chat-messages');

    if (chatForm && chatInput && chatMessages) {
        chatForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const text = chatInput.value.trim();
            if (text) {
                // Create message div
                const msgDiv = document.createElement('div');
                msgDiv.className = 'message sent';
                msgDiv.innerHTML = `
                    <div class="msg-bubble">${text}</div>
                    <span class="msg-time">Just now</span>
                `;
                chatMessages.appendChild(msgDiv);
                
                // Clear and scroll
                chatInput.value = '';
                chatMessages.scrollTop = chatMessages.scrollHeight;

                // Simulate reply
                setTimeout(() => {
                    const replyDiv = document.createElement('div');
                    replyDiv.className = 'message received';
                    replyDiv.innerHTML = `
                        <img src="https://i.pravatar.cc/150?img=32" alt="Student" class="avatar">
                        <div class="msg-bubble bg-secondary">Got it, thanks!</div>
                        <span class="msg-time">Just now</span>
                    `;
                    chatMessages.appendChild(replyDiv);
                    chatMessages.scrollTop = chatMessages.scrollHeight;
                }, 1000);
            }
        });
    }
});
