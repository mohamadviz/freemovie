// search-pro.js
const apiKey = '1dc4cbf81f0accf4fa108820d551dafc';
const language = 'fa-IR';
const baseImageUrl = 'https://image.tmdb.org/t/p/w500';
const defaultPoster = 'https://m4tinbeigi-official.github.io/freemovie/images/default-freemovie.png';

let apiKeySwitcher;

async function initializeSwitcher() {
  apiKeySwitcher = await loadApiKeys();
}

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

function hideLoading() {
  const loadingOverlay = document.getElementById('loading-overlay');
  if (loadingOverlay) loadingOverlay.remove();
}

async function advancedSearch() {
  // دریافت مقادیر از فرم
  const contentType = document.querySelector('input[name="content-type"]:checked').value;
  const withGenres = Array.from(document.querySelectorAll('input[name="with-genres"]:checked')).map(input => input.value).join(',');
  const withoutGenres = Array.from(document.querySelectorAll('input[name="without-genres"]:checked')).map(input => input.value).join(',');
  const withCountry = document.getElementById('with-country').value;
  const minVote = document.getElementById('min-vote').value;

  const movieResults = document.getElementById('movie-results');
  const tvResults = document.getElementById('tv-results');
  const movieTitle = document.getElementById('movie-title');
  const tvTitle = document.getElementById('tv-title');

  showLoading();

  try {
    // ساخت URLها بر اساس نوع محتوا
    let movieUrl = contentType !== 'tv' ? `https://api.themoviedb.org/3/discover/movie?api_key=${apiKey}&language=${language}&sort_by=vote_average.desc` : null;
    let tvUrl = contentType !== 'movie' ? `https://api.themoviedb.org/3/discover/tv?api_key=${apiKey}&language=${language}&sort_by=vote_average.desc` : null;

    // اعمال فیلترها
    const applyFilters = (url) => {
      if (withGenres) url += `&with_genres=${withGenres}`;
      if (withoutGenres) url += `&without_genres=${withoutGenres}`;
      if (withCountry) url += `&with_origin_country=${withCountry}`;
      if (minVote) url += `&vote_average.gte=${minVote}`;
      return url;
    };

    if (movieUrl) movieUrl = applyFilters(movieUrl);
    if (tvUrl) tvUrl = applyFilters(tvUrl);

    // دریافت داده‌ها
    const fetchData = async (url) => {
      if (!url) return { results: [] };
      const res = await fetch(url);
      if (!res.ok) throw new Error(`خطای سرور: ${res.status}`);
      return res.json();
    };

    const [movieRes, tvRes] = await Promise.all([
      fetchData(movieUrl),
      fetchData(tvUrl)
    ]);

    const movies = movieRes.results || [];
    const tvSeries = tvRes.results || [];

    movieResults.innerHTML = '';
    tvResults.innerHTML = '';
    movieTitle.textContent = contentType !== 'tv' ? 'نتایج جستجو فیلم' : 'نتایج جستجو فیلم (غیرفعال)';
    tvTitle.textContent = contentType !== 'movie' ? 'نتایج جستجو سریال' : 'نتایج جستجو سریال (غیرفعال)';

    const seenIds = new Set();

    // رندر سریال‌ها
    if (tvSeries.length > 0 && contentType !== 'movie') {
      for (const tv of tvSeries) {
        if (seenIds.has(tv.id)) continue;
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
    } else if (contentType !== 'movie') {
      tvResults.innerHTML = '<p class="text-center text-red-500">سریالی یافت نشد!</p>';
    }

    // رندر فیلم‌ها
    if (movies.length > 0 && contentType !== 'tv') {
      for (const movie of movies) {
        if (seenIds.has(movie.id)) continue;
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
    } else if (contentType !== 'tv') {
      movieResults.innerHTML = '<p class="text-center text-red-500">فیلمی یافت نشد!</p>';
    }
  } catch (error) {
    console.error('خطا در جستجوی پیشرفته:', error);
    movieResults.innerHTML = contentType !== 'tv' ? '<p class="text-center text-red-500">خطایی رخ داد!</p>' : '';
    tvResults.innerHTML = contentType !== 'movie' ? '<p class="text-center text-red-500">خطایی رخ داد!</p>' : '';
  } finally {
    hideLoading();
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  await initializeSwitcher();
  const searchButton = document.getElementById('advanced-search-button');

  if (searchButton) {
    searchButton.addEventListener('click', advancedSearch);
  } else {
    console.error('دکمه جستجو پیدا نشد!');
  }
});