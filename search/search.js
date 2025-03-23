// search.js
const apiKey = '1dc4cbf81f0accf4fa108820d551dafc'; // TMDb API key
const language = 'fa-IR'; // Language set to Persian (Iran)
const baseImageUrl = 'https://image.tmdb.org/t/p/w500'; // TMDb base image URL
const defaultPoster = 'https://m4tinbeigi-official.github.io/freemovie/images/default-freemovie.png'; // Default poster fallback

let apiKeySwitcher; // Global variable to hold the switcher instance

// تابع برای دریافت یا ذخیره تصویر از/در کش با استفاده از localStorage
function getCachedImage(id, fetchFunction) {
    const cachedImage = localStorage.getItem(`image_${id}`);
    if (cachedImage && cachedImage !== defaultPoster) { // جلوگیری از استفاده کش برای تصویر پیش‌فرض
        console.log(`تصویر کش‌شده برای شناسه ${id} از Local Storage بارگذاری شد`);
        return Promise.resolve(cachedImage);
    }
    return fetchFunction().then(poster => {
        if (poster !== defaultPoster) { // فقط پوسترهای غیرپیش‌فرض کش می‌شن
            localStorage.setItem(`image_${id}`, poster);
            console.log(`تصویر برای شناسه ${id} در Local Storage ذخیره شد`);
        }
        return poster;
    });
}

// Initialize the API key switcher
async function initializeSwitcher() {
    apiKeySwitcher = await loadApiKeys(); // استفاده از loadApiKeys سراسری
}

// تابع نمایش لودینگ
function showLoading() {
    document.body.insertAdjacentHTML('beforeend', `
        <div id="loading-overlay" class="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50">
            <div class="flex flex-col items-center">
                <div class="popcorn mb-6">
                    <svg width="80" height="80" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
                        <!-- جعبه پاپ‌کورن -->
                        <rect x="16" y="32" width="32" height="24" rx="4" fill="#ffaa07" stroke="#1f2937" stroke-width="2"/>
                        <rect x="12" y="28" width="40" height="8" rx="2" fill="#ffaa07"/>
                        <!-- خطوط کلاسیک روی جعبه -->
                        <path d="M16 32 L48 32" stroke="#1f2937" stroke-width="2"/>
                        <path d="M16 36 L48 36" stroke="#1f2937" stroke-width="1"/>
                        <!-- پاپ‌کورن‌های بیرون‌زده -->
                        <circle cx="24" cy="24" r="6" fill="#ffaa07" class="popcorn-piece" style="animation: pop 1.5s infinite ease-in-out;"/>
                        <circle cx="32" cy="20" r="5" fill="#ffaa07" class="popcorn-piece" style="animation: pop 1.5s infinite ease-in-out 0.2s;"/>
                        <circle cx="40" cy="24" r="6" fill="#ffaa07" class="popcorn-piece" style="animation: pop 1.5s infinite ease-in-out 0.4s;"/>
                        <!-- نوشته "Popcorn" روی جعبه -->
                    </svg>
                </div>
                <p class="text-white text-lg font-semibold">در حال دریافت نتایج...</p>
            </div>
        </div>
    `);
}

// تابع حذف لودینگ
function hideLoading() {
    const loadingOverlay = document.getElementById('loading-overlay');
    if (loadingOverlay) loadingOverlay.remove();
}


