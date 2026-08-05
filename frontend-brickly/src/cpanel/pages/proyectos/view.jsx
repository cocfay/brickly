import { useEffect, useState } from 'react';
import { Container } from 'react-bootstrap';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { getProyectoById, updateProyecto } from '../../services/proyectos';
import { getCurrentUser } from '../../../services/authService';
import alertify from 'alertifyjs';

import Apartament from '../../../pages/projects/apartament.jsx';

function View() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [proyecto, setProyecto] = useState(null);
    const [loading, setLoading] = useState(true);

    const currentUser = getCurrentUser();
    const isAdmin = currentUser?.roles?.includes('admin');

    useEffect(() => {
        if (!id) return;

        const load = async () => {
            setLoading(true);
            const result = await getProyectoById(id);
            if (result.success) {
                setProyecto(result.data);
            }
            setLoading(false);
        };
        load();
    }, [id]);

    // Admin: aprobar (pre-published→published) o borrador (published→draft)
    const changeStatus = async () => {
        try {
            const getData = await getProyectoById(id);
            const currentStatus = getData?.data?.status;

            let newStatus;
            if (currentStatus === 'pre-published') {
                newStatus = 'published';
            } else if (currentStatus === 'published') {
                newStatus = 'draft';
            } else {
                return;
            }

            const update = await updateProyecto(id, { status: newStatus });
            setProyecto(prev => ({ ...prev, status: newStatus }));
            if (update.success) {
                const msg = newStatus === 'published' ? 'Proyecto aprobado y publicado' : 'Proyecto colocado como borrador';
                alertify.alert("BRICKLY HOMES", `<center>${msg}.</center>`);
            }
        } catch (errors) {
            console.error(errors);
        }
    };

    // No-admin: publicar (draft→pre-published) o borrador (pre-published→draft)
    const changeStatusNonAdmin = async (targetStatus) => {
        // Solo validar cuando intenta enviar a revisión (draft → pre-published)
        if (targetStatus === 'pre-published') {
            // 1. Validar que todos los campos del proyecto estén completos
            const requiredFields = [
                { field: 'title', label: 'Título' },
                { field: 'description', label: 'Descripción' },
                { field: 'address', label: 'Dirección' },
                { field: 'date_project', label: 'Año del proyecto' },
                { field: 'mainImage', label: 'Imagen principal (escritorio)' },
                { field: 'mainImageAlter', label: 'Imagen principal (móvil)' }
            ];

            const missingFields = requiredFields.filter(({ field }) => {
                const value = proyecto[field];
                return !value || (typeof value === 'string' && value.trim() === '');
            });

            const galleryCount = (proyecto.images || []).length;
            if (galleryCount < 3) {
                missingFields.push({ label: `Galería de imágenes (faltan ${3 - galleryCount} imágenes)` });
            }

            if (missingFields.length > 0) {
                const fieldList = missingFields.map(f => `• ${f.label}`).join('<br>');
                alertify.alert(
                    "BRICKLY HOMES",
                    `<center><b>Completa todos los campos del proyecto antes de enviarlo a revisión:</b><br><br>${fieldList}</center>`
                );
                return;
            }

            // 2. Validar que tenga un proyecto favorito seleccionado
            const user = getCurrentUser();
            if (!user?.agentInfo?.favoriteProject) {
                alertify.alert(
                    "BRICKLY HOMES",
                    `<center>Debes seleccionar un proyecto favorito antes de publicar.<br><br>Serás redirigido para elegir uno.</center>`,
                    () => {
                        navigate('/cpanel/proyectos/favoritos');
                    }
                );
                return;
            }
        }

        try {
            const update = await updateProyecto(id, { status: targetStatus });
            setProyecto(prev => ({ ...prev, status: targetStatus }));
            if (update.success) {
                const msg = targetStatus === 'pre-published' ? 'Proyecto enviado para aprobación' : 'Proyecto colocado como borrador';
                alertify.alert("BRICKLY HOMES", `<center>${msg}.</center>`);
            }
        } catch (errors) {
            console.error(errors);
        }
    };

    if (loading) {
        return (
            <Container className="text-center py-5">
                <div className="spinner-border text-primary" />
                <p className="mt-3">Cargando proyecto...</p>
            </Container>
        );
    }

    if (!proyecto) {
        return (
            <Container className="text-center py-5">
                <p className="text-muted">Proyecto no encontrado</p>
                <Link to="/cpanel/proyectos" className="btn btn-dark rounded-pill px-4">Volver a proyectos</Link>
            </Container>
        );
    }

    return (
        <div className='position-relative'>
            {/* Vista pública del proyecto dentro del layout del cpanel */}
            <Apartament preview />

            {/* Botones flotantes */}
            {isAdmin ? (
                proyecto.status === 'pre-published' && (
                    <div className="position-fixed bottom-0 end-0 me-3 mb-3" style={{ zIndex: 1999 }}>
                        <div
                            className="bg-success text-white py-2 px-4 rounded-3"
                            style={{ width: 'fit-content', cursor: 'pointer' }}
                            onClick={changeStatus}
                        >
                            Aprobar proyecto
                        </div>
                    </div>
                )
            ) : (
                <div className="position-fixed bottom-0 end-0 me-3 mb-3 d-flex flex-column gap-2" style={{ zIndex: 1999 }}>
                    {proyecto?.status === 'draft' && (
                        <button
                            onClick={() => changeStatusNonAdmin('pre-published')}
                            className="d-flex align-items-center justify-content-center text-white rounded-circle border-0"
                            style={{ width: '52px', height: '52px', fontSize: '20px', backgroundColor: '#198754', cursor: 'pointer' }}
                            title="Enviar a revisión"
                        >
                            <i className="fa-solid fa-check"></i>
                        </button>
                    )}
                    {proyecto?.status && proyecto?.status !== 'draft' && (
                        <button
                            onClick={() => changeStatusNonAdmin('draft')}
                            className="d-flex align-items-center justify-content-center text-white rounded-circle border-0"
                            style={{ width: '52px', height: '52px', fontSize: '20px', backgroundColor: '#6c757d', cursor: 'pointer' }}
                            title="Colocar como borrador"
                        >
                            <i className="fa-duotone fa-solid fa-file-pen"></i>
                        </button>
                    )}
                    <Link
                        to={`/cpanel/proyectos/edit/${id}`}
                        className="d-flex align-items-center justify-content-center bg-dark text-white rounded-circle"
                        style={{ width: '52px', height: '52px', fontSize: '20px', textDecoration: 'none' }}
                        title="Editar proyecto"
                    >
                        <i className="fa-duotone fa-solid fa-pen-to-square"></i>
                    </Link>
                </div>
            )}
        </div>
    );
}

export default View;
