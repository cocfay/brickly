import { useEffect, useState } from 'react';
import { Container, Alert, Modal, Button } from 'react-bootstrap';
import { API_URL } from '../../../services/authService';
import {
  getAgencyAssignmentRequests,
  approveAssignmentRequest,
  rejectAssignmentRequest,
} from '../../../services/assignmentRequestService';

function Solicitudes() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [alertVariant, setAlertVariant] = useState('success');

  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejecting, setRejecting] = useState(false);

  const [approvingId, setApprovingId] = useState(null);

  const loadRequests = async () => {
    setLoading(true);
    const res = await getAgencyAssignmentRequests();
    if (res.success !== false) {
      const data = Array.isArray(res) ? res : res.data || [];
      setRequests(data);
    } else {
      setAlertVariant('danger');
      setAlertMessage(res.error || 'Error al cargar solicitudes');
      setShowAlert(true);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const handleApprove = async (id) => {
    setApprovingId(id);
    const res = await approveAssignmentRequest(id);
    if (res.success) {
      setRequests(prev =>
        prev.map(r => (r._id === id ? { ...r, status: 'approved' } : r)),
      );
      setAlertVariant('success');
      setAlertMessage('Solicitud aprobada. El agente ha sido asignado a la propiedad.');
      setShowAlert(true);
    } else {
      setAlertVariant('danger');
      setAlertMessage(res.error || 'Error al aprobar');
      setShowAlert(true);
    }
    setApprovingId(null);
  };

  const openRejectModal = (id) => {
    setSelectedId(id);
    setRejectReason('');
    setShowRejectModal(true);
  };

  const handleReject = async () => {
    if (!selectedId) return;
    setRejecting(true);
    const res = await rejectAssignmentRequest(selectedId, rejectReason);
    if (res.success) {
      setRequests(prev =>
        prev.map(r =>
          r._id === selectedId
            ? { ...r, status: 'rejected', rejectionReason: rejectReason }
            : r,
        ),
      );
      setShowRejectModal(false);
      setAlertVariant('success');
      setAlertMessage('Solicitud rechazada.');
      setShowAlert(true);
    } else {
      setAlertVariant('danger');
      setAlertMessage(res.error || 'Error al rechazar');
      setShowAlert(true);
    }
    setRejecting(false);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('es-GT', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getPropertyImage = (item) => {
    const photo = item?.propertyId?.media?.photos?.[0]?.path;
    if (!photo) return null;
    if (photo.startsWith('http')) return photo;
    return `${API_URL}/${photo}`;
  };

  return (
    <Container>
      <div className="fs-1 mb-4">Solicitudes de asignación</div>

      {showAlert && (
        <Alert
          variant={alertVariant}
          onClose={() => setShowAlert(false)}
          dismissible
          className="position-fixed bottom-0 end-0 m-3 shadow-sm"
          style={{ zIndex: 9999 }}
        >
          {alertMessage}
        </Alert>
      )}

      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" />
          <p className="mt-3">Cargando solicitudes...</p>
        </div>
      ) : requests.length === 0 ? (
        <p className="text-muted fs-5">No hay solicitudes pendientes.</p>
      ) : (
        <div className="table-responsive">
          <table className="table align-middle">
            <thead className="table-dark">
              <tr>
                <th>Agente</th>
                <th>Propiedad</th>
                <th>Fecha</th>
                <th>Estado</th>
                <th>Motivo</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((req) => (
                <tr key={req._id}>
                  <td>
                    <div className="d-flex align-items-center gap-2">
                      {req.agentId?.avatar && (
                        <img
                          src={
                            req.agentId.avatar.startsWith('http')
                              ? req.agentId.avatar
                              : `${API_URL}${req.agentId.avatar.replace('/uploads', '')}`
                          }
                          alt=""
                          className="rounded-circle object-fit-cover"
                          style={{ width: '35px', height: '35px' }}
                        />
                      )}
                      <div>
                        <div>{req.agentId?.name || 'N/A'}</div>
                        <small className="text-muted">{req.agentId?.email}</small>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="d-flex align-items-center gap-2">
                      {getPropertyImage(req) && (
                        <img
                          src={getPropertyImage(req)}
                          alt=""
                          className="object-fit-cover rounded"
                          style={{ width: '50px', height: '40px' }}
                        />
                      )}
                      <span>{req.propertyId?.market?.title || 'N/A'}</span>
                    </div>
                  </td>
                  <td style={{ whiteSpace: 'nowrap' }}>{formatDate(req.createdAt)}</td>
                  <td>
                    <span
                      className={`badge rounded-pill ${
                        req.status === 'approved'
                          ? 'bg-success'
                          : req.status === 'rejected'
                            ? 'bg-danger'
                            : 'bg-warning text-dark'
                      }`}
                    >
                      {req.status === 'approved'
                        ? 'Aprobada'
                        : req.status === 'rejected'
                          ? 'Rechazada'
                          : 'Pendiente'}
                    </span>
                  </td>
                  <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {req.status === 'rejected' ? req.rejectionReason || '-' : '-'}
                  </td>
                  <td>
                    {req.status === 'pending' && (
                      <div className="d-flex gap-2">
                        <Button
                          variant="success"
                          size="sm"
                          onClick={() => handleApprove(req._id)}
                          disabled={approvingId === req._id}
                        >
                          {approvingId === req._id ? 'Aprobando...' : 'Aprobar'}
                        </Button>
                        <Button
                          variant="outline-danger"
                          size="sm"
                          onClick={() => openRejectModal(req._id)}
                        >
                          Rechazar
                        </Button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal show={showRejectModal} onHide={() => setShowRejectModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Rechazar solicitud</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="text-muted">Indica el motivo del rechazo (opcional):</p>
          <textarea
            className="form-control"
            rows={3}
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Motivo del rechazo..."
            maxLength={500}
          />
          <small className="text-muted">{rejectReason.length}/500</small>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowRejectModal(false)}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={handleReject} disabled={rejecting}>
            {rejecting ? 'Rechazando...' : 'Rechazar'}
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}

export default Solicitudes;
