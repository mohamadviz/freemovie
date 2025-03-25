class ApiKeySwitcher {
    constructor(keys) {
        this.keys = keys || [];
        this.currentIndex = 0;
    }

    getCurrentKey() {
        if (this.keys.length === 0) {
            throw new Error('هیچ کلید API در دسترس نیست.');
        }
        return this.keys[this.currentIndex];
    }

    switchToNextKey() {
        this.currentIndex = (this.currentIndex + 1) % this.keys.length;
        console.log(`تعویض به کلید API جدید: ${this.getCurrentKey()}`);
    }

    async fetchWithKeySwitch(urlTemplate, maxRetriesPerKey = 3) {
        let attempts = 0;
        const totalAttemptsLimit = this.keys.length * maxRetriesPerKey; // حداکثر کل تلاش‌ها

        while (attempts < totalAttemptsLimit) {
            const url = urlTemplate(this.getCurrentKey());
            try {
                const response = await fetch(url);
                if (!response.ok) {
                    if (response.status === 429) {
                        console.warn('محدودیت نرخ OMDB API - تلاش مجدد با همین کلید...');
                        await new Promise(resolve => setTimeout(resolve, 1000)); // تاخیر ۱ ثانیه
                        attempts++;
                        continue; // دوباره با همون کلید تلاش کن
                    }
                    throw new Error(`خطای سرور (OMDB): ${response.status}`);
                }
                // اگه درخواست موفق بود، داده رو برگردون و حلقه رو بشکن
                return await response.json();
            } catch (error) {
                console.warn(`خطا در درخواست با کلید ${this.getCurrentKey()}: ${error.message}`);
                attempts++;
                // اگه تعداد تلاش‌ها با این کلید به حد مجاز رسید، کلید رو عوض کن
                if (attempts % maxRetriesPerKey === 0) {
                    this.switchToNextKey();
                }
                await new Promise(resolve => setTimeout(resolve, 1000)); // تاخیر ۱ ثانیه قبل از تلاش بعدی
                if (attempts >= totalAttemptsLimit) {
                    throw new Error('تمام کلیدهای API امتحان شدند و خطا ادامه دارد.');
                }
            }
        }
    }
}

async function loadApiKeys() {
    const possiblePaths = [
        '/freemovie/omdbKeys.json',        // مسیر روت پروژه
        '/freemovie/../omdbKeys.json'      // یک فولدر قبل‌تر (به روت برمی‌گرده)
    ];

    for (const path of possiblePaths) {
        try {
            const response = await fetch(path);
            if (!response.ok) {
                console.warn(`خطا در بارگذاری از ${path}: ${response.status}`);
                continue; // اگه مسیر کار نکرد، بعدی رو تست کن
            }
            const keys = await response.json();
            console.log(`فایل کلیدها از ${path} با موفقیت بارگذاری شد.`);
            return new ApiKeySwitcher(keys);
        } catch (error) {
            console.warn(`خطا در مسیر ${path}: ${error.message}`);
        }
    }

    console.error('هیچ فایل کلید API پیدا نشد.');
    return new ApiKeySwitcher(['38fa39d5']); // کلید پیش‌فرض
}

/* // استفاده از کد (اختیاری - برای تست)
(async () => {
    const apiSwitcher = await loadApiKeys();
    const urlTemplate = (key) => `http://www.omdbapi.com/?apikey=${key}&t=Matrix`;
    const data = await apiSwitcher.fetchWithKeySwitch(urlTemplate);
    console.log(data);
})(); */