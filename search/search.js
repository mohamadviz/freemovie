const serverUrl = "https://freemoviez.ir/api/search-movies.php"; // Server endpoint for search

async function searchMovies(query) {
  try {
    const url = `${serverUrl}?query=${encodeURIComponent(query)}`;
    const res = await fetch(url);
    const data = await res.json();
    const results = document.getElementById("results");
    results.innerHTML = "";

    // Debugging: Log the received data to the console
    console.log("Server response:", data);

    if (data.success && data.results.length > 0) {
      data.results.forEach((movie) => {
        const poster = movie.poster || "https://via.placeholder.com/500x750?text=No+Image";
        const movieId = movie.imdbID; // TMDb ID, no "tt" prefix to remove

        results.innerHTML += `
          <div class="group relative">
            <img src="${poster}" alt="${movie.title}" class="w-full h-auto rounded-lg shadow-lg">
            <div class="absolute inset-0 bg-black bg-opacity-75 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-center items-center text-center p-4">
              <h3 class="text-lg font-bold">${movie.title}</h3>
              <p class="text-sm">${movie.year}</p>
              <a href="${
                movie.type === "series" ? "../series/index.html" : "../movie/index.html"
              }?id=${movieId}" class="mt-2 bg-blue-500 text-white px-4 py-2 rounded">مشاهده</a>
            </div>
          </div>
        `;
      });
    } else {
      results.innerHTML = '<p class="text-center text-red-500">نتیجه‌ای یافت نشد!</p>';
    }
  } catch (error) {
    console.error("خطا در دریافت اطلاعات:", error);
    results.innerHTML = '<p class="text-center text-red-500">خطایی رخ داد!</p>';
  }
}

document.getElementById("search").addEventListener(
  "input",
  debounce(function () {
    const query = this.value;
    if (query.length > 2) {
      searchMovies(query);
    } else {
      document.getElementById("results").innerHTML = "";
    }
  }, 300)
);

function debounce(func, wait) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

document.getElementById("theme-toggle").addEventListener("click", () => {
  document.documentElement.classList.toggle("dark");
  const icon = document.querySelector("#theme-toggle i");
  icon.classList.toggle("fa-sun");
  icon.classList.toggle("fa-moon");
});

document.getElementById("menu-toggle").addEventListener("click", () => {
  document.getElementById("mobile-menu").classList.toggle("hidden");
});