import { initTheme } from './modules/theme.js';
import { fetchAndDisplayContent } from './modules/content.js';
import { manageNotification } from './modules/ui.js';
import { initializeSwitcher } from './apiKeySwitcher.js'; // فرض بر موجود بودن

document.addEventListener('DOMContentLoaded', async () => {
    const apiKeySwitcher = await initializeSwitcher();
    await fetchAndDisplayContent(apiKeySwitcher);
    initTheme();
    manageNotification('disclaimer-notice', 'disclaimerNoticeClosed');
    manageNotification('availability-notice', 'availabilityNoticeClosed');
    // سایر توابع UI مثل پاپ‌آپ و FAB را می‌توانید اینجا فراخوانی کنید
});