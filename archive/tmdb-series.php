<?php
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: *");

$apiKey = '1dc4cbf81f0accf4fa108820d551dafc'; // TMDb API key
$language = 'fa-IR'; // Language for API response
$defaultPoster = "https://via.placeholder.com/500x750?text=No+Image"; // Default poster URL
$defaultBackdrop = "https://via.placeholder.com/1920x1080?text=No+Image"; // Default backdrop URL

// Get series ID from URL parameter
$id = isset($_GET['id']) ? trim($_GET['id']) : '';
if (empty($id)) {
    echo json_encode(['success' => false, 'error' => 'شناسه سریال ارائه نشده است!'], JSON_UNESCAPED_UNICODE);
    exit;
}

// Define API endpoint for series details with external_ids
$seriesDetailsUrl = "https://api.themoviedb.org/3/tv/{$id}?api_key={$apiKey}&language={$language}&append_to_response=external_ids";

// Fetch series data
$seriesData = @file_get_contents($seriesDetailsUrl);

if ($seriesData === false) {
    echo json_encode(['success' => false, 'error' => 'خطا در ارتباط با API'], JSON_UNESCAPED_UNICODE);
    exit;
}

// Decode JSON response
$seriesData = json_decode($seriesData, true);

if (empty($seriesData) || (isset($seriesData['success']) && $seriesData['success'] === false)) {
    echo json_encode(['success' => false, 'error' => 'سریال با این شناسه یافت نشد'], JSON_UNESCAPED_UNICODE);
    exit;
}

// Function to download and store images
function downloadImage($imagePath, $defaultImage, $type = 'poster') {
    $size = $type === 'poster' ? 'w500' : 'w1280';
    $imageUrl = "https://image.tmdb.org/t/p/{$size}" . $imagePath;
    $localPath = "images/{$type}_" . basename($imagePath);
    
    if (!is_dir('images')) {
        mkdir('images', 0755, true);
    }
    
    $imageData = @file_get_contents($imageUrl);
    if ($imageData !== false && file_put_contents($localPath, $imageData) !== false) {
        return "https://freemoviez.ir/api/{$localPath}";
    }
    return $imageUrl; // Fallback to TMDb URL if download fails
}

// Process series data
$year = isset($seriesData['first_air_date']) ? substr($seriesData['first_air_date'], 0, 4) : "نامشخص";
$posterPath = isset($seriesData['poster_path']) ? $seriesData['poster_path'] : null;
$backdropPath = isset($seriesData['backdrop_path']) ? $seriesData['backdrop_path'] : null;
$poster = $posterPath ? downloadImage($posterPath, $defaultPoster, 'poster') : $defaultPoster;
$backdrop = $backdropPath ? downloadImage($backdropPath, $defaultBackdrop, 'backdrop') : $defaultBackdrop;

// Extract trailer from videos response (if available, though not included in this endpoint)
$trailer = '';
if (!empty($seriesData['videos']['results'])) {
    foreach ($seriesData['videos']['results'] as $video) {
        if (strtolower($video['type']) === 'trailer' && $video['site'] === 'YouTube') {
            $trailer = "https://www.youtube.com/embed/{$video['key']}";
            break;
        }
    }
}

// Extract IMDb ID and number of seasons
$imdbId = isset($seriesData['external_ids']['imdb_id']) ? $seriesData['external_ids']['imdb_id'] : '';
$numberOfSeasons = isset($seriesData['number_of_seasons']) ? (int)$seriesData['number_of_seasons'] : 0;

if (empty($imdbId)) {
    echo json_encode(['success' => false, 'error' => 'شناسه IMDb یافت نشد'], JSON_UNESCAPED_UNICODE);
    exit;
}

// Generate download links for each season and quality
$downloadLinks = [];
for ($season = 1; $season <= $numberOfSeasons; $season++) {
    $downloadLinks[$season] = [];
    for ($quality = 1; $quality <= 4; $quality++) {
        $downloadLinks[$season]["quality_{$quality}"] = "https://subtitle.saymyname.website/DL/filmgir/?i={$imdbId}&f={$season}&q={$quality}";
    }
}

// Compile response
$response = [
    'success' => true,
    'title' => $seriesData['name'] ?? 'نامشخص',
    'overview' => $seriesData['overview'] ?? 'خلاصه‌ای در دسترس نیست',
    'genre' => !empty($seriesData['genres']) ? implode(', ', array_column($seriesData['genres'], 'name')) : 'نامشخص',
    'year' => $year,
    'rating' => isset($seriesData['vote_average']) ? number_format($seriesData['vote_average'], 1) : 'نامشخص',
    'poster' => $poster,
    'backdrop' => $backdrop,
    'trailer' => $trailer,
    'download_links' => $downloadLinks,
    'numberOfSeasons' => $numberOfSeasons,
    'imdb_id' => $imdbId
];

echo json_encode($response, JSON_UNESCAPED_UNICODE);
?>