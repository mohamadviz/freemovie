
document.addEventListener('DOMContentLoaded', () => {
    const tokenInput = document.getElementById('omdb-token');
    const saveButton = document.getElementById('save-token');
    const clearButton = document.getElementById('clear-token');
    const statusMessage = document.getElementById('status-message');

    // بارگذاری توکن ذخیره‌شده
    const savedToken = localStorage.getItem('userOmdbToken');
    if (savedToken) {
        tokenInput.value = savedToken;
        statusMessage.textContent = 'توکن شما قبلاً ذخیره شده است.';
        statusMessage.className = 'text-green-500';
    }

    // ذخیره توکن
    saveButton.addEventListener('click', () => {
        const token = tokenInput.value.trim();
        if (token) {
            localStorage.setItem('userOmdbToken', token);
            statusMessage.textContent = 'توکن با موفقیت ذخیره شد!';
            statusMessage.className = 'text-green-500';
        } else {
            statusMessage.textContent = 'لطفاً یک توکن معتبر وارد کنید.';
            statusMessage.className = 'text-red-500';
        }
    });

    // حذف توکن
    clearButton.addEventListener('click', () => {
        localStorage.removeItem('userOmdbToken');
        tokenInput.value = '';
        statusMessage.textContent = 'توکن حذف شد.';
        statusMessage.className = 'text-yellow-500';
    });
});