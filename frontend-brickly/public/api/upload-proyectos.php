<?php
/**
 * Endpoint para mover imágenes de proyectos de arquitecto.
 * Recibe un JSON con las rutas temporales y las mueve a:
 *   uploads/proye_arqui/{userId}/
 * 
 * Uso: POST /api/upload-proyectos
 * Body: JSON { userId: "123", paths: ["temp/xxx.jpg", "temp/yyy.jpg"] }
 * 
 * Respuesta: JSON { success: true, files: { mainImage: "...", mobileImage: "...", images: [...] } }
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
    // Leer body JSON
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input || !isset($input['paths']) || !is_array($input['paths'])) {
        throw new Exception('Body inválido. Se requiere { paths: [...], userId: "..." }');
    }

    $userId = $input['userId'] ?? 'unknown';
    $paths = $input['paths']; // array de rutas temporales: ["temp/img1.jpg", "temp/img2.jpg"]
    
    // Debug info
    $debugInfo = [
        'userId' => $userId,
        'paths_recibidas' => $paths,
        'script_file' => $_SERVER['SCRIPT_FILENAME'] ?? 'N/A',
        'doc_root' => $_SERVER['DOCUMENT_ROOT'] ?? 'N/A',
    ];
    
    // --- DETERMINAR RUTA DE DESTINO ---
    $scriptFile = $_SERVER['SCRIPT_FILENAME'];
    $scriptDir  = dirname($scriptFile);
    $parentDir  = dirname($scriptDir); // dist/
    
    $destDir = $parentDir . '/uploads/proye_arqui/' . $userId;
    
    // Fallback con DOCUMENT_ROOT
    if (!is_dir(dirname($parentDir . '/uploads'))) {
        $altDir = $_SERVER['DOCUMENT_ROOT'] . '/uploads/proye_arqui/' . $userId;
        if (is_dir(dirname(dirname($altDir))) || mkdir(dirname(dirname($altDir)), 0755, true)) {
            $destDir = $altDir;
        }
    }
    
    $debugInfo['dest_dir'] = $destDir;
    
    // Crear directorio si no existe
    if (!is_dir($destDir)) {
        if (!mkdir($destDir, 0755, true)) {
            throw new Exception('No se pudo crear el directorio: ' . $destDir);
        }
    }
    
    if (!is_writable($destDir)) {
        throw new Exception('Directorio sin permisos de escritura: ' . $destDir);
    }
    
    // --- MOVER CADA ARCHIVO ---
    $finalFiles = [];
    
    foreach ($paths as $index => $tempPath) {
        // Limpiar la ruta (quitar / inicial si existe)
        $cleanPath = ltrim($tempPath, '/');
        
        // La ruta temporal está en uploads/temp/... 
        // pero dependiendo de cómo se guardó puede ser "temp/img.jpg" o "uploads/temp/img.jpg"
        $sourceFile = $parentDir . '/' . $cleanPath;
        
        // Si no existe, intentar con otras combinaciones
        if (!file_exists($sourceFile)) {
            $altSource = $parentDir . '/uploads/' . $cleanPath;
            if (file_exists($altSource)) {
                $sourceFile = $altSource;
            } else {
                // Intentar con document root
                $altSource2 = $_SERVER['DOCUMENT_ROOT'] . '/' . $cleanPath;
                if (file_exists($altSource2)) {
                    $sourceFile = $altSource2;
                } else {
                    $altSource3 = $_SERVER['DOCUMENT_ROOT'] . '/uploads/' . $cleanPath;
                    if (file_exists($altSource3)) {
                        $sourceFile = $altSource3;
                    }
                }
            }
        }
        
        if (!file_exists($sourceFile)) {
            $debugInfo['errors'][] = "No se encontró el archivo fuente: $tempPath (buscado en: $sourceFile)";
            continue;
        }
        
        // Obtener extensión y nombre
        $ext = pathinfo($sourceFile, PATHINFO_EXTENSION);
        $destFileName = $userId . '_' . $index . '.' . $ext;
        
        // Si es la primera (mainImage), usar nombre descriptivo
        if ($index === 0 && isset($input['isMainImage'])) {
            $destFileName = $userId . '_desktop.' . $ext;
        } elseif ($index === 1 && isset($input['isMobileImage'])) {
            $destFileName = $userId . '_mobile.' . $ext;
        } elseif ($index === 0) {
            $destFileName = $userId . '_0.' . $ext;
        }
        
        $destPath = $destDir . '/' . $destFileName;
        
        // Copiar el archivo
        if (!copy($sourceFile, $destPath)) {
            $debugInfo['errors'][] = "Error al copiar: $sourceFile -> $destPath";
            continue;
        }
        
        // Ruta pública para guardar en BD
        $publicPath = '/uploads/proye_arqui/' . $userId . '/' . $destFileName;
        $finalFiles[] = $publicPath;
    }
    
    if (empty($finalFiles)) {
        throw new Exception('No se pudo mover ningún archivo.');
    }
    
    // --- ESTRUCTURAR RESPUESTA ---
    $response = [
        'success' => true,
        'userId' => $userId,
        'files' => [
            'mainImage' => $finalFiles[0] ?? null,
            'mobileImage' => $finalFiles[1] ?? null,
            'images' => array_slice($finalFiles, 2)
        ],
        '_debug' => $debugInfo
    ];
    
    echo json_encode($response);
    
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'error' => $e->getMessage(),
        '_debug' => $debugInfo ?? []
    ]);
}
