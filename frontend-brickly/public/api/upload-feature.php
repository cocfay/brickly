<?php
/**
 * Endpoint para subir imagen de feature (asociados/partners).
 * Recibe un archivo multipart/form-data y lo guarda en:
 *   uploads/features/
 * 
 * El nombre del archivo se genera como: {name}_{dd_mm_YYYY}.webp
 * 
 * Uso: POST /api/upload-feature
 * Body: form-data con campos "file", "name" y opcionalmente "token"
 * 
 * Respuesta: JSON { success: true, path: "/ruta/al/archivo.webp" }
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
                error_log('Turnstile verification failed for feature upload: ' . json_encode($verifyData));
            }
        }
    }

    // Validar que se recibió un archivo
    if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
        $errorCode = $_FILES['file']['error'] ?? -1;
        throw new Exception("Error al recibir el archivo (código: $errorCode)");
    }

    $file = $_FILES['file'];

    // Validar tamaño máximo 1.8MB
    $maxSize = 1.8 * 1024 * 1024;
    if ($file['size'] > $maxSize) {
        throw new Exception('La imagen es demasiado grande. El tamaño máximo es 1.8MB.');
    }

    // Validar que sea imagen
    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    $mimeType = finfo_file($finfo, $file['tmp_name']);
    finfo_close($finfo);

    $allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!in_array($mimeType, $allowedTypes)) {
        throw new Exception('Solo se permiten imágenes.');
    }

    // --- OBTENER NOMBRE ---
    $rawName = $_POST['name'] ?? 'feature';
    // Reemplazar espacios por guiones bajos y eliminar caracteres especiales
    $safeName = preg_replace('/[^a-zA-Z0-9_\-]/', '', str_replace(' ', '_', $rawName));
    if (empty($safeName)) $safeName = 'feature';

    // Fecha actual en formato dd_mm_YYYY
    $dateStr = date('d_m_Y');

    $fileName = $safeName . '_' . $dateStr . '.webp';

    // --- DETERMINAR RUTA DE DESTINO ---
    $scriptFile = $_SERVER['SCRIPT_FILENAME'];
    $scriptDir  = dirname($scriptFile);
    $parentDir  = dirname($scriptDir);
    
    $featureDir = $parentDir . '/uploads/features';
    
    // Si no existe, intentar con DOCUMENT_ROOT
    if (!is_dir($featureDir)) {
        $altDir = $_SERVER['DOCUMENT_ROOT'] . '/uploads/features';
        if (is_dir(dirname($altDir)) || mkdir(dirname($altDir), 0755, true)) {
            $featureDir = $altDir;
        }
    }

    // Debug info
    $debugInfo = [
        'script_file' => $scriptFile,
        'script_dir' => $scriptDir,
        'parent_dir' => $parentDir,
        'feature_dir' => $featureDir,
        'doc_root' => $_SERVER['DOCUMENT_ROOT'] ?? 'N/A',
    ];

    // Crear directorio si no existe
    if (!is_dir($featureDir)) {
        if (!mkdir($featureDir, 0755, true)) {
            throw new Exception('No se pudo crear el directorio: ' . $featureDir);
        }
    }

    // Verificar permisos de escritura
    if (!is_writable($featureDir)) {
        throw new Exception('Directorio sin permisos de escritura: ' . $featureDir);
    }

    $filePath = $featureDir . '/' . $fileName;

    // --- GUARDAR ARCHIVO ---
    $saved = false;

    if ($mimeType === 'image/webp') {
        // Si ya es webp, moverlo directamente
        if (move_uploaded_file($file['tmp_name'], $filePath)) {
            $saved = true;
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
        }
    }

    if (!$saved) {
        throw new Exception('No se pudo guardar el archivo en: ' . $filePath);
    }

    // Verificar que el archivo existe y tiene contenido
    if (!file_exists($filePath) || filesize($filePath) === 0) {
        throw new Exception('El archivo está vacío o no existe: ' . $filePath);
    }

    $publicPath = '/uploads/features/' . $fileName;

    echo json_encode([
        'success' => true,
        'path' => $publicPath,
        '_debug' => $debugInfo
    ]);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'error' => $e->getMessage(),
        '_debug' => $debugInfo ?? []
    ]);
}
