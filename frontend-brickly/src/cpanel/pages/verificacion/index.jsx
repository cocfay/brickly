import { useEffect, useState, useMemo } from 'react';
import { Container, Alert, Spinner, Pagination } from 'react-bootstrap';
import { getAgenciesForVerification, updateAgencyVerification } from '../../services/verificacion';
import { API_URL } from '../../../services/authService';
import nPhoto from '../../../assets/images/logos/notPhoto.png';

const ITEMS_PER_PAGE = 12;

function Verificacion() {
    const [agencies, setAgencies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [alert, setAlert] = useState({ show: false, variant: '', message: '' });
    const [verifyingIds, setVerifyingIds] = useState(new Set());

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            const result = await getAgenciesForVerification();
            if (result.success) {
                setAgencies(result.data);
            } else {
                setAlert({ show: true, variant: 'danger', message: result.error || 'Error al cargar agencias' });
            }
            setLoading(false);
        };
        load();
    }, []);

    // Filtrar por búsqueda
    const filteredAgencies = useMemo(() => {
        if (!searchTerm.trim()) return agencies;
        const term = searchTerm.toLowerCase().trim();
        return agencies.filter(a =>
            (a.name || '').toLowerCase().includes(term) ||
            (a.username || '').toLowerCase().includes(term)
        );
    }, [agencies, searchTerm]);

    // Paginación
    const totalPages = Math.ceil(filteredAgencies.length / ITEMS_PER_PAGE);
    const paginatedAgencies = useMemo(() => {
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredAgencies.slice(start, start + ITEMS_PER_PAGE);
    }, [filteredAgencies, currentPage]);

    // Resetear página al buscar
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm]);

    const handleToggleVerification = async (agency) => {
        const id = agency._id;
        const newVerified = !(agency.agentInfo?.verified === true);

        setVerifyingIds(prev => new Set(prev).add(id));

        const result = await updateAgencyVerification(id, newVerified);
        if (result.success) {
            // Actualizar estado local
            setAgencies(prev => prev.map(a =>
                a._id === id
                    ? { ...a, agentInfo: { ...a.agentInfo, verified: newVerified } }
                    : a
            ));
            setAlert({
                show: true,
                variant: 'success',
                message: newVerified
                    ? `Agencia "${agency.name || agency.username}" verificada exitosamente`
                    : `Verificación removida de "${agency.name || agency.username}"`
            });
        } else {
            setAlert({
                show: true,
                variant: 'danger',
                message: result.error || 'Error al actualizar verificación'
            });
        }

        setVerifyingIds(prev => {
            const next = new Set(prev);
            next.delete(id);
            return next;
        });

        setTimeout(() => setAlert(prev => ({ ...prev, show: false })), 4000);
    };

    const renderPagination = () => {
        if (totalPages <= 1) return null;

        const items = [];
        const maxVisible = 5;
        let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
        let end = Math.min(totalPages, start + maxVisible - 1);
        if (end - start + 1 < maxVisible) {
            start = Math.max(1, end - maxVisible + 1);
        }

        items.push(
            <Pagination.Prev
                key="prev"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
            />
        );

        if (start > 1) {
            items.push(<Pagination.Item key={1} onClick={() => setCurrentPage(1)}>1</Pagination.Item>);
            if (start > 2) items.push(<Pagination.Ellipsis key="start-ellipsis" disabled />);
        }

        for (let i = start; i <= end; i++) {
            items.push(
                <Pagination.Item key={i} active={i === currentPage} onClick={() => setCurrentPage(i)}>
                    {i}
                </Pagination.Item>
            );
        }

        if (end < totalPages) {
            if (end < totalPages - 1) items.push(<Pagination.Ellipsis key="end-ellipsis" disabled />);
            items.push(
                <Pagination.Item key={totalPages} onClick={() => setCurrentPage(totalPages)}>
                    {totalPages}
                </Pagination.Item>
            );
        }

        items.push(
            <Pagination.Next
                key="next"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
            />
        );

        return <Pagination className="justify-content-center mt-4">{items}</Pagination>;
    };

    return (
        <Container>
            <div className="d-flex justify-content-between align-items-center mb-4">
                <div style={{ fontSize: 'clamp(24px, 3vw, 40px)' }}>Verificación GPI</div>
            </div>

            {alert.show && (
                <Alert
                    variant={alert.variant}
                    onClose={() => setAlert({ ...alert, show: false })}
                    dismissible
                    className="position-fixed bottom-0 end-0 m-3 shadow-sm"
                    style={{ zIndex: 9999 }}
                >
                    <div className="d-flex align-items-center gap-2">
                        <i className={`fa-solid ${alert.variant === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}`}></i>
                        <span>{alert.message}</span>
                    </div>
                </Alert>
            )}

            {/* Buscador */}
            <div className="mb-4">
                <div className="position-relative" style={{ maxWidth: '400px' }}>
                    <i className="fa-solid fa-search position-absolute top-50 start-0 translate-middle-y ms-3 text-muted"></i>
                    <input
                        type="text"
                        className="form-control rounded-pill ps-5"
                        placeholder="Buscar agencia por nombre..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {loading ? (
                <div className="text-center py-5">
                    <Spinner animation="border" variant="dark" />
                    <p className="mt-3 text-muted">Cargando agencias...</p>
                </div>
            ) : filteredAgencies.length === 0 ? (
                <div className="text-center py-5">
                    <i className="fa-solid fa-building-circle-exclamation text-muted" style={{ fontSize: '3rem' }}></i>
                    <p className="mt-3 text-muted">
                        {searchTerm
                            ? 'No se encontraron agencias con ese nombre'
                            : 'No hay agencias que cumplan con los requisitos de verificación'}
                    </p>
                </div>
            ) : (
                <>
                    <div className="mb-3 text-muted small">
                        Mostrando {paginatedAgencies.length} de {filteredAgencies.length} agencia(s)
                    </div>

                    <div className="row g-3">
                        {paginatedAgencies.map(agency => {
                            const isVerified = agency.agentInfo?.verified === true;
                            const isVerifying = verifyingIds.has(agency._id);
                            const avatarSrc = agency.avatarUrl || nPhoto;

                            return (
                                <div key={agency._id} className="col-12 col-sm-6 col-md-4 col-lg-3">
                                    <div className="card border rounded-3 shadow-sm h-100">
                                        <div className="card-body d-flex flex-column align-items-center text-center p-3">
                                            {/* Avatar con badge de verificación */}
                                            <div className="position-relative mb-2" style={{ width: '80px', height: '80px' }}>
                                                <img
                                                    src={avatarSrc}
                                                    alt={agency.name || 'Agencia'}
                                                    className="rounded-circle object-fit-cover w-100 h-100 border"
                                                    style={{ backgroundColor: '#f0f0f0' }}
                                                    onError={(e) => { e.target.src = nPhoto; }}
                                                />
                                                {isVerified && (
                                                    <div
                                                        className="position-absolute d-flex align-items-center justify-content-center"
                                                        style={{
                                                            top: '-4px',
                                                            left: '-4px',
                                                            width: '28px',
                                                            height: '28px',
                                                            backgroundColor: '#198754',
                                                            borderRadius: '50%',
                                                            border: '2px solid white'
                                                        }}
                                                    >
                                                        <i className="fa-solid fa-check text-white" style={{ fontSize: '14px' }}></i>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Nombre */}
                                            <h6 className="card-title mb-1" style={{ fontSize: '14px', fontWeight: 600 }}>
                                                {agency.name || agency.username || 'Sin nombre'}
                                            </h6>

                                            {/* Agentes count */}
                                            <small className="text-muted mb-2">
                                                <i className="fa-solid fa-address-card me-1"></i>
                                                {agency.agentCount} agente(s)
                                            </small>

                                            {/* Botón Verificar / Remover */}
                                            <button
                                                className={`btn btn-sm mt-auto px-4 d-flex align-items-center ${
                                                    isVerified
                                                        ? 'btn-outline-danger'
                                                        : 'btn-dark'
                                                }`}
                                                style={{ borderRadius: '20px', fontSize: '13px' }}
                                                onClick={() => handleToggleVerification(agency)}
                                                disabled={isVerifying}
                                            >
                                                {isVerifying ? (
                                                    <>
                                                        <Spinner as="span" animation="border" size="sm" className="me-1" />
                                                        {isVerified ? 'Removiendo...' : 'Verificando...'}
                                                    </>
                                                ) : isVerified ? (
                                                    <>
                                                        <i className="fa-solid fa-xmark me-1"></i> Remover
                                                    </>
                                                ) : (
                                                    <>
                                                        <i className="fa-solid fa-check me-1"></i> Verificar
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {renderPagination()}
                </>
            )}
        </Container>
    );
}

export default Verificacion;
