<?php
header("Content-Type: application/json"); // تعیین نوع محتوا به عنوان JSON

// ارسال هدر CORS برای اجازه دادن به تمام دامنه‌ها
header("Access-Control-Allow-Origin: *");

$apiKey = '1dc4cbf81f0accf4fa108820d551dafc'; // کلید API شما
$language = 'fa-IR'; // زبان فارسی

// دریافت شناسه فیلم از پارامتر GET
$movieId = isset($_GET['id']) ? $_GET['id'] : '';

// بررسی اینکه آیا شناسه فیلم وجود دارد یا خیر
if (empty($movieId)) {
    echo json_encode(['error' => 'شناسه فیلم در URL وجود ندارد!']);
    exit;
}

// URL‌های API برای دریافت اطلاعات فیلم
$movieUrl = "https://api.themoviedb.org/3/movie/{$movieId}?api_key={$apiKey}&language={$language}";
$externalIdsUrl = "https://api.themoviedb.org/3/movie/{$movieId}/external_ids?api_key={$apiKey}";
$trailerUrl = "https://api.themoviedb.org/3/movie/{$movieId}/videos?api_key={$apiKey}";

// دریافت اطلاعات فیلم
$movieData = json_decode(file_get_contents($movieUrl), true);
$externalIdsData = json_decode(file_get_contents($externalIdsUrl), true);
$trailerData = json_decode(file_get_contents($trailerUrl), true);

// پردازش اطلاعات فیلم
$imdbID = isset($externalIdsData['imdb_id']) ? str_replace("tt", "", $externalIdsData['imdb_id']) : "";
$year = isset($movieData['release_date']) ? explode("-", $movieData['release_date'])[0] : "نامشخص";

$response = [
    'title' => $movieData['title'] ?? 'نامشخص',
    'overview' => $movieData['overview'] ?? 'خلاصه‌ای در دسترس نیست.',
    'genre' => isset($movieData['genres']) ? implode(", ", array_column($movieData['genres'], 'name')) : 'نامشخص',
    'year' => $year,
    'rating' => $movieData['vote_average'] ?? 'بدون امتیاز',
    'poster' => isset($movieData['poster_path']) ? 'https://freemoviez.ir/api/images/poster_' . ltrim($movieData['poster_path'], '/') : "https://via.placeholder.com/500",
    'backdrop' => isset($movieData['backdrop_path']) ? 'https://freemoviez.ir/api/images/backdrop_' . ltrim($movieData['backdrop_path'], '/') : "https://via.placeholder.com/1920x1080",
    'trailer' => isset($trailerData['results'][0]['key']) ? "https://www.youtube.com/embed/{$trailerData['results'][0]['key']}" : null,
    'download_links' => [
        'primary' => "https://berlin.saymyname.website/Movies/{$year}/{$imdbID}",
        'secondary' => "https://tokyo.saymyname.website/Movies/{$year}/{$imdbID}",
        'tertiary' => "https://nairobi.saymyname.website/Movies/{$year}/{$imdbID}"
    ]
];

// ایجاد پوشه images اگر وجود ندارد
if (!is_dir('images')) {
    mkdir('images', 0755, true);
}

// ذخیره عکس‌ها در سرور
function downloadImage($imagePath, $type) {
    $imageUrl = "https://image.tmdb.org/t/p/w500$imagePath"; // URL تصویر
    $imageData = @file_get_contents($imageUrl);

    if ($imageData === false) {
        error_log("خطا در دانلود تصویر: $imageUrl"); // لاگ خطا
        return null;
    }

    $imagePath = "images/$type" . basename($imagePath); // مسیر ذخیره‌سازی تصویر
    if (file_put_contents($imagePath, $imageData) === false) {
        error_log("خطا در ذخیره تصویر: $imagePath"); // لاگ خطا
        return null;
    }

    return $imagePath;
}

// ذخیره عکس‌ها برای فیلم
if (isset($movieData['poster_path'])) {
    $posterPath = downloadImage($movieData['poster_path'], 'poster_');
}
if (isset($movieData['backdrop_path'])) {
    $backdropPath = downloadImage($movieData['backdrop_path'], 'backdrop_');
    
}

// ارسال داده‌ها به سمت کاربر
echo json_encode($response);
?>