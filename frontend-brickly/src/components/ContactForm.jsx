import { useState, useEffect, useRef } from 'react';
import { FormattedMessage } from 'react-intl';
import { sendContactAgente } from '../services/contactService';
import { getCurrentUser, isAuthenticated } from '../services/authService';
import { useT } from '../hooks/useT';
import { getTurnstileSiteKey, getTurnstileToken, resetTurnstileWidget, shouldRequireTurnstileToken } from '../utils/turnstile';

const TURNSTILE_SITE_KEY = getTurnstileSiteKey();

/**
 * Componente reutilizable de formulario de contacto para agentes
 * Solo visible para usuarios no registrados o con rol "client"/"cliente"
 * 
 * @param {Object} props
 * @param {string|string[]} props.agentId - ID del agente (o array de IDs para multi-envío)
 * @param {string} props.type - Tipo de formulario (ej: "HomeForm", "Formulario Agente", "Formulario Propiedad")
 * @param {string} [props.info] - Información adicional (ej: nombre de la propiedad)
 * @param {string} [props.messagePlaceholder] - Placeholder personalizado para el textarea
 * @param {string} [props.defaultMessage] - Mensaje por defecto para el textarea (value inicial)
 * @param {string} [props.className] - Clases adicionales para el contenedor
 */
