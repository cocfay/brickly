import { API_URL, getToken, handleAuthError } from './../../services/authService';

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
 * Obtiene la URL base completa incluyendo el path de Vite
 */
const getBaseUrl = () => {
  const base = import.meta.env.BASE_URL || '/';
  if (base === '/') {
    return window.location.origin;
  }
  return `${window.location.origin}${base}`.replace(/\/+$/, '');
};

/**
 * Sube una imagen de feature (asociado/partner).
 * Convierte a WebP, la guarda localmente en uploads/features/
 * y devuelve la ruta pública.
 * 
 * @param {File} file - Archivo de imagen
 * @param {string} name - Nombre del asociado (para generar el filename)
 * @returns {Promise<{success: boolean, path?: string, error?: string}>}
 */
export const uploadFeatureImage = async (file, name) => {
  try {
    // Validar tamaño máximo 1.8MB
    const MAX_SIZE = 1.8 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      throw new Error('La imagen es demasiado grande. El tamaño máximo es 1.8MB.');
    }

    // Validar que sea imagen
    if (!file.type.startsWith('image/')) {
      throw new Error('Solo se permiten imágenes.');
    }

    // Convertir a WebP
    const blob = await convertToWebP(file);

    // Crear FormData
    const formData = new FormData();
    const webpFile = new File([blob], 'feature.webp', { type: 'image/webp' });
    formData.append('file', webpFile);
    formData.append('name', name);

    // Enviar al endpoint local
    const apiBase = getApiBaseUrl();
    const uploadResponse = await fetch(`${apiBase}/api/upload-feature`, {
      method: 'POST',
      body: formData
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      try {
        const errorJson = JSON.parse(errorText);
        throw new Error(errorJson.error || errorJson.message || `Error ${uploadResponse.status}`);
      } catch {
        throw new Error(errorText || `Error ${uploadResponse.status}`);
      }
    }

    const uploadData = await uploadResponse.json();
    return { success: true, path: uploadData.path };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Obtiene la URL completa para mostrar una imagen de feature.
 * @param {string} imagePath - Ruta de la imagen (ej: /uploads/features/nombre.webp)
 * @returns {string|null} URL completa para mostrar la imagen
 */
export const getFeatureImageUrl = (imagePath) => {
  if (!imagePath) return null;
  const baseUrl = getBaseUrl();
  return `${baseUrl}${imagePath}`;
};

// Función auxiliar para manejar respuestas

const handleResponse = async (response) => {
  if (!response.ok) {
    // Si el token expiró o no está autorizado, limpiar sesión y redirigir
    if (response.status === 401) {
      handleAuthError();
      throw new Error('Sesión expirada');
    }
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `Error ${response.status}`);
  }
  return response.json();
};

// Obtener token con validación
const getAuthHeaders = () => {
  const token = getToken();
  if (!token) throw new Error('No hay sesión activa');
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
};

// ========== CRUD DE ASOCIADOS (PARTNERS) ==========

// Obtener todos los asociados (requiere autenticación - para el panel)
export const getAsociados = async () => {
  try {
    const response = await fetch(`${API_URL}/partners`, {
      headers: getAuthHeaders()
    });

    const data = await handleResponse(response);
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Obtener todos los asociados (público - sin autenticación, para landing page)
export const getAsociadosPublic = async () => {
  try {
    const response = await fetch(`${API_URL}/partners`, {
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) {
      throw new Error(`Error ${response.status}`);
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Crear un nuevo asociado
export const createAsociado = async (asociadoData) => {
  try {
    const response = await fetch(`${API_URL}/partners`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(asociadoData)
    });

    const data = await handleResponse(response);
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Actualizar un asociado por ID
export const updateAsociado = async (id, asociadoData) => {
  try {
    const response = await fetch(`${API_URL}/partners/${id}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(asociadoData)
    });

    const data = await handleResponse(response);
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Eliminar un asociado por ID
export const deleteAsociado = async (id) => {
  try {
    const response = await fetch(`${API_URL}/partners/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });

    const data = await handleResponse(response);
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
};
