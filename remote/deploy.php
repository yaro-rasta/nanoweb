<?php
require_once 'config.php';

switch ($_SERVER['REQUEST_METHOD']) {
    case 'POST':
        handlePostRequest();
        break;
    case 'PUT':
        handlePutRequest();
        break;
    case 'DELETE':
        handleDeleteRequest();
        break;

    default:
        http_response_code(405); // Method Not Allowed
        break;
}

function json_dump($data, $withHeader = false) {
    if ($withHeader) {
        header('Content-Type: application/json');
    }
    echo json_encode($data);
}

function listFiles($dir, $ignorePatterns = [], $baseDir = null) {
    if (null === $baseDir) {
        $baseDir = $dir;
    }
    $files = [];
    $items = scandir($dir);

    foreach ($items as $item) {
        if ($item === '.' || $item === '..') {
            continue;
        }
        $shouldIgnore = false;
        foreach ($ignorePatterns as $pattern) {
            if (preg_match($pattern, $item)) {
                $shouldIgnore = true;
                break;
            }
        }
        if ($shouldIgnore) {
            continue;
        }

        $fullPath = $dir . DIRECTORY_SEPARATOR . $item;

        if (is_dir($fullPath)) {
            $files = array_merge($files, listFiles($fullPath, $ignorePatterns, $baseDir));
        } elseif (is_file($fullPath)) {
            $files[] = substr($fullPath, strlen($baseDir) + 1);
        }
    }

    return $files;
}

function handlePostRequest() {
    if (!validate_authorization()) {
        http_response_code(401); // Unauthorized
        return;
    }

    $postData = json_decode(file_get_contents('php://input'), true);
    if (!isset($postData['files'])) {
        http_response_code(400);
        json_dump($postData, true);
        return;
    }
    $filesToUpdate = [];
    $filesToRemove = [];
    $ignoreFiles = [
        '/^\./',
        '/\.php$/'
    ];

    foreach ($postData['files'] as $file) {
        $filePath = $_SERVER['DOCUMENT_ROOT'] . '/' . ltrim($file['path'], '/');
        $info = (object) [
            'name' => $file['name'],
            'path' => $file['path'], 
            'hash' => null,
            'size' => null,
        ];
        if (file_exists($filePath)) {
            $size = filesize($filePath);
            $info->size = $size;
            if ($size === $file['size']) {
                $info->hash = hash_file('md5', $filePath);
            }
        }
        $filesToUpdate[$file['path']] = $info;
    }

    // Check for files to remove
    $allFiles = listFiles($_SERVER['DOCUMENT_ROOT'], $ignoreFiles);
    foreach ($allFiles as $file) {
        // Check if file needs to be removed
        if (!array_key_exists($file, $filesToUpdate)) {
            $filesToRemove[] = $file;
        }
    }

    json_dump(['filesToUpdate' => array_values($filesToUpdate), 'filesToRemove' => $filesToRemove], true);
}

function handlePutRequest() {
    if (!validate_authorization()) {
        http_response_code(401); // Unauthorized
        return;
    }

    $zipFile = rtrim($_SERVER['DOCUMENT_ROOT'], '/') . '/dist.zip';
    $rawData = file_get_contents('php://input');
    file_put_contents($zipFile, $rawData);

    // Assuming filesToRemove and dist.zip are sent as form-data
    $filesToRemove = isset($_POST['filesToRemove']) ? json_decode($_POST['filesToRemove'], true) : [];

    // Remove filesToRemove
    foreach ($filesToRemove as $file) {
        $fileToRemove = $_SERVER['DOCUMENT_ROOT'] . '/' . ltrim($file, '/');
        if (file_exists($fileToRemove)) {
            unlink($fileToRemove);
        }
    }

    $response = (object) [
        'zip'     => $zipFile,
        'removed' => $filesToRemove,
    ];

    // Unzip and update files
    $zip = new ZipArchive();
    if ($zip->open($zipFile) === TRUE) {
        $zip->extractTo($_SERVER['DOCUMENT_ROOT']);
        $zip->close();
        // Remove the zip file after extraction
        if (unlink($zipFile)) {
            http_response_code(201);
            $response->message = 'Extraction and file removal successful';
        } else {
            http_response_code(204);
            $response->message = 'Extraction successful, but failed to remove zip file';
        }
    } else {
        http_response_code(500); // Internal Server Error
        $response->message = 'Failed to extract';
    }
    json_dump($response, true);
}

function handleDeleteRequest() {
    if (!validate_authorization()) {
        http_response_code(401); // Unauthorized
        return;
    }
    if (!isset($_GET['file'])) {

    }
    if (!isset($_GET['file'])) {
        http_response_code(400);
        json_dump('File is not provided', true);
        return;
    }
    $fileToRemove = null;
    $ignoreFiles = [
        '/^\./',
        '/\.php$/'
    ];

    $file = $_GET['file'];
    $shouldIgnore = false;
    foreach ($ignoreFiles as $pattern) {
        if (preg_match($pattern, $file)) {
            $shouldIgnore = true;
            break;
        }
    }
    if (!$shouldIgnore) {
        $filePath = rtrim($_SERVER['DOCUMENT_ROOT'], '/') . '/' . ltrim($file, '/');
        $fileToRemove = $filePath;
        unlink($filePath);
    }

    json_dump(['fileRemoved' => $fileToRemove], true);
}

function validate_authorization() {
    // Validate API keys or tokens
    $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';

    if (strpos($authHeader, 'Bearer ') === 0) {
        return substr($authHeader, 7) === AUTH_KEY;
    }

    return false; // Invalid or missing header
}
