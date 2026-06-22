import { useEffect, useState } from 'react';
import { Container, Row, Col, Alert } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { getProyectosByUser } from '../../services/proyectos';
import { getCurrentUser, updateUserProfile } from '../../../services/authService';
import { getLogoUrl } from '../../../services/logoService';
import arrow from '../../../assets/images/iconos/arrow.png';
import sinPropiedad from './../../assets/images/iconos/sinPropiedad.png';

function Favoritos() {
    const [proyectos, setProyectos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedProject, setSelectedProject] = useState(null);
    const [currentUser, setCurrentUser] = useState(null);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            const user = getCurrentUser();
            setCurrentUser(user);
            const userId = user?._id || user?.id;
            if (!userId) {
                setLoading(false);
                return;
            }

            // Cargar proyectos del usuario
            const result = await getProyectosByUser(userId);
            if (result.success) {
                const data = Array.isArray(result.data) ? result.data : [];
                setProyectos(data);
            }

            // Verificar si ya tiene un favoriteProject
            if (user?.agentInfo?.favoriteProject) {
                setSelectedProject(user.agentInfo.favoriteProject);
            }

            setLoading(false);
        };
        load();
    }, []);

    const getImageSrc = (path) => {
        if (!path || path === '') return sinPropiedad;
        return path.startsWith('http') ? path : getLogoUrl(path);
    };

    const handleSelectProject = async (proyecto) => {
        // Usar la imagen móvil (mainImageAlter) o la desktop como fallback
        const imagePath = proyecto.mainImageAlter || proyecto.mainImage;
        if (!imagePath) {
            setMessage({ type: 'danger', text: 'Este proyecto no tiene imagen disponible.' });
            return;
        }

        setSaving(true);
        setMessage(null);

        const user = getCurrentUser();

        // Actualizar agentInfo.favoriteProject
        const currentAgentInfo = user?.agentInfo || {};
        const payload = {
            agentInfo: {
                ...currentAgentInfo,
                favoriteProject: imagePath
            }
        };

        const result = await updateUserProfile(payload);
        if (result.success) {
            setSelectedProject(imagePath);
            setMessage({ type: 'success', text: '¡Proyecto favorito guardado correctamente!' });
            setTimeout(() => setMessage(null), 1500);
        } else {
            setMessage({ type: 'danger', text: result.error || 'Error al guardar el proyecto favorito.' });
            setTimeout(() => setMessage(null), 1500);
        }

        setSaving(false);
    };

    const hasFavoriteProject = currentUser?.agentInfo?.favoriteProject;

    return (
        <Container>
            <div className="d-flex justify-content-between">
                <div>
                    <div className='fs-1'>Mis proyectos</div>
                    <div className='text-muted mb-4' style={{ fontSize: '16px' }}>
                        Aquí podrás seleccionar el proyecto que quieras que se vea como fondo en tu card de presentación.
                    </div>
                </div>
                <Link to="/cpanel/proyectos" className='d-block' title='Atrás'>
                    <img src={arrow} style={{ width: 'clamp(30px, 5vw, 40px)' }} alt="Atrás" />
                </Link>
            </div>

            {!hasFavoriteProject && (
                <div className="alert alert-info d-flex align-items-center gap-2 mb-4" role="alert">
                    <i className="fa-solid fa-info-circle"></i>
                    <span>Selecciona tu proyecto favorito para que aparezca en tu card de presentación.</span>
                </div>
            )}

            {message && (
                <Alert variant={message.type} onClose={() => setMessage(null)} dismissible className="position-fixed bottom-0 end-0 m-3 shadow-sm" style={{ zIndex: 9999 }}>
                    <div className="d-flex align-items-center gap-2">
                        <i className={`fa-solid ${message.type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}`}></i>
                        <span>{message.text}</span>
                    </div>
                </Alert>
            )}

            {loading ? (
                <div className="text-center py-5">
                    <div className="spinner-border text-primary" />
                    <p className="mt-3">Cargando proyectos...</p>
                </div>
            ) : proyectos.length === 0 ? (
                <div className="text-center py-5 text-muted">
                    <i className="fa-solid fa-folder-open fa-3x mb-3"></i>
                    <p>No tienes proyectos aún.</p>
                </div>
            ) : (
                <Row className='g-4'>
                    {proyectos.map((proyecto) => {
                        const imagePath = proyecto.mainImageAlter || proyecto.mainImage;
                        const isSelected = selectedProject === imagePath;

                        return (
                            <Col key={proyecto._id} md={3} sm={6}>
                                <div
                                    className={`position-relative border rounded-1 p-2 cursor-pointer ${
                                        isSelected ? 'border-dark border-2' : 'border-secondary'
                                    }`}
                                    style={{
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                        background: isSelected ? '#f8f9fa' : 'white'
                                    }}
                                    onClick={() => !saving && handleSelectProject(proyecto)}
                                >
                                    {isSelected && (
                                        <div className="position-absolute top-0 end-0 m-2 bg-dark text-white rounded-circle d-flex align-items-center justify-content-center" 
                                             style={{ width: '28px', height: '28px', zIndex: 2 }}>
                                            <i className="fa-solid fa-check" style={{ fontSize: '14px' }}></i>
                                        </div>
                                    )}
                                    <img
                                        src={getImageSrc(imagePath)}
                                        alt={proyecto.title || 'Proyecto'}
                                        className='w-100 object-fit-cover rounded-1'
                                        style={{ height: '200px' }}
                                    />
                                    <div className='mt-2 text-center fw-medium' style={{ fontSize: '15px' }}>
                                        {proyecto.title || proyecto.name || 'Sin título'}
                                    </div>
                                    {proyecto.status && (
                                        <div className='text-center mt-1'>
                                            <span className={`badge ${
                                                proyecto.status === 'published' ? 'bg-success' :
                                                proyecto.status === 'pre-published' ? 'bg-warning text-dark' :
                                                proyecto.status === 'draft' ? 'bg-secondary' :
                                                'bg-dark'
                                            }`} style={{ fontSize: '11px' }}>
                                                {proyecto.status === 'published' ? 'Publicado' :
                                                 proyecto.status === 'pre-published' ? 'Pendiente' :
                                                 proyecto.status === 'draft' ? 'Borrador' :
                                                 proyecto.status}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </Col>
                        );
                    })}
                </Row>
            )}

            {saving && (
                <div className="position-fixed bottom-0 end-0 m-3" style={{ zIndex: 9999 }}>
                    <div className="bg-dark text-white py-2 px-4 rounded-3 d-flex align-items-center gap-2">
                        <span className="spinner-border spinner-border-sm" aria-hidden="true"></span>
                        Guardando...
                    </div>
                </div>
            )}
        </Container>
    );
}

export default Favoritos;
