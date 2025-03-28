export function startLoadingBar() {
    const loadingBar = document.getElementById('loading-bar');
    if (loadingBar) {
        loadingBar.style.width = '0';
        setTimeout(() => loadingBar.style.width = '30%', 100);
    }
}

export function finishLoadingBar() {
    const loadingBar = document.getElementById('loading-bar');
    if (loadingBar) {
        loadingBar.style.width = '100%';
        setTimeout(() => loadingBar.style.width = '0', 300);
    }
}

export function manageNotification(id, storageKey) {
    const notice = document.getElementById(id);
    const closeButton = notice?.querySelector('.close-btn');

    if (!notice || !closeButton) return;

    if (!localStorage.getItem(storageKey)) {
        notice.classList.remove('hidden');
    }

    closeButton.addEventListener('click', () => {
        notice.classList.add('hidden');
        localStorage.setItem(storageKey, 'true');
    });
}