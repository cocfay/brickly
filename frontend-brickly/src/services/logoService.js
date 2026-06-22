import { getCurrentUser, getToken, API_URL } from './authService';
import Cookies from 'js-cookie';

/**
 * Convierte un archivo de imagen a WebP usando canvas
 * @param {File} file - Archivo de imagen
 * @returns {Promise<Blob>}
 */
const convertToWebP = (file) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error('No se pudo convertir la imagen a WebP'));
        },
        'image/webp',
        0.85
      );
    };
    img.onerror = () => reject(new Error('Error al cargar la imagen'));
    img.src = URL.createObjectURL(file);
  });
};

/**
 * Obtiene la URL base completa incluyendo el path de Vite (ej: /brickly/)
 * Usa import.meta.env.BASE_URL que Vite provee automáticamente
 */
const getBaseUrl = () => {
  const base = import.meta.env.BASE_URL || '/';
  // Si el base es solo "/", no lo agregamos para evitar doble slash
  if (base === '/') {
    return window.location.origin;
  }
  return `${window.location.origin}${base}`.replace(/\/+$/, '');
};

/**
 * Obtiene la URL base para llamadas a la API local (considerando BASE_PATH)
 */
const getApiBaseUrl = () => {
  const base = import.meta.env.BASE_URL || '/';
  if (base === '/') {
    return '';
  }
  return base.replace(/\/+$/, '');
};

/**
 * Guarda el logo de la agencia.
 * 
 * AHORA USA EL WEBSERVICE:
 * 1. Convierte la imagen a WebP
 * 2. Envía el archivo al webservice POST {API_URL}/fileuploads/save
 *    con pathsave: "{userId}/logo"
 *    que lo guarda en: assets/{userId}/logo/foto.webp
 * 3. Actualiza la cookie del usuario con la nueva ruta del logo
 *    (el webservice se actualiza después en updateUserProfile)
 * 
 * @param {File} file - Archivo de imagen seleccionado
 * @returns {Promise<{success: boolean, url?: string, error?: string}>}
 */
export const uploadAgencyLogo = async (file, turnstileToken = null) => {
  try {
    // Validar tamaño máximo 2MB
    const MAX_SIZE = 2 * 1024 * 1024; // 2MB
    if (file.size > MAX_SIZE) {
      throw new Error('La imagen es demasiado grande. El tamaño máximo es 2MB.');
    }

    // Validar que sea imagen
    if (!file.type.startsWith('image/')) {
      throw new Error('Solo se permiten imágenes.');
    }

    const token = getToken();
    if (!token) throw new Error('No hay sesión activa');

    // Obtener el usuario actual
    const currentUser = getCurrentUser();

    // Obtener el ID del usuario desde el token JWT (payload.sub)
    let userId = 'unknown';
    try {
      const payloadBase64 = token.split('.')[1];
      const payload = JSON.parse(atob(payloadBase64));
      userId = payload?.sub || payload?.id || 'unknown';
    } catch {
      // Fallback: intentar obtener del objeto usuario
      userId = currentUser?._id || currentUser?.id || 'unknown';
    }

    // Convertir a WebP
    const blob = await convertToWebP(file);

    // Crear FormData con el archivo convertido
    const formData = new FormData();
    const fileName = `logo_${userId}.webp`;
    const webpFile = new File([blob], fileName, { type: 'image/webp' });
    formData.append('image', webpFile);
    formData.append('pathsave', `${userId}/logo`);

    // ============================================================
    // [COMENTADO] Código anterior que subía al endpoint local PHP
    // formData.append('file', webpFile);
    // formData.append('token', token);
    // if (turnstileToken) {
    //   formData.append('cf-turnstile-response', turnstileToken);
    // }
    // const apiBase = getApiBaseUrl();
    // const uploadResponse = await fetch(`${apiBase}/api/upload-logo`, {
    //   method: 'POST',
    //   body: formData
    // });
    // ============================================================

    // Subir al webservice
    /* console.log('📤 [logoService] Enviando logo al webservice...');
    console.log('📤 [logoService] userId:', userId);
    console.log('📤 [logoService] pathsave:', `${userId}/logo`);
    console.log('📤 [logoService] API_URL:', API_URL); */
    
    const uploadResponse = await fetch(`${API_URL}/fileuploads/save`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });

    //console.log('📥 [logoService] Status respuesta:', uploadResponse.status);

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error('❌ [logoService] Error response:', errorText);
      try {
        const errorJson = JSON.parse(errorText);
        throw new Error(errorJson.error || errorJson.message || `Error ${uploadResponse.status}`);
      } catch {
        throw new Error(errorText || `Error ${uploadResponse.status}`);
      }
    }

    const uploadData = await uploadResponse.json();
    //console.log('📦 [logoService] Respuesta completa del webservice:', uploadData);
    //console.log('🔍 [logoService] Campos disponibles en respuesta:', Object.keys(uploadData));
    
    // La respuesta del webservice devuelve la ruta dentro de files.image[0]
    // Estructura: { message: "...", files: { image: [ { usepath: "...", path: "..." } ] } }
    let savedPath = null;
    if (uploadData.files && uploadData.files.image && uploadData.files.image[0]) {
      savedPath = uploadData.files.image[0].usepath || uploadData.files.image[0].path;
    }
    console.log('🔍 [logoService] savedPath extraído:', savedPath);

    // Actualizar usuario en cookies con la nueva ruta del logo y timestamp para cache-busting
    // NOTA: Ya no se actualiza el webservice aquí porque el logo se incluye en el payload
    // de updateUserProfile que se llama después en config.jsx
    if (currentUser) {
      if (!currentUser.agentInfo) currentUser.agentInfo = {};
      currentUser.agentInfo.logo = savedPath;
      const timestamp = Date.now();
      currentUser.agentInfo.logoUpdatedAt = timestamp;
      Cookies.set('user', JSON.stringify(currentUser));

      // Guardar timestamp global en localStorage para cache-busting en todas las páginas
      try {
        localStorage.setItem(`logoUpdatedAt`, String(timestamp));
      } catch (_) {}

      window.dispatchEvent(new CustomEvent('userUpdated'));
    }

    return { 
      success: true, 
      url: savedPath
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Obtiene la URL completa para mostrar el logo de la agencia.
 * - Si la ruta empieza con "assets/" usa API_URL como base (webservice)
 * - Si no (rutas antiguas "uploads/logos/...") usa getBaseUrl() (local)
 * @param {string} logoPath - Ruta del logo desde agentInfo.logo
 * @returns {string|null} URL completa para mostrar la imagen
 */
export const getLogoUrl = (logoPath) => {
  if (!logoPath) return null;
  
  // Determinar la base URL según el tipo de ruta
  let baseUrl;
  if (logoPath.startsWith('assets/')) {
    // Rutas del webservice: usar API_URL
    baseUrl = API_URL;
  } else {
    // Rutas locales antiguas: usar getBaseUrl()
    baseUrl = getBaseUrl();
  }
  
  // Agregar timestamp para evitar caché del navegador
  const timestamp = Date.now();
  const separator = logoPath.includes('?') ? '&' : '?';
  return `${baseUrl}/${logoPath}${separator}_t=${timestamp}`;
};


