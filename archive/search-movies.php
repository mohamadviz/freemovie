<?php
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: *");

$apiKey = '1dc4cbf81f0accf4fa108820d551dafc'; // Replace if invalid
$language = 'fa-IR';
$defaultPoster = "https://via.placeholder.com/500x750?text=No+Image"; // Default image URL

$query = isset($_GET['query']) ? trim($_GET['query']) : '';
if (empty($query)) {
    echo json_encode(['success' => false, 'error' => 'کوئری جستجو ارائه نشده است!'], JSON_UNESCAPED_UNICODE);
    exit;
}

// Define API endpoints
$movieSearchUrl = "https://api.themoviedb.org/3/search/movie?api_key={$apiKey}&language={$language}&query=" . urlencode($query);
$tvSearchUrl = "https://api.themoviedb.org/3/search/tv?api_key={$apiKey}&language={$language}&query=" . urlencode($query);

// Fetch data from both endpoints
$movieData = @file_get_contents($movieSearchUrl);
$tvData = @file_get_contents($tvSearchUrl);

if ($movieData === false && $tvData === false) {
    echo json_encode(['success' => false, 'results' => [], 'error' => 'خطا در ارتباط با API'], JSON_UNESCAPED_UNICODE);
    exit;
}

// Decode JSON responses
$movieData = $movieData ? json_decode($movieData, true) : ['results' => []];
$tvData = $tvData ? json_decode($tvData, true) : ['results' => []];

// Check if results exist
if (empty($movieData['results']) && empty($tvData['results'])) {
    echo json_encode(['success' => false, 'results' => [], 'error' => 'نتیجه‌ای یافت نشد'], JSON_UNESCAPED_UNICODE);
    exit;
}

// Function to download and store poster images
function downloadImage($imagePath, $defaultPoster) {
    $imageUrl = "https://image.tmdb.org/t/p/w500" . $imagePath;
    $localPath = "images/poster_" . basename($imagePath);
    
    if (!is_dir('images')) {
        mkdir('images', 0755, true);
    }
    
    $imageData = @file_get_contents($imageUrl);
    if ($imageData !== false && file_put_contents($localPath, $imageData) !== false) {
        return "https://freemoviez.ir/api/{$localPath}";
    }
    return $imageUrl; // Fallback to TMDb URL if download fails
}

// Process and merge results with TV shows prioritized
$results = [];

// Process TV show results first (higher priority)
foreach ($tvData['results'] as $tv) {
    $year = isset($tv['first_air_date']) ? substr($tv['first_air_date'], 0, 4) : "نامشخص";
    $posterPath = isset($tv['poster_path']) ? $tv['poster_path'] : null;
    $poster = $posterPath ? downloadImage($posterPath, $defaultPoster) : $defaultPoster;

    $results[] = [
        'title' => $tv['name'] ?? 'نامشخص',
        'year' => $year,
        'imdbID' => $tv['id'],
        'type' => 'tv',
        'poster' => $poster
    ];
}

// Process movie results after TV shows
foreach ($movieData['results'] as $movie) {
    $year = isset($movie['release_date']) ? substr($movie['release_date'], 0, 4) : "نامشخص";
    $posterPath = isset($movie['poster_path']) ? $movie['poster_path'] : null;
    $poster = $posterPath ? downloadImage($posterPath, $defaultPoster) : $defaultPoster;

    $results[] = [
        'title' => $movie['title'] ?? 'نامشخص',
        'year' => $year,
        'imdbID' => $movie['id'],
        'type' => 'movie',
        'poster' => $poster
    ];
}

echo json_encode(['success' => true, 'results' => $results], JSON_UNESCAPED_UNICODE);
?>