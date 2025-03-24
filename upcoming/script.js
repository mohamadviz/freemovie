const apiKey = '1dc4cbf81f0accf4fa108820d551dafc'; // کلید API شما
const baseImageUrl = 'https://image.tmdb.org/t/p/w500';
const defaultPoster = 'https://m4tinbeigi-official.github.io/freemovie/images/default-freemovie-300.png';

// تنظیمات API
let moviePage = 1;
let tvPage = 1;
let isLoading = false;

const apiUrls = {
    upcomingMovies: `https://api.themoviedb.org/3/movie/upcoming?api_key=${apiKey}&language=fa-IR&page=`,
    upcomingTv: `https://api.themoviedb.org/3/tv/on_the_air?api_key=${apiKey}&language=fa-IR&page=` // توجه: TMDb endpoint مستقیمی برای "upcoming TV" ندارد، از "on_the_air" استفاده می‌کنیم
};

// مدیریت نوار پیشرفت
function updateLoadingBar(percentage) {
    const loadingBar = document.getElementById('loading-bar');
    loadingBar.style.width = percentage + '%';
}

function finishLoadingBar() {
    const loadingBar = document.getElementById('loading-bar');
    loadingBar.style.width = '100%';
    setTimeout(() => loadingBar.style.width = '0', 300);
}

// دریافت و نمایش محتوا
async function fetchContent(containerId, url, page, isInitial = false) {
    if (isLoading) return;
    isLoading = true;
    const container = document.getElementById(containerId);
    const loadingMore = document.getElementById('loading-more');

    if (!isInitial) loadingMore.classList.remove('hidden');
    updateLoadingBar(30);

    try {
        const response = await fetch(`${url}${page}`);
        if (!response.ok) throw new Error(`خطای سرور: ${response.status}`);
        const data = await response.json();
        const items = data.results || [];

        if (isInitial) container.innerHTML = ''; // پاکسازی اسکلتون‌ها در بارگذاری اولیه

        items.forEach(item => {
            const poster = item.poster_path ? `${baseImageUrl}${item.poster_path}` : defaultPoster;
            const title = item.title || item.name || 'نامشخص';
            const releaseDate = item.release_date || item.first_air_date || 'نامشخص';
            const overview = item.overview ? item.overview.slice(0, 100) + '...' : 'توضیحات موجود نیست';

            container.innerHTML += `
                <div class="group relative">
                    <img src="${poster}" alt="${title}" class="w-full h-auto rounded-lg shadow-lg">
                    <div class="absolute inset-0 bg-black bg-opacity-75 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-center items-center text-center p-4">
                        <h3 class="text-lg font-bold text-white">${title}</h3>
                        <p class="text-sm text-gray-200">تاریخ انتشار: ${releaseDate}</p>
                        <p class="text-sm text-gray-200">${overview}</p>
                        <a href="/freemovie/${containerId.includes('movie') ? 'movie' : 'series'}/index.html?id=${item.id}" class="mt-2 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">مشاهده</a>
                    </div>
                </div>
            `;
        });

        finishLoadingBar();
    } catch (error) {
        console.error(`خطا در دریافت داده‌ها (${containerId}):`, error);
        container.innerHTML += '<p class="text-center text-red-500">خطایی رخ داد!</p>';
    } finally {
        isLoading = false;
        loadingMore.classList.add('hidden');
    }
}

// مدیریت اسکرول بی‌نهایت
function handleInfiniteScroll() {
    const scrollPosition = window.innerHeight + window.scrollY;
    const documentHeight = document.documentElement.offsetHeight;

    if (scrollPosition >= documentHeight - 200 && !isLoading) {
        moviePage++;
        tvPage++;
        fetchContent('upcoming-movies', apiUrls.upcomingMovies, moviePage);
        fetchContent('upcoming-tv', apiUrls.upcomingTv, tvPage);
    }
}

// مدیریت تم
function manageThemeToggle() {
    const themeToggle = document.getElementById('theme-toggle');
    const body = document.body;

    themeToggle.addEventListener('click', () => {
        body.classList.toggle('dark');
        const isDark = body.classList.contains('dark');
        themeToggle.innerHTML = isDark ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
    });

    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
        body.classList.remove('dark');
        themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
    }
}

// اجرای اولیه
document.addEventListener('DOMContentLoaded', () => {
    fetchContent('upcoming-movies', apiUrls.upcomingMovies, moviePage, true);
    fetchContent('upcoming-tv', apiUrls.upcomingTv, tvPage, true);
    manageThemeToggle();
    window.addEventListener('scroll', handleInfiniteScroll);
});