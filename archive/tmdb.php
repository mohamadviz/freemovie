<?php
header("Content-Type: application/json; charset=UTF-8"); // تعیین نوع محتوا به عنوان JSON با کدگذاری UTF-8
header("Access-Control-Allow-Origin: *"); // ارسال هدر CORS برای اجازه دادن به تمام دامنه‌ها

$apiKey = '1dc4cbf81f0accf4fa108820d551dafc'; // کلید API شما
$language = 'fa'; // زبان تنظیم شده به فارسی
$defaultPoster = "https://via.placeholder.com/500x750?text=No+Image"; // تصویر پیش‌فرض برای موارد بدون پوستر

// تعریف آدرس‌های API
$apiUrls = [
    'popular' => "https://api.themoviedb.org/3/discover/movie?api_key={$apiKey}&language={$language}",
    'now_playing' => "https://api.themoviedb.org/3/trending/movie/week?api_key={$apiKey}&language={$language}",
    'tv_trending' => "https://api.themoviedb.org/3/trending/tv/week?api_key={$apiKey}&language={$language}"
];

// دریافت مقدار type از URL (GET request)
$type = isset($_GET['type']) ? $_GET['type'] : '';

// بررسی اینکه آیا type وارد شده معتبر است یا خیر
if (!in_array($type, ['popular', 'now_playing'])) {
    echo json_encode(['error' => 'Invalid type parameter.'], JSON_UNESCAPED_UNICODE);
    exit;
}

// ارسال درخواست‌ها به API
$movieResponse = @file_get_contents($apiUrls[$type]); // درخواست برای فیلم‌ها
$tvResponse = @file_get_contents($apiUrls['tv_trending']); // درخواست برای سریال‌ها

// بررسی خطا در هر دو درخواست
if ($movieResponse === false && $tvResponse === false) {
    echo json_encode(['error' => 'Failed to connect to both movie and TV APIs.'], JSON_UNESCAPED_UNICODE);
    exit;
}

// تبدیل پاسخ‌های JSON به آرایه PHP
$movieData = $movieResponse ? json_decode($movieResponse, true) : ['results' => []];
$tvData = $tvResponse ? json_decode($tvResponse, true) : ['results' => []];

// بررسی وجود نتایج
if (empty($movieData['results']) && empty($tvData['results'])) {
    echo json_encode(['error' => 'No results found from either movie or TV APIs.'], JSON_UNESCAPED_UNICODE);
    exit;
}

// ایجاد پوشه images اگر وجود ندارد
if (!is_dir('images')) {
    mkdir('images', 0755, true);
}

// تابع برای دانلود و ذخیره تصاویر
function downloadImage($imagePath, $type, $defaultPoster) {
    $imageUrl = "https://image.tmdb.org/t/p/w500" . $imagePath;
    $localPath = "images/{$type}" . basename($imagePath);
    
    $imageData = @file_get_contents($imageUrl);
    if ($imageData === false) {
        error_log("خطا در دانلود تصویر: $imageUrl"); // لاگ خطا
        return $defaultPoster; // بازگشت به تصویر پیش‌فرض در صورت خطا
    }

    if (file_put_contents($localPath, $imageData) === false) {
        error_log("خطا در ذخیره تصویر: $localPath"); // لاگ خطا
        return $defaultPoster; // بازگشت به تصویر پیش‌فرض در صورت خطا
    }

    return "https://freemoviez.ir/api/{$localPath}"; // بازگشت URL محلی تصویر
}

// پردازش و یکپارچه‌سازی نتایج
$results = [];

// پردازش نتایج فیلم‌ها
foreach ($movieData['results'] as $movie) {
    $posterPath = !empty($movie['poster_path']) ? downloadImage($movie['poster_path'], 'poster_', $defaultPoster) : $defaultPoster;
    $backdropPath = !empty($movie['backdrop_path']) ? downloadImage($movie['backdrop_path'], 'backdrop_', $defaultPoster) : null;

    $results[] = [
        'id' => $movie['id'],
        'title' => $movie['title'] ?? 'نامشخص',
        'overview' => $movie['overview'] ?? '',
        'poster_path' => $posterPath,
        'backdrop_path' => $backdropPath,
        'release_date' => $movie['release_date'] ?? '',
        'type' => 'movie'
    ];
}

// پردازش نتایج سریال‌ها
foreach ($tvData['results'] as $tv) {
    $posterPath = !empty($tv['poster_path']) ? downloadImage($tv['poster_path'], 'poster_', $defaultPoster) : $defaultPoster;
    $backdropPath = !empty($tv['backdrop_path']) ? downloadImage($tv['backdrop_path'], 'backdrop_', $defaultPoster) : null;

    $results[] = [
        'id' => $tv['id'],
        'title' => $tv['name'] ?? 'نامشخص', // استفاده از 'name' برای سریال‌ها
        'overview' => $tv['overview'] ?? '',
        'poster_path' => $posterPath,
        'backdrop_path' => $backdropPath,
        'release_date' => $tv['first_air_date'] ?? '', // استفاده از 'first_air_date' برای سریال‌ها
        'type' => 'tv'
    ];
}

// ارسال داده‌ها به کاربر
echo json_encode(['results' => $results], JSON_UNESCAPED_UNICODE); // ارسال نتایج یکپارچه
?>