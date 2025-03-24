const apiKey = '1dc4cbf81f0accf4fa108820d551dafc';
const apiUrl = `https://api.themoviedb.org/3/genre/movie/list?api_key=${apiKey}&language=fa-IR`;

function startLoadingBar() {
    const loadingBar = document.getElementById('loading-bar');
    loadingBar.style.width = '30%';
}

function finishLoadingBar() {
    const loadingBar = document.getElementById('loading-bar');
    loadingBar.style.width = '100%';
    setTimeout(() => loadingBar.style.width = '0', 300);
}

async function fetchGenres() {
    const container = document.getElementById('genre-list');
    startLoadingBar();

    try {
        const response = await fetch(apiUrl);
        if (!response.ok) throw new Error(`خطای سرور: ${response.status}`);
        const data = await response.json();
        const genres = data.genres || [];

        container.innerHTML = ''; // پاکسازی اسکلتون‌ها

        genres.forEach(genre => {
            container.innerHTML += `
                <a href="/freemovie/movies-by-genre.html?genreId=${genre.id}&genreName=${encodeURIComponent(genre.name)}" class="genre-item">
                    <h3 class="text-lg font-bold">${genre.name}</h3>
                </a>
            `;
        });
    } catch (error) {
        console.error('خطا در دریافت ژانرها:', error);
        container.innerHTML = '<p class="text-center text-red-500">خطایی رخ داد! لطفاً دوباره تلاش کنید.</p>';
    } finally {
        finishLoadingBar();
    }
}

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

document.addEventListener('DOMContentLoaded', () => {
    fetchGenres();
    manageThemeToggle();
});