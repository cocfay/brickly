import { useState, useEffect, useRef, useCallback } from 'react';
import { Container, Alert, Spinner } from 'react-bootstrap';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getProyectoById, updateProyecto, uploadTempFile, uploadProyectosDirect } from '../../services/proyectos';
import { getCurrentUser } from '../../../services/authService';
import { getLogoUrl } from '../../../services/logoService';
import MyTextEditor from '../../components/ckeditor';
import SelectorGaleriaProyectos from '../../components/SelectorGaleriaProyectos';

import arrow from '../../../assets/images/iconos/arrow.png'

function Edit() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [form, setForm] = useState({ title: '', description: '', address: '', date_project: '', mainImage: '', mobileImage: '', images: [] });



    // Redirigir si es admin (no puede editar proyectos)
    useEffect(() => {
        const user = getCurrentUser();
        if (user?.roles?.includes("admin")) {
            navigate('/cpanel/proyectos', { replace: true });
        }
    }, [navigate]);
    const [loading, setLoading] = useState(false);
    const [loadingShow, setLoadingShow] = useState(true);
    const [alert, setAlert] = useState(null);
    const [originalStatus, setOriginalStatus] = useState(null);

    // Estados para las imágenes principales
    const [desktopImage, setDesktopImage] = useState(null);
    const [mobileImage, setMobileImage] = useState(null);
    const desktopInputRef = useRef(null);
    const mobileInputRef = useRef(null);

    // Drag states
    const [desktopDragOver, setDesktopDragOver] = useState(false);
    const [mobileDragOver, setMobileDragOver] = useState(false);

    useEffect(() => {
        const load = async () => {
            const result = await getProyectoById(id);
            if (result.success) {
                const data = result.data;

                // Guardar el estado original para saber si estaba publicado
                setOriginalStatus(data.status);

                // Formatear imágenes de galería con previews usando getLogoUrl
                const formattedImages = (data.images || []).map(img => {
                    const path = typeof img === 'string' ? img : (img?.path || img?.url || img?.src || '');
                    return {
                        id: `gal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                        _localId: true,
                        path: path,
                        preview: path ? getLogoUrl(path) : null,
                        file: null,
                        uploading: false
                    };
                });

                setForm({
                    title: data.title || '',
                    description: data.description || '',
                    address: data.address || '',
                    date_project: data.date_project ? String(data.date_project).slice(0, 4) : '',
                    mainImage: data.mainImage || '',


                    mobileImage: data.mainImageAlter || '',
                    images: formattedImages
                });


                // Si ya hay imágenes guardadas, mostrar preview (usar getLogoUrl para la URL correcta)
                if (data.mainImage) {
                    setDesktopImage({ preview: getLogoUrl(data.mainImage), path: data.mainImage, uploading: false });
                }
                if (data.mainImageAlter) {
                    setMobileImage({ preview: getLogoUrl(data.mainImageAlter), path: data.mainImageAlter, uploading: false });
                }
            } else {
                setAlert({ variant: 'danger', message: result.error || 'Error al cargar proyecto.' });
            }
            setLoadingShow(false);
        };
        load();
    }, [id]);

    const handleChange = (e) => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

    const handleDescriptionChange = (html) => setForm(prev => ({ ...prev, description: html }));

    const handleGalleryChange = (images) => setForm(prev => ({ ...prev, images }));

    const processFile = useCallback((file, type) => {
        if (!file) return;

        const preview = URL.createObjectURL(file);
        const imageData = { file, preview, path: null, uploading: true };

        if (type === 'desktop') {
            setDesktopImage(imageData);
        } else {
            setMobileImage(imageData);
        }

        uploadTempFile(file).then(result => {
            if (result.success) {
                const updateData = { file, preview, path: result.path, uploading: false };
                if (type === 'desktop') {
                    setDesktopImage(updateData);
                    setForm(prev => ({ ...prev, mainImage: result.path }));
                } else {
                    setMobileImage(updateData);
                    setForm(prev => ({ ...prev, mobileImage: result.path }));
                }
            } else {
                if (type === 'desktop') {
                    setDesktopImage(null);
                } else {
                    setMobileImage(null);
                }
                setAlert({ variant: 'danger', message: `Error al subir imagen ${type === 'desktop' ? 'de escritorio' : 'móvil'}.` });
                setTimeout(() => setAlert(null), 3000);
            }
        });
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
            setForm(prev => ({ ...prev, mainImage: '' }));
        } else {
            if (mobileImage?.preview?.startsWith('blob:')) URL.revokeObjectURL(mobileImage.preview);
            setMobileImage(null);
            setForm(prev => ({ ...prev, mobileImage: '' }));
        }
    };

    const imagesCount = form.images?.length || 0;
    const isFormValid = form.title && form.description && desktopImage?.path && mobileImage?.path && imagesCount >= 3;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setAlert(null);

        try {
            const currentUser = getCurrentUser();
            const userId = currentUser?._id || currentUser?.id || currentUser?.sub || 'unknown';

            console.log('📌 userId detectado:', userId);
            console.log('📌 projectId (edit):', id);

            // Extraer File objects nuevos que tengan file (los que se arrastraron nuevos)
            const galleryFiles = (form.images || [])
                .map(img => img.file)
                .filter(Boolean);

            // Revisar si hay nuevas imágenes para subir
            const hasNewDesktop = desktopImage?.file != null;
            const hasNewMobile = mobileImage?.file != null;
            const hasNewGallery = galleryFiles.length > 0;

            let finalMainImage = form.mainImage;
            let finalMobileImage = form.mobileImage;
            // Asegurar que finalImages sea un array de strings (paths) como espera la API
            let finalImages = (form.images || []).map(img => {
                // Si ya es string, usarlo directamente
                if (typeof img === 'string') return img;
                // Si tiene path, extraer el string
                return img?.path || img?.url || img?.src || '';
            }).filter(Boolean);

            if (hasNewDesktop || hasNewMobile || hasNewGallery) {
                console.log(' Subiendo nuevas imágenes a uploads/proye_arqui/' + userId + '/ ...');

                const uploadResult = await uploadProyectosDirect({
                    userId,
                    projectId: id,
                    desktopFile: hasNewDesktop ? desktopImage.file : null,
                    mobileFile: hasNewMobile ? mobileImage.file : null,
                    galleryFiles
                });


                if (!uploadResult.success) {
                    throw new Error(uploadResult.error || 'Error al subir imágenes');
                }

                console.log('✅ Nuevas imágenes subidas:', uploadResult.data);
                const movedFiles = uploadResult.data.files;

                if (hasNewDesktop && movedFiles.mainImage) {
                    finalMainImage = movedFiles.mainImage;
                }
                if (hasNewMobile && movedFiles.mobileImage) {
                    finalMobileImage = movedFiles.mobileImage;
                }
                if (hasNewGallery && movedFiles.images) {
                    // Conservar solo las imágenes viejas que NO tienen file (las existentes)
                    const oldPaths = (form.images || [])
                        .filter(img => !img?.file && (typeof img === 'string' || img?.path))
                        .map(img => typeof img === 'string' ? img : img.path);
                    // Combinar paths viejos (sin cambios) + paths nuevos
                    finalImages = [...oldPaths, ...movedFiles.images];
                }
            } else {
                // Sin nuevos uploads: enviar solo los paths (strings) de imágenes existentes
                finalImages = (form.images || []).map(img => {
                    if (typeof img === 'string') return img;
                    return img?.path || '';
                }).filter(Boolean);
            }

            const projectData = {
                title: form.title,
                description: form.description,
                address: form.address,
                date_project: form.date_project,
                mainImage: finalMainImage,

                mainImageAlter: finalMobileImage,
                images: finalImages
            };


            console.log('📦 Datos finales del proyecto:', projectData);

            // Si el proyecto estaba publicado, cambiar a pre-published para requerir aprobación
            if (originalStatus === 'published') {
                projectData.status = 'pre-published';
            }

            const updateResult = await updateProyecto(id, projectData);

            if (!updateResult.success) {
                throw new Error(updateResult.error || 'Error al actualizar el proyecto');
            }

            console.log('✅ Proyecto actualizado exitosamente:', updateResult.data);

            setAlert({
                variant: 'success',
                message: 'Proyecto actualizado exitosamente. Redirigiendo...'
            });

            setTimeout(() => {
                navigate(`/cpanel/proyectos/view/${id}`);
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

    if (loadingShow) return (
        <Container className="text-center py-5">
            <div className="spinner-border text-primary" />
        </Container>
    );

    return (
        <Container>
            <div className="d-flex justify-content-between align-items-center mb-4">
                <div className='fs-1'>Editar proyecto</div>
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
                                cursor: desktopImage?.uploading ? 'wait' : (!desktopImage ? 'pointer' : 'default'),
                                borderStyle: 'dashed',
                                borderColor: desktopDragOver ? '#0d6efd' : '#adb5bd',
                                backgroundColor: desktopDragOver ? 'rgba(13, 110, 253, 0.05)' : (desktopImage ? '#000' : '#f8f9fa'),
                            }}
                            onClick={() => !desktopImage?.uploading && !desktopImage && desktopInputRef.current?.click()}
                            onDragOver={(e) => !desktopImage?.uploading && !desktopImage && handleDragOver(e, 'desktop')}
                            onDragLeave={(e) => !desktopImage?.uploading && !desktopImage && handleDragLeave(e, 'desktop')}
                            onDrop={(e) => !desktopImage?.uploading && !desktopImage && handleImageDrop(e, 'desktop')}
                        >
                            {desktopImage ? (
                                <>
                                    <img
                                        src={desktopImage.preview}
                                        alt="Vista previa escritorio"
                                        style={{ width: '100%', height: '260px', objectFit: 'cover' }}
                                    />
                                    {desktopImage.uploading && (
                                        <div className="position-absolute top-0 start-0 w-100 h-100 d-flex flex-column align-items-center justify-content-center bg-white bg-opacity-75">
                                            <Spinner animation="border" variant="primary" className="mb-2" />
                                            <span className="text-primary fw-bold">Subiendo...</span>
                                        </div>
                                    )}
                                    {!desktopImage.uploading && (
                                        <button
                                            type="button"
                                            className="btn btn-danger btn-sm position-absolute top-0 end-0 m-2 rounded-circle d-flex align-items-center justify-content-center"
                                            style={{ width: '32px', height: '32px', zIndex: 10 }}
                                            onClick={(e) => { e.stopPropagation(); handleRemoveImage('desktop'); }}
                                        >
                                            <i className="fa-solid fa-times"></i>
                                        </button>
                                    )}
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
                                disabled={desktopImage?.uploading}
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
                                cursor: mobileImage?.uploading ? 'wait' : (!mobileImage ? 'pointer' : 'default'),
                                borderStyle: 'dashed',
                                borderColor: mobileDragOver ? '#0d6efd' : '#adb5bd',
                                backgroundColor: mobileDragOver ? 'rgba(13, 110, 253, 0.05)' : (mobileImage ? '#000' : '#f8f9fa'),
                            }}
                            onClick={() => !mobileImage?.uploading && !mobileImage && mobileInputRef.current?.click()}
                            onDragOver={(e) => !mobileImage?.uploading && !mobileImage && handleDragOver(e, 'mobile')}
                            onDragLeave={(e) => !mobileImage?.uploading && !mobileImage && handleDragLeave(e, 'mobile')}
                            onDrop={(e) => !mobileImage?.uploading && !mobileImage && handleImageDrop(e, 'mobile')}
                        >
                            {mobileImage ? (
                                <>
                                    <img
                                        src={mobileImage.preview}
                                        alt="Vista previa móvil"
                                        style={{ width: '100%', height: '260px', objectFit: 'cover' }}
                                    />
                                    {mobileImage.uploading && (
                                        <div className="position-absolute top-0 start-0 w-100 h-100 d-flex flex-column align-items-center justify-content-center bg-white bg-opacity-75">
                                            <Spinner animation="border" variant="primary" className="mb-2" />
                                            <span className="text-primary fw-bold">Subiendo...</span>
                                        </div>
                                    )}
                                    {!mobileImage.uploading && (
                                        <button
                                            type="button"
                                            className="btn btn-danger btn-sm position-absolute top-0 end-0 m-2 rounded-circle d-flex align-items-center justify-content-center"
                                            style={{ width: '32px', height: '32px', zIndex: 10 }}
                                            onClick={(e) => { e.stopPropagation(); handleRemoveImage('mobile'); }}
                                        >
                                            <i className="fa-solid fa-times"></i>
                                        </button>
                                    )}
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
                                disabled={mobileImage?.uploading}
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
                        Guardar cambios
                    </button>
                </div>
            </form>
        </Container>
    );
}

export default Edit;
