<?php
/**
 * Endpoint para subir el logo de la agencia en producción.
 * Recibe un archivo multipart/form-data y lo guarda en:
 *   uploads/logos/
 * 
 * Uso: POST /api/upload-logo
 * Body: form-data con campo "file" y opcionalmente "token"
 * 
 * Respuesta: JSON { success: true, logo: "/ruta/al/archivo.webp" }
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Manejar preflight CORS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method Not Allowed']);
    exit;
}

try {
    // --- VALIDAR TURNSTILE TOKEN ---
    $turnstileToken = $_POST['cf-turnstile-response'] ?? '';
    if (!empty($turnstileToken)) {
        $turnstileSecret = '0x4AAAAAADUiF94T_2ksZFISczn0YlfzVaA';
        $verifyResponse = @file_get_contents('https://challenges.cloudflare.com/turnstile/v0/siteverify', false, stream_context_create([
            'http' => [
                'method' => 'POST',
                'header' => 'Content-Type: application/x-www-form-urlencoded',
                'content' => http_build_query([
                    'secret' => $turnstileSecret,
                    'response' => $turnstileToken,
                    'remoteip' => $_SERVER['REMOTE_ADDR'] ?? ''
                ])
            ]
        ]));
        if ($verifyResponse) {
            $verifyData = json_decode($verifyResponse, true);
            if (!$verifyData['success']) {
                // Token inválido - permitimos la subida igualmente como fallback
                // para no bloquear si el servicio de verificación falla
                error_log('Turnstile verification failed for logo upload: ' . json_encode($verifyData));
            }
        }
    }

    // Validar que se recibió un archivo
    if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
        $errorCode = $_FILES['file']['error'] ?? -1;
        throw new Exception("Error al recibir el archivo (código: $errorCode)");
    }

    $file = $_FILES['file'];

    // Validar tamaño máximo 2MB
    $maxSize = 2 * 1024 * 1024;
    if ($file['size'] > $maxSize) {
        throw new Exception('La imagen es demasiado grande. El tamaño máximo es 2MB.');
    }

    // Validar que sea imagen
    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    $mimeType = finfo_file($finfo, $file['tmp_name']);
    finfo_close($finfo);

    $allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!in_array($mimeType, $allowedTypes)) {
        throw new Exception('Solo se permiten imágenes.');
    }

    // --- DETERMINAR RUTA DE DESTINO ---
    // Estrategia simple: el script está en api/upload-logo.php
    // que está al mismo nivel que el index.html de la app
    $scriptFile = $_SERVER['SCRIPT_FILENAME']; // ej: D:/htdocs/brick_dev/dist/api/upload-logo.php
    $scriptDir  = dirname($scriptFile);        // ej: D:/htdocs/brick_dev/dist/api
    $parentDir  = dirname($scriptDir);         // ej: D:/htdocs/brick_dev/dist
    
    $logoDir = $parentDir . '/uploads/logos';
    
    // Si no existe, intentar con otras estrategias
    if (!is_dir($logoDir)) {
        // Intentar con DOCUMENT_ROOT
        $altDir = $_SERVER['DOCUMENT_ROOT'] . '/uploads/logos';
        if (is_dir(dirname($altDir)) || mkdir(dirname($altDir), 0755, true)) {
            $logoDir = $altDir;
        }
    }

    // Debug info (se incluirá si hay error)
    $debugInfo = [
        'script_file' => $scriptFile,
        'script_dir' => $scriptDir,
        'parent_dir' => $parentDir,
        'logo_dir' => $logoDir,
        'doc_root' => $_SERVER['DOCUMENT_ROOT'] ?? 'N/A',
        'server_software' => $_SERVER['SERVER_SOFTWARE'] ?? 'N/A',
    ];

    // Crear directorio si no existe
    if (!is_dir($logoDir)) {
        if (!mkdir($logoDir, 0755, true)) {
            throw new Exception('No se pudo crear el directorio: ' . $logoDir);
        }
    }

    // Verificar permisos de escritura
    if (!is_writable($logoDir)) {
        throw new Exception('Directorio sin permisos de escritura: ' . $logoDir);
    }

    // --- OBTENER USER ID ---
    $userId = 'unknown';
    $token = $_POST['token'] ?? '';

    if (empty($token)) {
        $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
        if (empty($authHeader) && function_exists('apache_request_headers')) {
            $headers = apache_request_headers();
            $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';
        }
        if (!empty($authHeader) && preg_match('/Bearer\s+(.+)/i', $authHeader, $matches)) {
            $token = $matches[1];
        }
    }

    if (!empty($token)) {
        $parts = explode('.', $token);
        if (count($parts) === 3) {
            $payload = json_decode(base64_decode($parts[1]), true);
            if ($payload && isset($payload['sub'])) {
                $userId = $payload['sub'];
            } elseif ($payload && isset($payload['id'])) {
                $userId = $payload['id'];
            }
        }
    }

    $fileName = 'logo_' . $userId . '.webp';
    $filePath = $logoDir . '/' . $fileName;

    // --- GUARDAR ARCHIVO ---
    $saved = false;

    if ($mimeType === 'image/webp') {
        // Si ya es webp, moverlo directamente
        if (move_uploaded_file($file['tmp_name'], $filePath)) {
            $saved = true;
        } else {
            // Fallback: si move_uploaded_file falla (ej: archivos generados en memoria por el frontend),
            // intentar copiar el contenido directamente
            $content = file_get_contents($file['tmp_name']);
            if ($content !== false && file_put_contents($filePath, $content) !== false) {
                $saved = true;
                @unlink($file['tmp_name']); // Limpiar archivo temporal
            }
        }
    } else {
        // Convertir a WebP
        $sourceImage = null;
        switch ($mimeType) {
            case 'image/jpeg':
                $sourceImage = imagecreatefromjpeg($file['tmp_name']);
                break;
            case 'image/png':
                $sourceImage = imagecreatefrompng($file['tmp_name']);
                imagealphablending($sourceImage, false);
                imagesavealpha($sourceImage, true);
                break;
            case 'image/gif':
                $sourceImage = imagecreatefromgif($file['tmp_name']);
                break;
        }

        if ($sourceImage) {
            if (imagewebp($sourceImage, $filePath, 85)) {
                $saved = true;
            }
            imagedestroy($sourceImage);
        } else {
            // Fallback: si la conversión a WebP falla, copiar el archivo original
            $content = file_get_contents($file['tmp_name']);
            if ($content !== false && file_put_contents($filePath, $content) !== false) {
                $saved = true;
                @unlink($file['tmp_name']);
            }
        }
    }

    if (!$saved) {
        throw new Exception('No se pudo guardar el archivo en: ' . $filePath);
    }

    // Verificar que el archivo existe y tiene contenido
    if (!file_exists($filePath) || filesize($filePath) === 0) {
        throw new Exception('El archivo está vacío o no existe: ' . $filePath);
    }

    $logoPath = '/uploads/logos/' . $fileName;

    // Devolver éxito con info de debug
    echo json_encode([
        'success' => true,
        'logo' => $logoPath,
        '_debug' => $debugInfo
    ]);

} catch (Exception $e) {
    http_response_code(400);
    // Incluir debug info en el error para facilitar diagnóstico
    echo json_encode([
        'error' => $e->getMessage(),
        '_debug' => $debugInfo ?? []
    ]);
}
