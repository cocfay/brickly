<?php
/**
 * Endpoint para subir imágenes de proyectos DIRECTAMENTE a la carpeta del arquitecto.
 * Recibe archivos vía FormData y los guarda en:
 *   uploads/proye_arqui/{userId}/
 *
 * Los nombres de archivo usan projectId para evitar sobrescritura entre proyectos.
 *
 * Uso: POST /api/upload-proyectos-direct.php
 * Body: FormData con:
 *   - userId: string
 *   - projectId: string (opcional, si no se envía usa userId como antes)
 *   - desktop: File (opcional)
 *   - mobile: File (opcional)
 *   - gallery[]: File[] (opcional, múltiples)
 *   - modelId: string (opcional, para fotos de un modelo)
 *   - fotos[]: File[] (opcional, fotos del modelo indicado en modelId)
 *
 * Respuesta: JSON { success: true, files: { mainImage: "...", mobileImage: "...", images: [...], models: { [modelId]: [...] } } }
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

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
    // Obtener userId y projectId
    $userId = $_POST['userId'] ?? null;
    if (!$userId) {
        throw new Exception('Se requiere userId');
    }
    
    // Usar projectId para el nombre del archivo, o userId como fallback
    $filePrefix = $_POST['projectId'] ?? $userId;

    // --- DETERMINAR RUTA DE DESTINO ---
    $scriptFile = $_SERVER['SCRIPT_FILENAME'];
    $scriptDir  = dirname($scriptFile);
    $parentDir  = dirname($scriptDir); // dist/ o raíz del sitio
    
    $destDir = $parentDir . '/uploads/proye_arqui/' . $userId;
    
    // Fallback con DOCUMENT_ROOT
    if (!is_dir(dirname($parentDir . '/uploads'))) {
        $altDir = $_SERVER['DOCUMENT_ROOT'] . '/uploads/proye_arqui/' . $userId;
        if (is_dir(dirname(dirname($altDir))) || mkdir(dirname(dirname($altDir)), 0755, true)) {
            $destDir = $altDir;
        }
    }
    
    // Crear directorio si no existe
    if (!is_dir($destDir)) {
        if (!mkdir($destDir, 0755, true)) {
            throw new Exception('No se pudo crear el directorio: ' . $destDir);
        }
    }
    
    if (!is_writable($destDir)) {
        throw new Exception('Directorio sin permisos de escritura: ' . $destDir);
    }
    
    $finalFiles = [
        'mainImage' => null,
        'mobileImage' => null,
        'logo' => null,
        'images' => [],
        'models' => []
    ];
    
    // --- PROCESAR IMAGEN PRINCIPAL (desktop) ---
    if (isset($_FILES['desktop']) && $_FILES['desktop']['error'] === UPLOAD_ERR_OK) {
        $ext = strtolower(pathinfo($_FILES['desktop']['name'], PATHINFO_EXTENSION));
        $allowedExts = ['webp'];
        if (!in_array($ext, $allowedExts)) {
            throw new Exception('Extensión no permitida para desktop: ' . $ext);
        }
        $destFileName = $filePrefix . '_desktop.webp';
        $destPath = $destDir . '/' . $destFileName;
        
        if (!move_uploaded_file($_FILES['desktop']['tmp_name'], $destPath)) {
            throw new Exception('Error al guardar imagen desktop');
        }
        
        $finalFiles['mainImage'] = '/uploads/proye_arqui/' . $userId . '/' . $destFileName;
    }
    
    // --- PROCESAR IMAGEN MÓVIL ---
    if (isset($_FILES['mobile']) && $_FILES['mobile']['error'] === UPLOAD_ERR_OK) {
        $ext = strtolower(pathinfo($_FILES['mobile']['name'], PATHINFO_EXTENSION));
        $allowedExts = ['webp'];
        if (!in_array($ext, $allowedExts)) {
            throw new Exception('Extensión no permitida para mobile: ' . $ext);
        }
        $destFileName = $filePrefix . '_mobile.webp';
        $destPath = $destDir . '/' . $destFileName;
        
        if (!move_uploaded_file($_FILES['mobile']['tmp_name'], $destPath)) {
            throw new Exception('Error al guardar imagen mobile');
        }
        
        $finalFiles['mobileImage'] = '/uploads/proye_arqui/' . $userId . '/' . $destFileName;
    }
    
    // --- PROCESAR LOGOTIPO DE LA EMPRESA ---
    if (isset($_FILES['logo']) && $_FILES['logo']['error'] === UPLOAD_ERR_OK) {
        $ext = strtolower(pathinfo($_FILES['logo']['name'], PATHINFO_EXTENSION));
        $allowedExts = ['webp'];
        if (in_array($ext, $allowedExts)) {
            $destFileName = $filePrefix . '_logo.webp';
            $destPath = $destDir . '/' . $destFileName;
            if (move_uploaded_file($_FILES['logo']['tmp_name'], $destPath)) {
                $finalFiles['logo'] = '/uploads/proye_arqui/' . $userId . '/' . $destFileName;
            }
        }
    }
    
    // --- PROCESAR GALERÍA ---
    if (isset($_FILES['gallery'])) {
        $galleryFiles = $_FILES['gallery'];
        
        // Si es un solo archivo, convertirlo a array
        if (!is_array($galleryFiles['name'])) {
            $galleryFiles = [
                'name' => [$galleryFiles['name']],
                'type' => [$galleryFiles['type']],
                'tmp_name' => [$galleryFiles['tmp_name']],
                'error' => [$galleryFiles['error']],
                'size' => [$galleryFiles['size']]
            ];
        }
        
        $imgIndex = 0;
        foreach ($galleryFiles['name'] as $index => $name) {
            if ($galleryFiles['error'][$index] !== UPLOAD_ERR_OK) continue;
            
            $ext = strtolower(pathinfo($name, PATHINFO_EXTENSION));
            $allowedExts = ['webp'];
            if (!in_array($ext, $allowedExts)) continue;
            
            $destFileName = $filePrefix . '_' . $imgIndex . '.webp';
            $destPath = $destDir . '/' . $destFileName;
            
            if (move_uploaded_file($galleryFiles['tmp_name'][$index], $destPath)) {
                $finalFiles['images'][] = '/uploads/proye_arqui/' . $userId . '/' . $destFileName;
                $imgIndex++;
            }
        }
    }
    
    // --- PROCESAR FOTOS DE MODELO (fotos[] + modelId) ---
    $modelId = $_POST['modelId'] ?? null;
    if ($modelId && isset($_FILES['fotos'])) {
        $fotosFiles = $_FILES['fotos'];

        if (!is_array($fotosFiles['name'])) {
            $fotosFiles = [
                'name' => [$fotosFiles['name']],
                'type' => [$fotosFiles['type']],
                'tmp_name' => [$fotosFiles['tmp_name']],
                'error' => [$fotosFiles['error']],
                'size' => [$fotosFiles['size']]
            ];
        }

        $finalFiles['models'][$modelId] = [];
        $imgIndex = 0;
        foreach ($fotosFiles['name'] as $index => $name) {
            if ($fotosFiles['error'][$index] !== UPLOAD_ERR_OK) continue;

            $ext = strtolower(pathinfo($name, PATHINFO_EXTENSION));
            $allowedExts = ['webp'];
            if (!in_array($ext, $allowedExts)) continue;

            $destFileName = $filePrefix . '_' . $modelId . '_' . $imgIndex . '.webp';
            $destPath = $destDir . '/' . $destFileName;

            if (move_uploaded_file($fotosFiles['tmp_name'][$index], $destPath)) {
                $finalFiles['models'][$modelId][] = '/uploads/proye_arqui/' . $userId . '/' . $destFileName;
                $imgIndex++;
            }
        }
    }

    // Validar que al menos se haya subido una imagen
    $hasProjectImages = $finalFiles['mainImage'] || $finalFiles['mobileImage'] || !empty($finalFiles['images']) || $finalFiles['logo'];
    $hasModelPhotos = !empty($finalFiles['models']);
    if (!$hasProjectImages && !$hasModelPhotos) {
        throw new Exception('No se subió ninguna imagen válida');
    }
    
    http_response_code(200);
    echo json_encode([
        'success' => true,
        'userId' => $userId,
        'files' => $finalFiles
    ]);
    
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
