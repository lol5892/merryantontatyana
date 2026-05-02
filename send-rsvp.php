<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'message' => 'Method Not Allowed']);
    exit;
}

function loadEnv(string $filePath): array
{
    if (!is_file($filePath)) {
        return [];
    }

    $env = [];
    $lines = file($filePath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    if ($lines === false) {
        return [];
    }

    foreach ($lines as $line) {
        $trimmed = trim($line);
        if ($trimmed === '' || str_starts_with($trimmed, '#') || !str_contains($trimmed, '=')) {
            continue;
        }

        [$key, $value] = explode('=', $trimmed, 2);
        $env[trim($key)] = trim_env_value($value);
    }

    return $env;
}

function trim_env_value(string $value): string
{
    $v = trim($value);
    $len = strlen($v);
    if ($len >= 2) {
        $f = $v[0];
        $l = $v[$len - 1];
        if (($f === '"' && $l === '"') || ($f === "'" && $l === "'")) {
            return substr($v, 1, -1);
        }
    }

    return $v;
}

function readJsonInput(): array
{
    $raw = file_get_contents('php://input');
    if ($raw === false || $raw === '') {
        return [];
    }

    $decoded = json_decode($raw, true);
    if (!is_array($decoded)) {
        return [];
    }

    return $decoded;
}

$env = loadEnv(__DIR__ . DIRECTORY_SEPARATOR . '.env');
$botToken = $env['TELEGRAM_BOT_TOKEN'] ?? getenv('TELEGRAM_BOT_TOKEN') ?: '';
$chatId = $env['TELEGRAM_CHAT_ID'] ?? getenv('TELEGRAM_CHAT_ID') ?: '';

if ($botToken === '' || $chatId === '') {
    http_response_code(500);
    echo json_encode(['ok' => false, 'message' => 'Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID']);
    exit;
}

$payload = readJsonInput();
$name = trim((string)($payload['name'] ?? 'Гость'));
$attendance = (string)($payload['attendance'] ?? '');
$comment = trim((string)($payload['comment'] ?? ''));
$source = trim((string)($payload['source'] ?? 'website'));
$submittedAt = trim((string)($payload['submittedAt'] ?? gmdate('c')));

$attendanceLabel = 'Не указано';
if ($attendance === 'yes') {
    $attendanceLabel = 'Да, буду';
} elseif ($attendance === 'no') {
    $attendanceLabel = 'Не смогу';
}

$text = implode("\n", [
    'Новый RSVP с сайта',
    'Имя: ' . ($name !== '' ? $name : 'Гость'),
    'Присутствие: ' . $attendanceLabel,
    'Комментарий: ' . ($comment !== '' ? $comment : '-'),
    'Источник: ' . ($source !== '' ? $source : 'website'),
    'Время: ' . $submittedAt,
]);

$tgUrl = 'https://api.telegram.org/bot' . $botToken . '/sendMessage';
$tgBody = json_encode([
    'chat_id' => $chatId,
    'text' => $text,
], JSON_UNESCAPED_UNICODE);

if ($tgBody === false) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'message' => 'Failed to encode Telegram payload']);
    exit;
}

$ch = curl_init($tgUrl);
curl_setopt_array($ch, [
    CURLOPT_POST => true,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
    CURLOPT_POSTFIELDS => $tgBody,
    CURLOPT_TIMEOUT => 12,
]);

$tgResponse = curl_exec($ch);
$curlError = curl_error($ch);
$httpCode = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($tgResponse === false || $httpCode < 200 || $httpCode >= 300) {
    http_response_code(502);
    echo json_encode([
        'ok' => false,
        'message' => 'Telegram request failed',
        'details' => $curlError !== '' ? $curlError : $tgResponse,
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

$tgJson = json_decode((string) $tgResponse, true);
if (!is_array($tgJson) || empty($tgJson['ok'])) {
    $detail = is_array($tgJson) && isset($tgJson['description']) ? (string) $tgJson['description'] : (string) $tgResponse;
    http_response_code(502);
    echo json_encode([
        'ok' => false,
        'message' => 'Telegram request failed',
        'details' => $detail,
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

http_response_code(200);
echo json_encode(['ok' => true]);
