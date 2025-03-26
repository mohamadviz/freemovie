// search-pro.js
const apiKey = '1dc4cbf81f0accf4fa108820d551dafc'; // TMDb API key
const language = 'fa-IR'; // زبان فارسی (ایران)
const baseImageUrl = 'https://image.tmdb.org/t/p/w500'; // URL پایه تصاویر TMDb
const defaultPoster = 'https://m4tinbeigi-official.github.io/freemovie/images/default-freemovie.png'; // پوستر پیش‌فرض

let apiKeySwitcher; // متغیر سراسری برای سوئیچر کلید API

// تابع برای دریافت یا ذخیره تصویر از/در کش با استفاده از localStorage
function getCachedImage(id, fetchFunction) {
  const cachedImage = localStorage.getItem(`image_${id}`);
  if (cachedImage && cachedImage !== defaultPoster) {
    console.log(`تصویر کش‌شده برای شناسه ${id} از Local Storage بارگذاری شد`);
    return Promise.resolve(cachedImage);
  }
  return fetchFunction().then(poster => {
    if (poster !== defaultPoster) {
      localStorage.setItem(`image_${id}`, poster);
      console.log(`تصویر برای شناسه ${id} در Local Storage ذخیره شد`);
    }
    return poster;
  });
}

// مقداردهی اولیه سوئیچر کلید API
async function initializeSwitcher() {
  apiKeySwitcher = await loadApiKeys(); // فرض بر این است که loadApiKeys در apiKeySwitcher.js تعریف شده
}

// تابع نمایش لودینگ
function showLoading() {
  document.body.insertAdjacentHTML('beforeend', `
    <div id="loading-overlay" class="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50">
      <div class="flex flex-col items-center">
        <div class="popcorn mb-6">
          <svg width="80" height="80" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
            <rect x="16" y="32" width="32" height="24" rx="4" fill="#ffaa07" stroke="#1f2937" stroke-width="2"/>
            <rect x="12" y="28" width="40" height="8" rx="2" fill="#ffaa07"/>
            <path d="M16 32 L48 32" stroke="#1f2937" stroke-width="2"/>
            <path d="M16 36 L48 36" stroke="#1f2937" stroke-width="1"/>
            <circle cx="24" cy="24" r="6" fill="#ffaa07" class="popcorn-piece" style="animation: pop 1.5s infinite ease-in-out;"/>
            <circle cx="32" cy="20" r="5" fill="#ffaa07" class="popcorn-piece" style="animation: pop 1.5s infinite ease-in-out 0.2s;"/>
            <circle cx="40" cy="24" r="6" fill="#ffaa07" class="popcorn-piece" style="animation: pop 1.5s infinite ease-in-out 0.4s;"/>
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

// تابع اصلی جستجوی پیشرفته
async function advancedSearch() {
  // دریافت مقادیر از فرم
  const query = document.getElementById('search-query').value.trim().toLowerCase();
  const withGenres = Array.from(document.getElementById('with-genres').selectedOptions).map(opt => opt.value).join(',');
  const withoutGenres = Array.from(document.getElementById('without-genres').selectedOptions).map(opt => opt.value).join(',');
  const withCountry = document.getElementById('with-country').value;
  const minVote = document.getElementById('min-vote').value;

  const movieResults = document.getElementById('movie-results');
  const tvResults = document.getElementById('tv-results');
  const movieTitle = document.getElementById('movie-title');
  const tvTitle = document.getElementById('tv-title');

  // نمایش لودینگ
  showLoading();

  try {
    // ساخت URL برای Discover API
    let movieUrl = `https://api.themoviedb.org/3/discover/movie?api_key=${apiKey}&language=${language}&sort_by=vote_average.desc`;
    let tvUrl = `https://api.themoviedb.org/3/discover/tv?api_key=${apiKey}&language=${language}&sort_by=vote_average.desc`;

    // اعمال فیلترها
    if (query) {
      movieUrl += `&with_text_query=${encodeURIComponent(query)}`;
      tvUrl += `&with_text_query=${encodeURIComponent(query)}`;
    }
    if (withGenres) {
      movieUrl += `&with_genres=${withGenres}`;
      tvUrl += `&with_genres=${withGenres}`;
    }
    if (withoutGenres) {
      movieUrl += `&without_genres=${withoutGenres}`;
      tvUrl += `&without_genres=${withoutGenres}`;
    }
    if (withCountry) {
      movieUrl += `&with_origin_country=${withCountry}`;
      tvUrl += `&with_origin_country=${withCountry}`;
    }
    if (minVote) {
      movieUrl += `&vote_average.gte=${minVote}`;
      tvUrl += `&vote_average.gte=${minVote}`;
    }

    // دریافت داده‌ها
    const [movieRes, tvRes] = await Promise.all([
      fetch(movieUrl).then(res => {
        if (!res.ok) throw new Error(`خطای سرور (فیلم‌ها): ${res.status}`);
        return res.json();
      }),
      fetch(tvUrl).then(res => {
        if (!res.ok) throw new Error(`خطای سرور (سریال‌ها): ${res.status}`);
        return res.json();
      })
    ]);

    const movies = movieRes.results || [];
    const tvSeries = tvRes.results || [];

    // پاکسازی کانتینرها
    movieResults.innerHTML = '';
    tvResults.innerHTML = '';
    movieTitle.textContent = `نتایج جستجو فیلم${query ? ` برای "${query}"` : ''}`;
    tvTitle.textContent = `نتایج جستجو سریال${query ? ` برای "${query}"` : ''}`;

    const seenIds = new Set();

    // رندر سریال‌ها
    if (tvSeries.length > 0) {
      for (const tv of tvSeries) {
        if (seenIds.has(tv.id)) {
          console.warn(`سریال تکراری با شناسه ${tv.id} حذف شد`);
          continue;
        }
        seenIds.add(tv.id);

        let poster = tv.poster_path ? `${baseImageUrl}${tv.poster_path}` : defaultPoster;
        const tvId = tv.id;
        const title = tv.name || 'نامشخص';
        const year = tv.first_air_date ? tv.first_air_date.substr(0, 4) : 'نامشخص';

        tvResults.innerHTML += `
          <div class="group relative">
            <img src="${poster}" alt="${title}" class="w-full h-auto rounded-lg shadow-lg">
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

        let poster = movie.poster_path ? `${baseImageUrl}${movie.poster_path}` : defaultPoster;
        const movieId = movie.id;
        const title = movie.title || 'نامشخص';
        const year = movie.release_date ? movie.release_date.substr(0, 4) : 'نامشخص';

        movieResults.innerHTML += `
          <div class="group relative">
            <img src="${poster}" alt="${title}" class="w-full h-auto rounded-lg shadow-lg">
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
  } catch (error) {
    console.error('خطا در جستجوی پیشرفته:', error);
    movieResults.innerHTML = '<p class="text-center text-red-500">خطایی رخ داد! لطفاً دوباره تلاش کنید.</p>';
    tvResults.innerHTML = '';
  } finally {
    hideLoading();
  }
}

// رویدادها هنگام بارگذاری صفحه
document.addEventListener('DOMContentLoaded', async () => {
  await initializeSwitcher();
  const searchButton = document.getElementById('advanced-search-button');

  if (searchButton) {
    searchButton.addEventListener('click', advancedSearch);
  } else {
    console.error('دکمه جستجو پیدا نشد!');
  }

  // اجازه جستجو با Enter
  const searchInput = document.getElementById('search-query');
  if (searchInput) {
    searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        searchButton.click();
      }
    });
  }
});