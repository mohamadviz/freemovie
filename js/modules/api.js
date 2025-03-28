const defaultApiKey = '1dc4cbf81f0accf4fa108820d551dafc';
const baseImageUrl = 'https://image.tmdb.org/t/p/w500';
const defaultPoster = 'https://m4tinbeigi-official.github.io/freemovie/images/default-freemovie-300.png';
const imageCache = {};

const apiUrls = {
    now_playing: `https://api.themoviedb.org/3/trending/movie/week?api_key=${defaultApiKey}&language=fa`,
    tv_trending: `https://api.themoviedb.org/3/trending/tv/week?api_key=${defaultApiKey}&language=fa`
};

export async function getCachedImage(id, fetchFunction) {
    if (imageCache[id] && imageCache[id] !== defaultPoster) {
        return imageCache[id];
    }
    const poster = await fetchFunction();
    if (poster !== defaultPoster) imageCache[id] = poster;
    return poster;
}

export async function fetchData(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`خطای سرور: ${res.status}`);
    return res.json();
}

export { apiUrls, defaultPoster };