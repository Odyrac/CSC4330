(function (global) {
    function show(message, durationMs) {
        // If the bot is playing and requests suppression, do nothing
        try {
            if (window.Bot && window.Bot.suppressToasts) return;
        } catch (e) { }
        durationMs = typeof durationMs === 'number' ? durationMs : 3500;
        let container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            document.body.appendChild(container);
        }

        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.innerHTML = `
            <div class="toast-message"></div>
            <div class="toast-progress"><div class="toast-progress-fill"></div></div>
        `;
        toast.querySelector('.toast-message').textContent = message;
        container.appendChild(toast);

        requestAnimationFrame(() => toast.classList.add('show'));

        const fill = toast.querySelector('.toast-progress-fill');
        fill.style.transition = `width ${durationMs}ms linear`;
        fill.style.width = '100%';
        setTimeout(() => { fill.style.width = '0%'; }, 20);

        let removed = false;
        const hideToast = () => {
            if (removed) return;
            toast.classList.remove('show');
            toast.classList.add('hide');
            removed = true;
        };

        const timeout = setTimeout(hideToast, durationMs);

        toast.addEventListener('transitionend', (ev) => {
            if (ev.propertyName === 'opacity' && toast.classList.contains('hide')) {
                if (toast && toast.parentNode) toast.parentNode.removeChild(toast);
            }
        });

        toast.addEventListener('click', () => {
            clearTimeout(timeout);
            hideToast();
        });
    }

    global.Toast = { show };
})(window);