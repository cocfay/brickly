import Cookies from 'js-cookie';


export const API_URL = import.meta.env.VITE_API_URL; //demobrickly.mydesk.digital
export const AUTH_EVENT_KEY = 'auth_event';

// ========== FUNCIONES DE UTILIDAD ==========

const setCookie = (name, data) => {
  Cookies.set(name, data, { expires: 5, secure: true, sameSite: 'strict', path: '/' })
} 

const getCookie = (name) => {
  return Cookies.get(name);
} 

const broadcastAuthEvent = (type) => {
  try {
    localStorage.setItem(AUTH_EVENT_KEY, JSON.stringify({ type, at: Date.now() }));
  } catch (e) {}

  try {
    window.dispatchEvent(new CustomEvent('auth:changed', { detail: { type } }));
    if (type === 'logout') {
      window.dispatchEvent(new Event('logout'));
    }
  } catch (e) {}
};

// Obtener token
export const getToken = () => {
  return getCookie('authToken');
};

// Verificar autenticación
export const isAuthenticated = () => {
  return !!getToken();
};

// Obtener usuario del localStorage
export const getCurrentUser = () => {
  try {
    const userStr = getCookie('user');
    if (!userStr) {
      return null;
    }
    const parsed = JSON.parse(userStr);
    return parsed;
  } catch {
    return null;
  }
};

// Obtener usuario COMPLETO combinando cookie (datos mínimos) + sessionStorage (datos completos)
export const getFullUser = () => {
  const cookieUser = getCurrentUser();
  if (!cookieUser) return null;
  
  try {
    const fullStr = sessionStorage.getItem('userFull');
    if (fullStr) {
      const fullData = JSON.parse(fullStr);
      // Combinar: prioriza datos completos del backend pero mantiene campos calculados de la cookie
      return { ...cookieUser, ...fullData };
    }
  } catch (e) {}
  
  return cookieUser;
};

// Guardar sesión
const setSession = (token, user = null) => {
  if (token) setCookie('authToken', token)
  if (user) setCookie('user', JSON.stringify(user))
  if (token) broadcastAuthEvent('login');
  // Limpiar filtros persistentes de propiedades (frontend y cpanel) para evitar confusiones al cambiar de usuario
  try {
    Object.keys(sessionStorage).forEach(key => {
      if (key.startsWith('propiedades_filters_') || key.startsWith('propiedades_state_') || key.startsWith('cpanel_propiedades_dt_')) {
        sessionStorage.removeItem(key);
      }
    });
  } catch (e) {}
};

// Procesar token de Google en la URL
export const processGoogleToken = async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');
  
  if (!token) return false;
  
  setCookie('authToken', token)
  
  // Limpiar URL
  window.history.replaceState({}, '', window.location.pathname);
  
  // Obtener perfil del usuario automáticamente
  try {
    const profileResult = await fetchUserProfile();
    if (profileResult.success) {
      return true;
    } else {
      return false;
    }
  } catch (error) {
    return false;
  }
};

// Limpiar sesión
export const clearSession = () => {
  Cookies.remove('authToken', { path: '/' })
  Cookies.remove('user', { path: '/' })
  try {
    sessionStorage.removeItem('userFull');
    // Limpiar estados del DataTable del cpanel
    Object.keys(sessionStorage).forEach(k => {
      if (k.startsWith('cpanel_propiedades_dt_')) {
        sessionStorage.removeItem(k);
      }
    });
  } catch (e) {}
  broadcastAuthEvent('logout');
};


// ========== FUNCIONES DE API ==========

// Login
export const loginWithEmail = async (credentials, turnstileToken = null) => {
  try {
    const body = { ...credentials };
    if (turnstileToken) {
      body['cf-turnstile-response'] = turnstileToken;
    }

    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    const data = await handleResponse(response);
    
    if (data.access_token) {
      setSession(data.access_token);
      
      // Intentar obtener perfil automáticamente
      const profileResult = await fetchUserProfile();
      if (!profileResult.success) {
        console.warn('Perfil no disponible:', profileResult.error);
      }
    }

    return { 
      success: true, 
      data,
      message: 'Inicio de sesión exitoso'
    };
  } catch (error) {
    return handleError(error, 'Error en login');
  }
};

// Registro
export const registerWithEmail = async (userData, turnstileToken = null) => {
  try {
    const body = { ...userData };
    if (turnstileToken) {
      body['cf-turnstile-response'] = turnstileToken;
    }

    const response = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    const data = await handleResponse(response);
    
    return { 
      success: true, 
      data,
      message: 'Registro exitoso'
    };
  } catch (error) {
    return handleError(error, 'Error en registro');
  }
};

