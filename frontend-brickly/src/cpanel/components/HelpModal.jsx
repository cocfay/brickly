import { useState } from 'react';
import { Modal } from 'react-bootstrap';
import { sendContactAgente } from '../../services/contactService';
import { getCurrentUser } from '../../services/authService';
import { useT } from '../../hooks/useT';

function HelpModal({ show, onHide }) {
  const t = useT();
  const currentUser = getCurrentUser();

  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!message.trim()) {
      setError(t('Escribe una descripción del problema.', 'Please write a description of the issue.'));
      return;
    }

    setLoading(true);
    setError('');
    setSuccess(false);

    const result = await sendContactAgente({
      name: currentUser?.name || '',
      lastname: '',
      phone: currentUser?.phone || '',
      email: currentUser?.email || '',
      message: message.trim(),
      agentId: currentUser?._id,
      type: 'Formulario Soporte',
      info: ''
    });

    setLoading(false);

    if (result.success) {
      setSuccess(true);
      setMessage('');
      setTimeout(() => {
        setSuccess(false);
        onHide();
      }, 2000);
    } else {
      setError(result.error || t('Error al enviar el reporte.', 'Error sending the report.'));
    }
  };

  const handleClose = () => {
    setMessage('');
    setError('');
    setSuccess(false);
    onHide();
  };

  return (
    <Modal show={show} onHide={handleClose} centered size="lg">
      <Modal.Header closeButton>
        <Modal.Title>Ayuda e información</Modal.Title>
      </Modal.Header>
      <form onSubmit={handleSubmit}>
        <Modal.Body>
          <p className="text-muted mb-3">
            Describe el problema o la duda que tengas para que podamos ayudarte.
          </p>
          <textarea
            className="form-control rounded-1 py-2"
            style={{ fontSize: '14px', minHeight: '180px' }}
            placeholder={t('Escribe aquí tu consulta...', 'Write your question here...')}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            required
            maxLength={1000}
          />
          <div className="text-end text-muted small mt-1">{message.length}/1000</div>
          {success && (
            <div className="text-success small mt-2">
              <i className="fa-solid fa-check-circle me-1"></i>
              {t('¡Reporte enviado correctamente!', 'Report sent successfully!')}
            </div>
          )}
          {error && (
            <div className="text-danger small mt-2">
              <i className="fa-solid fa-exclamation-circle me-1"></i>
              {error}
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <button type="button" className="btn btn-secondary" onClick={handleClose} disabled={loading}>
            {t('Cancelar', 'Cancel')}
          </button>
          <button type="submit" className="btn btn-dark" disabled={loading}>
            {loading ? (
              <><span className="spinner-border spinner-border-sm me-2" />{t('Enviando...', 'Sending...')}</>
            ) : (
              t('Enviar reporte', 'Send report')
            )}
          </button>
        </Modal.Footer>
      </form>
    </Modal>
  );
}

export default HelpModal;