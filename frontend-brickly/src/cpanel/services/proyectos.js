import { API_URL, getToken, handleAuthError } from './../../services/authService';

/**
 * Convierte un archivo de imagen a WebP usando canvas
 * @param {File} file - Archivo de imagen original
 * @param {string} [suffix=''] - Sufijo para el nombre (ej: '_desktop', '_mobile')
 * @returns {Promise<File>} Nuevo archivo en WebP
 */
const convertImageToWebP = (file, suffix = '') => {
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
          if (blob) {
            const baseName = file.name.replace(/\.[^.]+$/, '');
            const fileName = `${baseName}${suffix}.webp`;
            const webpFile = new File([blob], fileName, { type: 'image/webp' });
            resolve(webpFile);
          } else {
            reject(new Error('No se pudo convertir la imagen a WebP'));
          }
        },
        'image/webp',
        0.85
      );
    };
    img.onerror = () => reject(new Error('Error al cargar la imagen'));
    img.src = URL.createObjectURL(file);
  });
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

// ========== CRUD DE PROYECTOS ==========

/**
 * Obtener todos los proyectos
 * GET /projects
 */
export const getProyectos = async (params = {}) => {
  try {
    const queryString = new URLSearchParams(params).toString();
    const url = `${API_URL}/projects${queryString ? `?${queryString}` : ''}`;

    const response = await fetch(url, {
      headers: getAuthHeaders()
    });

    const data = await handleResponse(response);
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Obtener un proyecto por ID
 * GET /projects/:projectId
 */
export const getProyectoById = async (projectId) => {
  try {
    const response = await fetch(`${API_URL}/projects/${projectId}`, {
      /* headers: getAuthHeaders() */
    });

    const data = await handleResponse(response);
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Obtener proyectos por usuario
 * GET /projects/user/:userId
 */
export const getProyectosByUser = async (userId) => {
  try {
    const response = await fetch(`${API_URL}/projects/user/${userId}`, {
      //headers: getAuthHeaders()
    });

    const data = await handleResponse(response);
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Crear un nuevo proyecto
 * POST /projects
 * Body: { title, description, mainImage, images }
 */
export const createProyecto = async (proyectoData) => {
  try {
    const response = await fetch(`${API_URL}/projects`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(proyectoData)
    });

    const data = await handleResponse(response);
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Actualizar un proyecto
 * PUT /projects/:projectId
 */
export const updateProyecto = async (projectId, proyectoData) => {
  try {
    const response = await fetch(`${API_URL}/projects/${projectId}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(proyectoData)
    });

    const data = await handleResponse(response);
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Subir archivo temporal (imagen)
 * POST /fileuploads/temp
 */
export const uploadTempFile = async (file, fileType = 'image') => {
  try {
    const formData = new FormData();
    formData.append(fileType, file);

    const response = await fetch(`${API_URL}/fileuploads/temp`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${getToken()}`
      },
      body: formData
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Error ${response.status}: ${errorText}`);
    }

    const data = await response.json();

    let pathString = null;
    if (data.files && data.files.image && data.files.image[0]) {
      pathString = data.files.image[0].usepath || data.files.image[0].path;
    }

    if (!pathString) {
      throw new Error('No se recibió el path del archivo');
    }

    return { success: true, path: pathString };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Subir múltiples archivos en paralelo (cada uno por separado)
 * POST /fileuploads/temp
 */
export const uploadMultipleTempFilesParallel = async (files, fileType = 'image') => {
  try {
    const uploadPromises = files.map(file => {
      const formData = new FormData();
      formData.append(fileType, file);

      return fetch(`${API_URL}/fileuploads/temp`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getToken()}`
        },
        body: formData
      }).then(async response => {
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Error ${response.status}: ${errorText}`);
        }
        return response.json();
      });
    });

    const results = await Promise.all(uploadPromises);

    const paths = [];
    results.forEach(data => {
      if (data.files && data.files.image && data.files.image[0]) {
        const pathString = data.files.image[0].usepath || data.files.image[0].path;
        if (pathString) paths.push(pathString);
      }
    });

    return { success: true, paths };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Mover imágenes temporales a la carpeta definitiva del arquitecto
 * POST /api/upload-proyectos (PHP local)
 */
export const moveProyectoImages = async (paths, userId) => {
  try {
    // Usar BASE_URL para soportar subdirectorios (ej: /brickly/)
    const base = import.meta.env.BASE_URL || '/';
    const cleanBase = base.endsWith('/') ? base.slice(0, -1) : base;
    const url = `${cleanBase}/api/upload-proyectos`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${getToken()}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ paths, userId })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Error ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Subir imágenes de proyecto DIRECTAMENTE a la carpeta del arquitecto
 * (evita pasar por temp de NestJS - PHP local hace la subida directa)
 * POST /api/upload-proyectos-direct.php
 * 
 * @param {string} userId - ID del arquitecto/usuario
 * @param {Object|null} desktopFile - Archivo de imagen desktop (File | null)
 * @param {Object|null} mobileFile - Archivo de imagen mobile (File | null)
 * @param {File[]} galleryFiles - Array de archivos para la galería
 * @returns {Object} { success, data: { files: { mainImage, mobileImage, images } } }
 */
export const uploadProyectosDirect = async ({ userId, projectId, desktopFile, mobileFile, galleryFiles = [] }) => {
  try {
    // Convertir todos los archivos a WebP primero
    const convertPromises = [];
    
    if (desktopFile) {
      convertPromises.push(
        convertImageToWebP(desktopFile, '_desktop')
          .then(file => ({ type: 'desktop', file }))
      );
    }
    if (mobileFile) {
      convertPromises.push(
        convertImageToWebP(mobileFile, '_mobile')
          .then(file => ({ type: 'mobile', file }))
      );
    }
    galleryFiles.forEach((file, idx) => {
      convertPromises.push(
        convertImageToWebP(file, `_gallery_${idx}`)
          .then(converted => ({ type: 'gallery', file: converted }))
      );
    });

    const convertedResults = await Promise.all(convertPromises);

    const base = import.meta.env.BASE_URL || '/';
    const cleanBase = base.endsWith('/') ? base.slice(0, -1) : base;
    const url = `${cleanBase}/api/upload-proyectos-direct.php`;

    const formData = new FormData();
    formData.append('userId', userId);
    if (projectId) {
      formData.append('projectId', projectId);
    }

    convertedResults.forEach(({ type, file }) => {

      if (type === 'desktop') {
        formData.append('desktop', file);
      } else if (type === 'mobile') {
        formData.append('mobile', file);
      } else if (type === 'gallery') {
        formData.append('gallery[]', file);
      }
    });

    const response = await fetch(url, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Error ${response.status}`);
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Eliminar un proyecto
 * DELETE /projects/:projectId
 */
export const deleteProyecto = async (projectId) => {
  try {
    const response = await fetch(`${API_URL}/projects/${projectId}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });

    await handleResponse(response);
    return { success: true, message: 'Proyecto eliminado correctamente' };
  } catch (error) {
    return { success: false, error: error.message };
  }
};
