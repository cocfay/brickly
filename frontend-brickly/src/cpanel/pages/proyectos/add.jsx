import { useState, useRef, useCallback, useEffect } from 'react';
import { Container, Alert, Spinner } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { createProyecto, updateProyecto, uploadProyectosDirect } from '../../services/proyectos';

import { getCurrentUser } from '../../../services/authService';
import MyTextEditor from '../../components/ckeditor';
import SelectorGaleriaProyectos from '../../components/SelectorGaleriaProyectos';

import arrow from '../../../assets/images/iconos/arrow.png'

function Add() {
    const navigate = useNavigate();
    const currentYear = new Date().getFullYear();
    const [form, setForm] = useState({ title: '', description: '', address: '', date_project: String(currentYear), mainImage: '', mobileImage: '', images: [] });




    // Redirigir si es admin (no puede crear proyectos)
    useEffect(() => {
        const user = getCurrentUser();
        if (user?.roles?.includes("admin")) {
            navigate('/cpanel/proyectos', { replace: true });
        }
    }, [navigate]);
    const [loading, setLoading] = useState(false);
    const [alert, setAlert] = useState(null);

    // Estados para las imágenes principales (guardamos el File para subir directo a PHP)
    const [desktopImage, setDesktopImage] = useState(null); // { file, preview }
    const [mobileImage, setMobileImage] = useState(null);
    const desktopInputRef = useRef(null);
    const mobileInputRef = useRef(null);

    // Drag states
    const [desktopDragOver, setDesktopDragOver] = useState(false);
    const [mobileDragOver, setMobileDragOver] = useState(false);

    const handleChange = (e) => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

    const handleDescriptionChange = (html) => setForm(prev => ({ ...prev, description: html }));

    // Ahora form.images contiene objetos con { file, preview, path }
    // donde .file es el File original (para subir directo a PHP)
    // y .path es null hasta que se suba
    const handleGalleryChange = (images) => setForm(prev => ({ ...prev, images }));

    const processFile = useCallback((file, type) => {
        if (!file) return;

        const preview = URL.createObjectURL(file);
        const imageData = { file, preview };

        if (type === 'desktop') {
            setDesktopImage(imageData);
        } else {
            setMobileImage(imageData);
        }
    }, []);

    const handleImageSelect = (e, type) => {
        const file = e.target.files?.[0];
        processFile(file, type);
        e.target.value = '';
    };

    const handleImageDrop = (e, type) => {
        e.preventDefault();
        e.stopPropagation();
        if (type === 'desktop') setDesktopDragOver(false);
        else setMobileDragOver(false);

        const file = e.dataTransfer.files?.[0];
        processFile(file, type);
    };

    const handleDragOver = (e, type) => {
        e.preventDefault();
        e.stopPropagation();
        if (type === 'desktop') setDesktopDragOver(true);
        else setMobileDragOver(true);
    };

    const handleDragLeave = (e, type) => {
        e.preventDefault();
        e.stopPropagation();
        if (type === 'desktop') setDesktopDragOver(false);
        else setMobileDragOver(false);
    };

    const handleRemoveImage = (type) => {
        if (type === 'desktop') {
            if (desktopImage?.preview?.startsWith('blob:')) URL.revokeObjectURL(desktopImage.preview);
            setDesktopImage(null);
        } else {
            if (mobileImage?.preview?.startsWith('blob:')) URL.revokeObjectURL(mobileImage.preview);
            setMobileImage(null);
        }
    };

    const imagesCount = form.images?.filter(img => img.file).length || 0;
    const isFormValid = form.title && form.description && desktopImage && mobileImage && imagesCount >= 3;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setAlert(null);

        try {
            // Obtener usuario actual para el userId
            const currentUser = getCurrentUser();
            const userId = currentUser?._id || currentUser?.id || currentUser?.sub || 'unknown';

            console.log('📌 userId detectado:', userId);

            // Formatear date_project como objeto Date (YYYY-00-00)
            const formattedDate = form.date_project ? new Date(`${form.date_project}-00-00`) : null;


            // PASO 1: Crear el proyecto PRIMERO (sin imágenes) para obtener el ID
            const tempProjectData = {
                title: form.title,
                description: form.description,
                address: form.address,
                date_project: formattedDate,
                status: 'draft',
                mainImage: '',
                mainImageAlter: '',
                images: []
            };


            console.log('📦 Creando proyecto primero...');
            const createResult = await createProyecto(tempProjectData);

            if (!createResult.success) {
                throw new Error(createResult.error || 'Error al crear el proyecto');
            }

            const newId = createResult.data?._id || createResult.data?.id;
            console.log('✅ Proyecto creado con ID:', newId);

            // PASO 2: Subir imágenes con el projectId para evitar sobrescritura
            const galleryFiles = (form.images || [])
                .map(img => img.file)
                .filter(Boolean);

            console.log('📂 Subiendo imágenes con projectId:', newId);

            const uploadResult = await uploadProyectosDirect({
                userId,
                projectId: newId,
                desktopFile: desktopImage?.file || null,
                mobileFile: mobileImage?.file || null,
                galleryFiles
            });

            if (!uploadResult.success) {
                // Si falla la subida, intentar eliminar el proyecto creado
                try {
                    const { deleteProyecto } = await import('../../services/proyectos');
                    await deleteProyecto(newId);
                } catch (cleanupErr) {
                    console.warn('No se pudo limpiar el proyecto tras error de imágenes:', cleanupErr);
                }
                throw new Error(uploadResult.error || 'Error al subir imágenes');
            }

            console.log('✅ Imágenes subidas correctamente:', uploadResult.data);

            const movedFiles = uploadResult.data.files;

            // PASO 3: Actualizar el proyecto con las rutas de las imágenes
            const updateResult = await updateProyecto(newId, {
                mainImage: movedFiles.mainImage,
                mainImageAlter: movedFiles.mobileImage,
                images: (movedFiles.images || [])
            });

            if (!updateResult.success) {
                throw new Error(updateResult.error || 'Error al actualizar proyecto con imágenes');
            }

            console.log('✅ Proyecto actualizado con imágenes exitosamente');

            setAlert({
                variant: 'success',
                message: 'Proyecto creado exitosamente. Redirigiendo...'
            });

            setTimeout(() => {
                navigate(`/cpanel/proyectos/view/${newId}`);
            }, 1500);

        } catch (error) {
            console.error('❌ Error en handleSubmit:', error);
            setAlert({
                variant: 'danger',
                message: `Error: ${error.message}`
            });
            setTimeout(() => setAlert(null), 5000);
        } finally {
            setLoading(false);
        }
    };


    return (
        <Container>
            <div className="d-flex justify-content-between align-items-center mb-4">
                <div className='fs-1'>Crear proyecto</div>
                <Link to="/cpanel/proyectos" title='Atrás'><img src={arrow} style={{ width: 'clamp(30px, 5vw, 40px)' }} alt="Atrás" srcSet="" /></Link>
            </div>

            {alert && (
                <Alert variant={alert.variant} onClose={() => setAlert(null)} dismissible className="position-fixed bottom-0 end-0 m-3 shadow-sm">
                    <div className="d-flex align-items-center gap-2">
                        <i className={`fa-solid ${alert.variant === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}`}></i>
                        <span>{alert.message}</span>
                    </div>

                </Alert>
            )}

            <form onSubmit={handleSubmit}>
                <div className="row g-4">
                    <div className="col-md-6">
                        <label className="form-label">Título del proyecto*</label>
                        <input
                            type="text" name="title" required
                            className="form-control rounded-pill"
                            value={form.title} onChange={handleChange}
                            placeholder="Ej: Lomas del Orinoco"
                        />
                    </div>
                    <div className="col-md-6">
                        <label className="form-label">Dirección</label>
                        <input
                            type="text" name="address"
                            className="form-control rounded-pill"
                            value={form.address} onChange={handleChange}
                            placeholder="Ej: Zona 14, Ciudad de Guatemala"
                        />
                    </div>
                    <div className="col-md-3">
                        <label className="form-label">Año del proyecto</label>
                        <select
                            name="date_project"
                            className="form-control rounded-pill"
                            value={form.date_project}
                            onChange={handleChange}
                        >
                            <option value="">Seleccionar año</option>
                            {Array.from({ length: 151 }, (_, i) => 1950 + i).map(year => (
                                <option key={year} value={year}>{year}</option>
                            ))}
                        </select>
                    </div>

                    <div className="col-12">
                        <label className="form-label">Descripción</label>


                        <MyTextEditor
                            value={form.description}
                            onChange={handleDescriptionChange}
                        />
                    </div>

                    {/* Imagen de escritorio (panorámica) */}
                    <div className="col-12">
                        <label className="form-label">Imagen principal - Escritorio (panorámica)*</label>
                        <div
                            className={`border-2 rounded-4 d-flex flex-column align-items-center justify-content-center position-relative overflow-hidden ${desktopImage ? 'p-0' : 'p-5'}`}
                            style={{
                                minHeight: '220px',
                                cursor: !desktopImage ? 'pointer' : 'default',
                                borderStyle: 'dashed',
                                borderColor: desktopDragOver ? '#0d6efd' : '#adb5bd',
                                backgroundColor: desktopDragOver ? 'rgba(13, 110, 253, 0.05)' : (desktopImage ? '#000' : '#f8f9fa'),
                                backgroundSize: 'cover',
                                backgroundPosition: 'center',
                            }}
                            onClick={() => !desktopImage && desktopInputRef.current?.click()}
                            onDragOver={(e) => !desktopImage && handleDragOver(e, 'desktop')}
                            onDragLeave={(e) => !desktopImage && handleDragLeave(e, 'desktop')}
                            onDrop={(e) => !desktopImage && handleImageDrop(e, 'desktop')}
                        >
                            {desktopImage ? (
                                <>
                                    <img
                                        src={desktopImage.preview}
                                        alt="Vista previa escritorio"
                                        style={{ width: '100%', height: '260px', objectFit: 'cover' }}
                                    />
                                    <button
                                        type="button"
                                        className="btn btn-danger btn-sm position-absolute top-0 end-0 m-2 rounded-circle d-flex align-items-center justify-content-center"
                                        style={{ width: '32px', height: '32px', zIndex: 10 }}
                                        onClick={(e) => { e.stopPropagation(); handleRemoveImage('desktop'); }}
                                    >
                                        <i className="fa-solid fa-times"></i>
                                    </button>
                                </>
                            ) : (
                                <>
                                    <i className={`fa-solid fa-desktop fs-1 mb-3 ${desktopDragOver ? 'text-primary' : 'text-secondary'}`}></i>
                                    <h6 className="text-dark text-center mb-1">Haz clic o arrastra una imagen panorámica</h6>
                                    <p className="text-muted text-center small mb-0">Recomendado: 1200x600px o similar</p>
                                </>
                            )}
                            <input
                                type="file"
                                ref={desktopInputRef}
                                accept="image/*"
                                style={{ display: 'none' }}
                                onChange={(e) => handleImageSelect(e, 'desktop')}
                            />
                        </div>
                    </div>

                    {/* Imagen móvil (cuadrada) */}
                    <div className="col-12">
                        <label className="form-label">Imagen principal - Móvil (cuadrada)*</label>
                        <div
                            className={`border-2 rounded-4 d-flex flex-column align-items-center justify-content-center position-relative overflow-hidden ${mobileImage ? 'p-0' : 'p-5'}`}
                            style={{
                                minHeight: '220px',
                                maxWidth: '400px',
                                cursor: !mobileImage ? 'pointer' : 'default',
                                borderStyle: 'dashed',
                                borderColor: mobileDragOver ? '#0d6efd' : '#adb5bd',
                                backgroundColor: mobileDragOver ? 'rgba(13, 110, 253, 0.05)' : (mobileImage ? '#000' : '#f8f9fa'),
                                backgroundSize: 'cover',
                                backgroundPosition: 'center',
                            }}
                            onClick={() => !mobileImage && mobileInputRef.current?.click()}
                            onDragOver={(e) => !mobileImage && handleDragOver(e, 'mobile')}
                            onDragLeave={(e) => !mobileImage && handleDragLeave(e, 'mobile')}
                            onDrop={(e) => !mobileImage && handleImageDrop(e, 'mobile')}
                        >
                            {mobileImage ? (
                                <>
                                    <img
                                        src={mobileImage.preview}
                                        alt="Vista previa móvil"
                                        style={{ width: '100%', height: '260px', objectFit: 'cover' }}
                                    />
                                    <button
                                        type="button"
                                        className="btn btn-danger btn-sm position-absolute top-0 end-0 m-2 rounded-circle d-flex align-items-center justify-content-center"
                                        style={{ width: '32px', height: '32px', zIndex: 10 }}
                                        onClick={(e) => { e.stopPropagation(); handleRemoveImage('mobile'); }}
                                    >
                                        <i className="fa-solid fa-times"></i>
                                    </button>
                                </>
                            ) : (
                                <>
                                    <i className={`fa-solid fa-mobile-screen-button fs-1 mb-3 ${mobileDragOver ? 'text-primary' : 'text-secondary'}`}></i>
                                    <h6 className="text-dark text-center mb-1">Haz clic o arrastra una imagen cuadrada</h6>
                                    <p className="text-muted text-center small mb-0">Recomendado: 600x600px o similar</p>
                                </>
                            )}
                            <input
                                type="file"
                                ref={mobileInputRef}
                                accept="image/*"
                                style={{ display: 'none' }}
                                onChange={(e) => handleImageSelect(e, 'mobile')}
                            />
                        </div>
                    </div>

                    {/* Galería de imágenes */}
                    <div className="col-12">
                        <SelectorGaleriaProyectos
                            value={form.images}
                            onChange={handleGalleryChange}
                        />
                    </div>
                </div>
                <div className="d-flex justify-content-end mt-5">
                    <button type="submit" className="btn btn-dark rounded-pill px-4" disabled={loading || !isFormValid}>
                        {loading ? <span className="spinner-border spinner-border-sm me-2" /> : null}
                        Crear proyecto
                    </button>
                </div>
            </form>
        </Container>
    );
}

export default Add;