function ContactForm({ agentId, type = 'HomeForm', info = '', messagePlaceholder, defaultMessage = '', className = '' }) {

  const t = useT();

  const currentUser = getCurrentUser();
  const isAuth = isAuthenticated();
  const effectiveType = type || 'HomeForm';
  const isClient = Array.isArray(currentUser?.roles)
    ? currentUser.roles.some(r => r === 'client' || r === 'cliente')
    : currentUser?.roles === 'client' || currentUser?.roles === 'cliente';

  // Solo mostrar el formulario si no está autenticado o si es cliente
  const canShowForm = !isAuth || isClient;

  // Normalizar agentIds: si es un solo ID, lo convertimos en array
  const agentIds = Array.isArray(agentId) ? agentId : [agentId];

  // Log de validación de visibilidad del ContactForm
  /* console.group('🔍 [ContactForm] Validando visibilidad:');
  console.log('📌 type:', type);
  console.log('📌 info:', info);
  console.log('📌 agentId (original):', agentId);
  console.log('📌 agentIds (normalizado):', agentIds);
  console.log('📌 currentUser:', currentUser);
  console.log('📌 isAuth:', isAuth);
  console.log('📌 isClient:', isClient);
  console.log('📌 canShowForm:', canShowForm); */
  /* if (!canShowForm) {
    console.warn('❌ [ContactForm] No se mostrará porque canShowForm es false');
  }
  console.groupEnd(); */

  const [formData, setFormData] = useState({
    name: '',
    lastname: '',
    phone: '',
    email: '',
    message: defaultMessage
  });

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [turnstileReady, setTurnstileReady] = useState(false);
  const turnstileRef = useRef(null);
  const turnstileWidgetId = useRef(null);
  const inputIds = {
    name: 'contact-form-name',
    lastname: 'contact-form-lastname',
    email: 'contact-form-email',
    phone: 'contact-form-phone',
    message: 'contact-form-message',
  };

  // Inicializar Turnstile cuando el script cargue
  useEffect(() => {
    const checkTurnstile = () => {
      if (window.turnstile) {
        setTurnstileReady(true);
      } else {
        setTimeout(checkTurnstile, 300);
      }
    };
    checkTurnstile();
  }, []);

  // Renderizar widget Turnstile
  useEffect(() => {
    if (turnstileReady && turnstileRef.current && !turnstileWidgetId.current) {
      if (!TURNSTILE_SITE_KEY) return;
      turnstileWidgetId.current = window.turnstile.render(turnstileRef.current, {
        sitekey: TURNSTILE_SITE_KEY,
        theme: 'light'
      });
    }
  }, [turnstileReady]);

  // Si el usuario es cliente, pre-llenar el email con su correo
  useEffect(() => {
    if (isClient && currentUser?.email) {
      setFormData(prev => ({ ...prev, email: currentUser.email }));
    }
  }, []);

  const formatPhone = (value) => {
    if (!value) return '';
    if (!value.startsWith('+502 ')) return value;

    let digits = value.slice(5).replace(/\D/g, '');
    digits = digits.slice(0, 8);

    let formatted = '+502 ';
    if (digits.length > 4) {
      formatted += digits.slice(0, 4) + ' ' + digits.slice(4);
    } else {
      formatted += digits;
    }

    return formatted;
  };

  const handleChange = (e) => {
    if (e.target.name === 'phone') {
      const raw = e.target.value;
      if (!raw.startsWith('+502 ')) {
        const clean = raw.replace(/\D/g, '');
        if (clean.length > 0) {
          setFormData(prev => ({ ...prev, phone: formatPhone('+502 ' + clean) }));
        } else {
          setFormData(prev => ({ ...prev, phone: '' }));
        }
      } else {
        setFormData(prev => ({ ...prev, phone: formatPhone(raw) }));
      }
    } else {
      setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validar Turnstile
    const turnstileToken = getTurnstileToken(turnstileWidgetId.current);
    
    if (!turnstileToken && shouldRequireTurnstileToken()) {
      setError(t('Por favor, completa la verificación de seguridad', 'Please complete the security verification'));
      return;
    }

    setLoading(true);
    setError('');
    setSuccess(false);

    let hasError = false;
    let lastError = '';

    // Enviar a cada agente
    for (const id of agentIds) {
      const result = await sendContactAgente({
        ...formData,
        agentId: id,
        type: effectiveType,
        info
      }, turnstileToken);

      if (!result.success) {
        hasError = true;
        lastError = result.error || t('Error al enviar el mensaje.', 'Error sending the message.');
      }
    }

    setLoading(false);

    if (!hasError) {
      // Resetear Turnstile
      resetTurnstileWidget(turnstileWidgetId.current);
      setSuccess(true);
      setFormData({ name: '', lastname: '', phone: '', email: '', message: '' });
      setTimeout(() => setSuccess(false), 5000);
    } else {
      // Resetear Turnstile en caso de error
      resetTurnstileWidget(turnstileWidgetId.current);
      setError(lastError);
    }
  };

  if (!canShowForm) {
    return null;
  }

  return (
    <div className={className}>
      <div className='fs-3 mb-4'>
        <FormattedMessage id='properties.text3' />
      </div>
      <form onSubmit={handleSubmit} className="d-flex flex-column gap-3">
        <input type="hidden" name="type" value={effectiveType} />
        <div className="row g-3">
          <div className="col-6">
            <label htmlFor={inputIds.name} className="visually-hidden">{t('Nombre', 'Name')}</label>
            <input
              id={inputIds.name}
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="form-control noRounded rounded-1 py-2"
              style={{ fontSize: '14px' }}
              placeholder={t('Nombre', 'Name')}
              required
            />
          </div>
          <div className="col-6">
            <label htmlFor={inputIds.lastname} className="visually-hidden">{t('Apellido', 'Last name')}</label>
            <input
              id={inputIds.lastname}
              type="text"
              name="lastname"
              value={formData.lastname}
              onChange={handleChange}
              className="form-control noRounded rounded-1 py-2"
              style={{ fontSize: '14px' }}
              placeholder={t('Apellido', 'Last name')}
              required
            />
          </div>
        </div>
        <label htmlFor={inputIds.email} className="visually-hidden">{t('Correo electrónico', 'Email')}</label>
        <input
          id={inputIds.email}
          type="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          className="form-control noRounded rounded-1 py-2"
          style={{ fontSize: '14px' }}
          placeholder={t('Correo electrónico', 'Email')}
          required
        />
        <label htmlFor={inputIds.phone} className="visually-hidden">{t('Teléfono', 'Phone')}</label>
        <input
          id={inputIds.phone}
          type="tel"
          name="phone"
          value={formData.phone}
          onChange={handleChange}
          className="form-control noRounded rounded-1 py-2"
          style={{ fontSize: '14px' }}
          placeholder={t('Teléfono', 'Phone')}
          required
        />
        <label htmlFor={inputIds.message} className="visually-hidden">{t('Mensaje', 'Message')}</label>
        <textarea
          id={inputIds.message}
          name="message"
          value={formData.message}
          onChange={handleChange}
          className="form-control rounded-1 py-2"
          style={{ fontSize: '14px', minHeight: '120px' }}
          placeholder={messagePlaceholder || t('Escribe tu mensaje...', 'Write your message...')}
          required
        ></textarea>
        {/* Turnstile Widget */}
        <div className="d-flex justify-content-center">
          <div ref={turnstileRef}></div>
        </div>
        <button
          type="submit"
          className="btn bg-black rounded-1 text-white py-2"
          disabled={loading}
        >
          {loading ? (
            <><span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />{t('Enviando...', 'Sending...')}</>
          ) : (
            <FormattedMessage id='contact.text6' />
          )}
        </button>
        {success && (
          <div className="text-success small">
            {t('¡Mensaje enviado correctamente!', 'Message sent successfully!')}
          </div>
        )}
        {error && (
          <div className="text-danger small">{error}</div>
        )}
      </form>
    </div>
  );
}

export default ContactForm;