async function searchMovies(query) {
    const movieResults = document.getElementById('movie-results');
    const tvResults = document.getElementById('tv-results');
    const movieTitle = document.getElementById('movie-title');
    const tvTitle = document.getElementById('tv-title');

    // تبدیل به حروف کوچک و حذف فاصله‌های اضافی
    const cleanedQuery = query.trim().toLowerCase();

    // نمایش لودینگ
    showLoading();

    try {
        // Define TMDb search endpoints
        const movieSearchUrl = `https://api.themoviedb.org/3/search/movie?api_key=${apiKey}&language=${language}&query=${encodeURIComponent(cleanedQuery)}`;
        const tvSearchUrl = `https://api.themoviedb.org/3/search/tv?api_key=${apiKey}&language=${language}&query=${encodeURIComponent(cleanedQuery)}`;

        // دریافت همه داده‌ها قبل از نمایش
        const [movieRes, tvRes] = await Promise.all([
            fetch(movieSearchUrl).then(res => {
                if (!res.ok) throw new Error(`خطای سرور (فیلم‌ها): ${res.status}`);
                return res.json();
            }),
            fetch(tvSearchUrl).then(res => {
                if (!res.ok) throw new Error(`خطای سرور (سریال‌ها): ${res.status}`);
                return res.json();
            })
        ]);

        const movies = movieRes.results || [];
        const tvSeries = tvRes.results || [];

        console.log('Movie results:', movieRes); // Debugging
        console.log('TV results:', tvRes); // Debugging

        // پاکسازی کانتینرها فقط بعد از لود کامل
        movieResults.innerHTML = '';
        tvResults.innerHTML = '';
        movieTitle.textContent = `نتایج جستجو فیلم ${cleanedQuery}`;
        tvTitle.textContent = `نتایج جستجو سریال ${cleanedQuery}`;

        // مجموعه‌ای برای جلوگیری از تکرار
        const seenIds = new Set();

        // رندر فقط بعد از دریافت همه داده‌ها
        if (tvSeries.length > 0 || movies.length > 0) {
            // رندر سریال‌ها (اولویت با سریال‌ها)
            if (tvSeries.length > 0) {
                for (const tv of tvSeries) {
                    if (seenIds.has(tv.id)) {
                        console.warn(`سریال تکراری با شناسه ${tv.id} حذف شد`);
                        continue;
                    }
                    seenIds.add(tv.id);

                    let poster = defaultPoster;
                    const tvExternalIdsUrl = `https://api.themoviedb.org/3/tv/${tv.id}/external_ids?api_key=${apiKey}`;
                    try {
                        const externalIdsRes = await fetch(tvExternalIdsUrl);
                        if (!externalIdsRes.ok) throw new Error(`خطای سرور (شناسه‌های خارجی سریال): ${externalIdsRes.status}`);
                        const externalIdsData = await externalIdsRes.json();
                        const imdbId = externalIdsData.imdb_id || '';
                        if (imdbId) {
                            poster = await getCachedImage(imdbId, async () => {
                                const omdbData = await apiKeySwitcher.fetchWithKeySwitch(
                                    (key) => `https://www.omdbapi.com/?i=${imdbId}&apikey=${key}`
                                );
                                return omdbData.Poster && omdbData.Poster !== 'N/A' ? omdbData.Poster : defaultPoster;
                            });
                        }
                    } catch (fetchError) {
                        console.warn(`خطا در دریافت پوستر سریال ${tv.id} از OMDB:`, fetchError.message);
                    }

                    let posterUrl = poster; //.replace(/300(?=\.jpg$)/i, '');

                    const tvId = tv.id;
                    const title = tv.name || 'نامشخص';
                    const year = tv.first_air_date ? tv.first_air_date.substr(0, 4) : 'نامشخص';

                    tvResults.innerHTML += `
                        <div class="group relative">
                            <img src="${posterUrl}" alt="${title}" class="w-full h-auto rounded-lg shadow-lg">
                            <div class="absolute inset-0 bg-black bg-opacity-75 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-center items-center text-center p-4">
                                <h3 class="text-lg font-bold">${title}</h3>
                                <p class="text-sm">${year}</p>
                                <a href="../series/index.html?id=${tvId}" class="mt-2 bg-blue-500 text-white px-4 py-2 rounded">مشاهده</a>
                            </div>
                        </div>
                    `;
                }
            } else {
                tvResults.innerHTML = '<p class="text-center text-red-500">سریالی یافت نشد!</p>';
            }

            // رندر فیلم‌ها
            if (movies.length > 0) {
                for (const movie of movies) {
                    if (seenIds.has(movie.id)) {
                        console.warn(`فیلم تکراری با شناسه ${movie.id} حذف شد`);
                        continue;
                    }
                    seenIds.add(movie.id);

                    let poster = defaultPoster;
                    const movieExternalIdsUrl = `https://api.themoviedb.org/3/movie/${movie.id}/external_ids?api_key=${apiKey}`;
                    try {
                        const externalIdsRes = await fetch(movieExternalIdsUrl);
                        if (!externalIdsRes.ok) throw new Error(`خطای سرور (شناسه‌های خارجی فیلم): ${externalIdsRes.status}`);
                        const externalIdsData = await externalIdsRes.json();
                        const imdbId = externalIdsData.imdb_id || '';
                        if (imdbId) {
                            poster = await getCachedImage(imdbId, async () => {
                                const omdbData = await apiKeySwitcher.fetchWithKeySwitch(
                                    (key) => `https://www.omdbapi.com/?i=${imdbId}&apikey=${key}`
                                );
                                return omdbData.Poster && omdbData.Poster !== 'N/A' ? omdbData.Poster : defaultPoster;
                            });
                        }
                    } catch (fetchError) {
                        console.warn(`خطا در دریافت پوستر فیلم ${movie.id} از OMDB:`, fetchError.message);
                    }

                    let posterUrl = poster.replace(/300(?=\.jpg$)/i, '');

                    const movieId = movie.id;
                    const title = movie.title || 'نامشخص';
                    const year = movie.release_date ? movie.release_date.substr(0, 4) : 'نامشخص';

                    movieResults.innerHTML += `
                        <div class="group relative">
                            <img src="${posterUrl}" alt="${title}" class="w-full h-auto rounded-lg shadow-lg">
                            <div class="absolute inset-0 bg-black bg-opacity-75 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-center items-center text-center p-4">
                                <h3 class="text-lg font-bold">${title}</h3>
                                <p class="text-sm">${year}</p>
                                <a href="../movie/index.html?id=${movieId}" class="mt-2 bg-blue-500 text-white px-4 py-2 rounded">مشاهده</a>
                            </div>
                        </div>
                    `;
                }
            } else {
                movieResults.innerHTML = '<p class="text-center text-red-500">فیلمی یافت نشد!</p>';
            }
        } else {
            movieResults.innerHTML = '<p class="text-center text-red-500">نتیجه‌ای یافت نشد!</p>';
            tvResults.innerHTML = '';
        }
    } catch (error) {
        console.error('خطا در دریافت اطلاعات:', error);
        movieResults.innerHTML = '<p class="text-center text-red-500">خطایی رخ داد! لطفاً دوباره تلاش کنید.</p>';
        tvResults.innerHTML = '';
    } finally {
        // حذف لودینگ بعد از اتمام کار (موفق یا ناموفق)
        hideLoading();
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    await initializeSwitcher();
    const searchInput = document.getElementById('search');
    const searchButton = document.getElementById('search-button');

    searchButton.addEventListener('click', () => {
        const query = searchInput.value.trim();
        if (query.length > 2) {
            searchMovies(query);
        } else {
            hideLoading();
            document.getElementById('movie-title').textContent = 'نتایج جستجو فیلم';
            document.getElementById('tv-title').textContent = 'نتایج جستجو سریال';
            document.getElementById('movie-results').innerHTML = `
                <div class="skeleton"></div>
                <div class="skeleton"></div>
            `;
            document.getElementById('tv-results').innerHTML = '';
        }
    });

    // اجازه جستجو با Enter
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            searchButton.click();
        }
    });
});

// حذف debounce چون با دکمه کار نمی‌کنه

document.getElementById('theme-toggle').addEventListener('click', () => {
    document.documentElement.classList.toggle('dark');
    const icon = document.querySelector('#theme-toggle i');
    icon.classList.toggle('fa-sun');
    icon.classList.toggle('fa-moon');
});

document.getElementById('menu-toggle')?.addEventListener('click', () => {
    document.getElementById('mobile-menu')?.classList.toggle('hidden');
});