// Obtener perfil de usuario
export const fetchUserProfile = async () => {
  try {
    const token = getToken();
    
    if (!token) throw new Error('No hay sesión activa');

    const response = await fetch(`${API_URL}/users/me`, {
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      // Si el token expiró, cerrar sesión automáticamente
      if (response.status === 401) {
        handleAuthError();
        throw new Error('Sesión expirada');
      }
      // Otros errores (500, timeout, etc.) no deben romper la sesión
      console.error('fetchUserProfile - Error en backend:', response.status);
      return { success: false, error: `Error ${response.status}` };
    }

    const data = await response.json();

    let show = false
    let level = 0

    if(!data?.roles?.includes('cliente')){
      show = true
      level = 1
    }
    
    // Guardar SOLO datos mínimos en la cookie para evitar el límite de 4KB por cookie
    const miniUser = {
      _id: data._id,
      name: data.name,
      email: data.email,
      phone: data.phone,
      avatar: data.avatar,
      roles: data.roles,
      showCpanel: show,
      whatLevel: level,
      featured_user: data.featured_user,
      parentId: data.parentId
    };

    setCookie('user', JSON.stringify(miniUser));
    
    // Guardar datos COMPLETOS en sessionStorage (no tiene límite de 4KB como cookies)
    try {
      sessionStorage.setItem('userFull', JSON.stringify(data));
    } catch (e) {}
    
    return { success: true, info: data };
  } catch (error) {
    console.error('fetchUserProfile - Error:', error);
    return { success: false, error: error.message };
  }
};

//Editar datos del perfil
export const updateUserProfile = async (userData) => {
  try {
    const token = getToken();
    if (!token) throw new Error('No hay sesión activa');

    const response = await fetch(`${API_URL}/users/me`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(userData)
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || `Error ${response.status}`);
    }

    const data = await response.json();
    
    // Refrescar el perfil completo para mantener roles y campos calculados (showCpanel, whatLevel)
    await fetchUserProfile();
    
    // Notificar a componentes en la misma pestaña (ej: navbar)
    window.dispatchEvent(new CustomEvent('userUpdated'));

    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const uploadAvatar = async (file, turnstileToken = null) => {
  try {
    const token = getToken();
    if (!token) throw new Error('No hay sesión activa');

    const formData = new FormData();
    formData.append('file', file);
    if (turnstileToken) {
      formData.append('cf-turnstile-response', turnstileToken);
    }

    const response = await fetch(`${API_URL}/users/me/avatar`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || `Error ${response.status}`);
    }

    const data = await response.json();
    
    // Actualizar usuario en localStorage con la nueva URL del avatar
    const currentUser = getCurrentUser();
    if (currentUser && data.avatar) {
      currentUser.avatar = data.avatar;
      setCookie('user', JSON.stringify(currentUser))
      window.dispatchEvent(new CustomEvent('userUpdated'));
    }
    
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Cambiar contraseña (usa el mismo endpoint que la actualización de perfil)
export const updatePassword = async (newPassword) => {
  try {
    const token = getToken();
    if (!token) throw new Error('No hay sesión activa');

    const response = await fetch(`${API_URL}/users/me`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        password: newPassword
      })
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || `Error ${response.status}`);
    }

    const data = await response.json();

    // Refrescar perfil para mantener datos actualizados
    await fetchUserProfile();

    return { success: true, data, message: 'Contraseña actualizada exitosamente' };
  } catch (error) {
    return handleError(error, 'Error al cambiar contraseña');
  }
};

// Logout
export const logout = () => {
  clearSession();
  // Limpiar sessionStorage para que los banners vuelvan a aparecer al reiniciar sesión
  sessionStorage.removeItem('bannerAgenciaClosed');
  sessionStorage.removeItem('profileAlertShown');
  sessionStorage.removeItem('showIncompleteAlert');
  return { success: true, message: 'Sesión cerrada' };
};

// Manejador de error de autenticación (token expirado / no autorizado)
export const handleAuthError = () => {
  clearSession();
  window.location.href = import.meta.env.PROD ? '/login' : '/brickly/login';
};

// ========== FUNCIONES AUXILIARES ==========

// Manejador uniforme de respuestas
const handleResponse = async (response) => {
  const responseText = await response.text();
  
  let data;
  try {
    data = responseText ? JSON.parse(responseText) : {};
  } catch {
    data = { message: responseText };
  }

  if (!response.ok) {
    // Detectar errores específicos
    if (response.status === 401 || response.status === 403) {
      throw new Error('Error al iniciar sesión, datos invalidos');
    }
    if (response.status === 409 || data.message?.toLowerCase().includes('duplicate')) {
      throw new Error('El correo ya está registrado');
    }
    throw new Error(data.message || `Error ${response.status}`);
  }

  return data;
};

// Manejador uniforme de errores
const handleError = (error, context) => {
  console.error(`${context}:`, error);
  return { 
    success: false, 
    error: error.message || 'Error del servidor'
  };
};

// ========== FUNCIONES OPCIONALES ==========

// Verificar email (si el endpoint existe)
export const checkEmailExists = async (email) => {
  try {
    const response = await fetch(`${API_URL}/auth/check-email?email=${encodeURIComponent(email)}`);
    
    if (response.status === 200) {
      const data = await response.json();
      return { exists: data.exists, message: data.message };
    }
    return { exists: false };
  } catch {
    return { exists: false };
  }
};

// Fetch autenticado para otros endpoints
export const authFetch = async (endpoint, options = {}) => {
  const token = getToken();
  if (!token) throw new Error('No autenticado');

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    }
  });

  return handleResponse(response);
};