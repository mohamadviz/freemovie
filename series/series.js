// seriesDetails.js
const apiKey = '1dc4cbf81f0accf4fa108820d551dafc'; // TMDb API key
const language = 'fa-IR'; // Language set to Persian (Iran)
const baseImageUrl = 'https://image.tmdb.org/t/p/'; // TMDb base image URL
const defaultPoster = 'https://m4tinbeigi-official.github.io/freemovie/images/default-freemovie-300.png'; // Default poster fallback
const defaultBackdrop = 'https://m4tinbeigi-official.github.io/freemovie/images/default-freemovie-300.png'; // Default backdrop fallback
const seriesId = new URLSearchParams(window.location.search).get('id');

let apiKeySwitcher;

async function initializeSwitcher() {
    apiKeySwitcher = await loadApiKeys(); // استفاده از loadApiKeys سراسری
}

async function getSeriesDetails() {
    try {
        // Check if series ID exists in URL
        if (!seriesId) {
            throw new Error('شناسه سریال در URL وجود ندارد!');
        }

        // Define TMDb API endpoint with external_ids and videos appended
        const seriesDetailsUrl = `https://api.themoviedb.org/3/tv/${seriesId}?api_key=${apiKey}&language=${language}&append_to_response=external_ids,videos`;

        // Fetch series data from TMDb
        const res = await fetch(seriesDetailsUrl);
        if (!res.ok) {
            throw new Error(`خطای سرور: ${res.status}`);
        }
        const seriesData = await res.json();

        // Check if series data is valid
        if (!seriesData || (seriesData.success === false)) {
            throw new Error('سریال با این شناسه یافت نشد');
        }

        // Fetch poster from OMDB using imdb_id
        let poster = defaultPoster;
        const imdbId = seriesData.external_ids && seriesData.external_ids.imdb_id ? seriesData.external_ids.imdb_id : '';
        if (imdbId) {
            const omdbData = await apiKeySwitcher.fetchWithKeySwitch(
                (key) => `https://www.omdbapi.com/?i=${imdbId}&apikey=${key}`
            );
            poster = omdbData.Poster && omdbData.Poster !== 'N/A' ? omdbData.Poster : defaultPoster;
        }

        // Process series data from TMDb
        const title = seriesData.name || 'نامشخص';
        const year = seriesData.first_air_date ? seriesData.first_air_date.substr(0, 4) : 'نامشخص';
        const backdrop = seriesData.backdrop_path ? `${baseImageUrl}w1280${seriesData.backdrop_path}` : defaultBackdrop;
        const numberOfSeasons = seriesData.number_of_seasons || 0;

        // Extract trailer from videos response
        let trailer = '';
        if (seriesData.videos && seriesData.videos.results) {
            const trailerVideo = seriesData.videos.results.find(video => video.type.toLowerCase() === 'trailer' && video.site === 'YouTube');
            if (trailerVideo) {
                trailer = `https://www.youtube.com/embed/${trailerVideo.key}`;
            }
        }

        // Update page content with TMDb data
        const titleElement = document.getElementById('title');
        if (titleElement) titleElement.textContent = title;

        const overviewElement = document.getElementById('overview');
        if (overviewElement) overviewElement.textContent = seriesData.overview || 'خلاصه‌ای در دسترس نیست.';

        const genreElement = document.getElementById('genre');
        if (genreElement) genreElement.innerHTML = `<strong>ژانر:</strong> ${seriesData.genres && seriesData.genres.length > 0 ? seriesData.genres.map(g => g.name).join(', ') : 'نامشخص'}`;

        const yearElement = document.getElementById('year');
        if (yearElement) yearElement.innerHTML = `<strong>سال تولید:</strong> ${year}`;

        const ratingElement = document.getElementById('rating');
        if (ratingElement) ratingElement.innerHTML = `<strong>امتیاز:</strong> ${seriesData.vote_average ? Number(seriesData.vote_average).toFixed(1) : 'نامشخص'}/10`;

        // Update images (poster from OMDB with "300" removal, backdrop from TMDb)
        let posterUrl = poster;
        posterUrl = posterUrl.replace(/300(?=\.jpg$)/i, '');
        const posterElement = document.getElementById('poster');
        if (posterElement) {
            posterElement.src = posterUrl;
            posterElement.alt = `پوستر سریال ${title}`;
        }

        const seriesBgElement = document.getElementById('series-bg');
        if (seriesBgElement) {
            seriesBgElement.style.backgroundImage = `url('${backdrop}')`;
        }

        // Update trailer
        const trailerContainer = document.getElementById('trailer');
        if (trailerContainer) {
            if (trailer) {
                trailerContainer.innerHTML = `<iframe src="${trailer}" title="تریلر سریال ${title}" frameborder="0" allowfullscreen class="w-full h-64 md:h-96 mx-auto"></iframe>`;
            } else {
                trailerContainer.innerHTML = '<p class="text-yellow-500">تریلر در دسترس نیست</p>';
            }
        }

        // Update meta tags and title
        const metaTitleElement = document.getElementById('meta-title');
        if (metaTitleElement) metaTitleElement.textContent = `${title} - فیری مووی`;

        const metaDescription = document.querySelector('meta[name="description"]');
        if (metaDescription) metaDescription.setAttribute('content', `${seriesData.overview || 'جزئیات و دانلود سریال ' + title + ' در فیری مووی.'}`);

        const ogTitle = document.querySelector('meta[property="og:title"]');
        if (ogTitle) ogTitle.setAttribute('content', `${title} - فیری مووی`);

        const ogDescription = document.querySelector('meta[property="og:description"]');
        if (ogDescription) ogDescription.setAttribute('content', seriesData.overview || 'جزئیات و دانلود سریال در فیری مووی.');

        const ogImage = document.querySelector('meta[property="og:image"]');
        if (ogImage) ogImage.setAttribute('content', posterUrl);

        const twitterTitle = document.querySelector('meta[name="twitter:title"]');
        if (twitterTitle) twitterTitle.setAttribute('content', `${title} - فیری مووی`);

        const twitterDescription = document.querySelector('meta[name="twitter:description"]');
        if (twitterDescription) twitterDescription.setAttribute('content', seriesData.overview || 'جزئیات و دانلود سریال در فیری مووی.');

        const twitterImage = document.querySelector('meta[name="twitter:image"]');
        if (twitterImage) twitterImage.setAttribute('content', posterUrl);

        // Update structured data (Schema)
        const schema = {
            '@context': 'https://schema.org',
            '@type': 'TVSeries',
            'name': title,
            'description': seriesData.overview || 'خلاصه‌ای در دسترس نیست.',
            'genre': seriesData.genres && seriesData.genres.length > 0 ? seriesData.genres.map(g => g.name).join(', ') : 'نامشخص',
            'datePublished': year,
            'image': posterUrl,
            'aggregateRating': {
                '@type': 'AggregateRating',
                'ratingValue': seriesData.vote_average ? Number(seriesData.vote_average).toFixed(1) : '0',
                'bestRating': '10',
                'ratingCount': seriesData.vote_count ? seriesData.vote_count.toString() : '1'
            },
            'trailer': {
                '@type': 'VideoObject',
                'embedUrl': trailer || ''
            },
            'numberOfSeasons': numberOfSeasons
        };
        const schemaElement = document.getElementById('series-schema');
        if (schemaElement) schemaElement.textContent = JSON.stringify(schema);

        // Generate download links
        const downloadLinksContainer = document.getElementById('download-links');
        if (downloadLinksContainer) {
            let downloadHtml = '';
            if (imdbId && numberOfSeasons > 0) {
                for (let season = 1; season <= numberOfSeasons; season++) {
                    downloadHtml += `<h3 class="text-xl font-bold mt-4">فصل ${season}</h3>`;
                    for (let quality = 1; quality <= 4; quality++) {
                        const qualityNum = quality; // Assuming quality numbers are 1-4
                        const downloadLink = `https://subtitle.saymyname.website/DL/filmgir/?i=${imdbId}&f=${season}&q=${quality}`;
                        downloadHtml += `
                            <a href="${downloadLink}" class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 mx-2 my-1 inline-block" rel="nofollow">
                                دانلود کیفیت ${qualityNum}
                            </a>`;
                    }
                }
            } else {
                downloadHtml = '<p class="text-yellow-500">لینک‌های دانلود در دسترس نیست</p>';
            }
            downloadLinksContainer.innerHTML = downloadHtml;
        }

        // Add to watchlist functionality
        const watchlistButton = document.getElementById('add-to-watchlist');
        if (watchlistButton) {
            watchlistButton.addEventListener('click', () => {
                let watchlist = JSON.parse(localStorage.getItem('watchlist')) || { movies: [], series: [] };
                const normalizedSeriesId = String(seriesId);
                if (!watchlist.series.includes(normalizedSeriesId)) {
                    watchlist.series.push(normalizedSeriesId);
                    localStorage.setItem('watchlist', JSON.stringify(watchlist));
                    alert('سریال به واچ‌لیست اضافه شد!');
                } else {
                    alert('سریال قبلاً در واچ‌لیست است!');
                }
            });
        }
    } catch (error) {
        console.error('خطا در دریافت اطلاعات:', error);
        const downloadLinksContainer = document.getElementById('download-links');
        if (downloadLinksContainer) {
            downloadLinksContainer.innerHTML = `<p class="text-red-500">خطا در دریافت اطلاعات: ${error.message}</p>`;
        }
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    await initializeSwitcher();
    getSeriesDetails();
});