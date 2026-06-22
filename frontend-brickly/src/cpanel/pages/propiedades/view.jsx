import { Link, useParams } from 'react-router-dom';
import { Container, Breadcrumb, Button, Row, Col, Alert, Modal } from 'react-bootstrap';
import 'glightbox/dist/css/glightbox.min.css';
import '../../../assets/css/glightbox-custom.css';
import useGLightbox from '../../../assets/js/useGLightbox'; 
import { useCurrency } from '../../../context/CurrencyContext';
import { getDisplayPrice } from '../../../utils/priceUtils';
import StarRating from '../../../components/StarRating';
import { FormattedMessage } from 'react-intl';
import alertify from 'alertifyjs';

import { getPropiedadById, updatePropiedad } from '../../services/propiedades';
import { getUsers } from '../../../services/listUsers';
import { getCurrentUser, API_URL } from '../../../services/authService'; // 👈 I
import { amenitiesMap } from './../../data/amenites'

import alquiler from '../../../assets/images/iconos/alquiler.png';
import venta from '../../../assets/images/iconos/venta.png';
import space from '../../../assets/images/iconos/spaces.png';

import avatar from '../../../assets/images/iconos/avatar.png';
import diamond from '../../../assets/images/iconos/diamond.png';
import noLike from '../../../assets/images/iconos/noLike.png';
import tour from '../../../assets/images/iconos/IconoTour.png';
import arrow from '../../../assets/images/iconos/arrow.png'

import { useEffect, useState } from 'react';
import { useT } from '../../../hooks/useT';
import { validateRequiredFields } from '../../services/validacionPropiedades';
import './../../../assets/css/asesores.css';

function View() {



    const t = useT()
    const lang = localStorage.getItem('selectedLang')
    const { id } = useParams()
    const URL = API_URL
    const ame = amenitiesMap

    const currentUser = getCurrentUser();
    const isAdmin = currentUser?.roles?.includes('admin');

    /* const [alert, setalert] = useState({ show: false, variant: '', message: '' }) */
    const [status, setstatus] = useState()
    const [data, setdata] = useState(null)
    const [amenities, setamenities] = useState([])
    const [agentes, setAgentes] = useState([])
    const [loadingAgentes, setLoadingAgentes] = useState(true)
    const [showShare, setShowShare] = useState(false)
    const [showTourModal, setShowTourModal] = useState(false);
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [rejectReasons, setRejectReasons] = useState({ lowImagen: false, incompleteData: false, otherReason: false });
    const [rejectOtherReasonText, setRejectOtherReasonText] = useState('');

    const lightbox = useGLightbox({
        autoplayVideos: false,
        openEffect: 'zoom',
        closeEffect: 'fade'
    }, [data]);

    useEffect(()  => {
        const loadData = async () =>{
            try{
                const getData = await getPropiedadById(id)
                
                const dataa = {
                    ...getData.data,
                    dimensions: {
                        ...getData.data.dimensions,
                        landM2: getData.data.dimensions?.landM2 || 0,
                        landV2: getData.data.dimensions?.landV2 || 0,
                    }
                }
                
                setdata(dataa)

                /* console.log(getData?.data?.amenities);
                console.log(Object.keys(ame)); */
                const amenitiesData = getData?.data?.amenities
                const keyAme = amenitiesData && typeof amenitiesData === 'object' && !Array.isArray(amenitiesData)
                  ? Object.keys(amenitiesData)
                  : []
                const filterAmenities = keyAme.map(key => ame[key]).filter(valor => valor !==undefined)
                setamenities(filterAmenities);

                // Cargar agentes de la propiedad
                setLoadingAgentes(true)
                const agentIds = getData?.data?.agents || []
                const users = await getUsers()
                if (users.success) {
                    // Filtrar solo agentes y agencias (roles relevantes)
                    const relevantUsers = users.data.filter(u =>
                        Array.isArray(u.roles) && (u.roles.includes('agente') || u.roles.includes('agencia'))
                    );
                    const usersMap = {}
                    relevantUsers.forEach(u => { usersMap[u._id] = u })

                    if (agentIds.length > 0) {
                        const agentesData = agentIds
                            .map(agId => usersMap[agId])
                            .filter(Boolean)
                            .map(agent => ({
                                ...agent,
                                avatar: URL + agent.avatar.replace('/uploads', ''),
                                agencia: agent.parentId ? usersMap[agent.parentId]?.name || null : null
                            }))
                        setAgentes(agentesData)
                    } else {
                        // No hay agentes asignados — mostrar info del creador (agencia)
                        const ownerId = getData?.data?.userId
                        if (ownerId && usersMap[ownerId]) {
                            const owner = usersMap[ownerId]
                            setAgentes([{
                                ...owner,
                                avatar: owner.avatar ? URL + owner.avatar.replace('/uploads', '') : null,
                                agencia: null,
                                _isOwner: true
                            }])
                        }
                    }
                }
                
                if(getData?.data?.status == "draft")
                    setstatus({bg: 'bg-success', message: 'Publicar propiedad'})
                else if(getData?.data?.status == "published")
                    setstatus({bg: 'bg-secondary', message: 'Colocar como borrador'})
                else if(getData?.data?.status == "pre-published" && isAdmin)
                    setstatus({bg: 'bg-success', message: 'Aprobar propiedad'})
                else if(getData?.data?.status == "disabled" && isAdmin)
                    setstatus({bg: 'bg-success', message: 'Aprobar propiedad'})
                else if(getData?.data?.status == "rejected")
                    setstatus({bg: 'bg-danger', message: 'Rechazada'})
            } catch(errors){
                console.error("Error" + errors)
            } finally {
                setLoadingAgentes(false)
            }
        }
        loadData()
    },[])

    // Función para actualizar la apariencia del botón
    const updateVisualStatus = (dbStatus) => {
        if (dbStatus === "draft") {
            setstatus({ bg: 'bg-success', message: 'Publicar propiedad' });
        } else if (dbStatus === "pre-published" && isAdmin) {
            setstatus({ bg: 'bg-warning text-dark', message: 'Aprobar propiedad' });
        } else if (dbStatus === "disabled" && isAdmin) {
            setstatus({ bg: 'bg-success', message: 'Aprobar propiedad' });
        } else if (dbStatus === "published") {
            setstatus({ bg: 'bg-secondary', message: 'Colocar como borrador' });
        } else if (dbStatus === "rejected") {
            setstatus({ bg: 'bg-danger', message: 'Rechazada' });
        } else {
            setstatus(null);
        }
    };

    // Admin: aprobar (pre-published→published), borrador (published→draft) o rechazar (pre-published→rejected)
    const changeStatus = async () => {
        try {
            const getData = await getPropiedadById(id)
            const currentStatus = getData?.data?.status;

            const totalPhotos = getData?.data?.media?.photos?.length || 0;
            if (totalPhotos < 3) {
                alertify.alert("BRICKLY HOMES", "<center>Se recomiendan al menos 3 imágenes (1 principal y 2 secundarias) para un mejor anuncio.</center>")
                return;
            }

            let newStatus;
            if (currentStatus === 'pre-published') {
                newStatus = 'published';
            } else if (currentStatus === 'published') {
                newStatus = 'draft';
            } else {
                return;
            }

            const update = await updatePropiedad(getData?.data?._id, { status: newStatus })
            if (update.success) {
                updateVisualStatus(newStatus)
                setdata(prev => ({ ...prev, status: newStatus }))
                const msg = newStatus === 'published' ? 'Propiedad aprobada y publicada' : 'Propiedad colocada como borrador'
                alertify.alert("BRICKLY HOMES", `<center>${msg}.</center>`)
                // Notificar al DataTable que el estado cambió
                window.dispatchEvent(new CustomEvent('propiedad-status-changed', {
                    detail: { id: getData?.data?._id, newStatus }
                }));
            }
        } catch (errors) {
            console.error(errors)
        }
    };

    // Admin: abrir modal de rechazo (pre-published → rejected)
    const rejectProperty = () => {
        setRejectReasons({ lowImagen: false, incompleteData: false, otherReason: false });
        setRejectOtherReasonText('');
        setShowRejectModal(true);
    };

    // Admin: confirmar rechazo con las razones seleccionadas
    const confirmReject = async () => {
        try {
            const getData = await getPropiedadById(id)
            const currentStatus = getData?.data?.status;

            if (currentStatus !== 'pre-published' && currentStatus !== 'disabled') {
                alertify.alert("BRICKLY HOMES", "<center>Solo se pueden rechazar propiedades pendientes de aprobación o desactivadas.</center>")
                setShowRejectModal(false);
                return;
            }

            const update = await updatePropiedad(getData?.data?._id, {
                status: 'rejected',
                reasonRejected: {
                    lowImagen: rejectReasons.lowImagen,
                    incompleteData: rejectReasons.incompleteData,
                    otherReason: rejectReasons.otherReason,
                    otherReasonText: rejectReasons.otherReason ? rejectOtherReasonText : ''
                }
            })
            if (update.success) {
                updateVisualStatus('rejected')
                setdata(prev => ({ ...prev, status: 'rejected', reasonRejected: { ...rejectReasons } }))
                setShowRejectModal(false);
                alertify.alert("BRICKLY HOMES", "<center>Propiedad rechazada.</center>")
                // Notificar al DataTable que el estado cambió
                window.dispatchEvent(new CustomEvent('propiedad-status-changed', {
                    detail: { id: getData?.data?._id, newStatus: 'rejected' }
                }));
            }
        } catch (errors) {
            console.error(errors)
        }
    };

    // No-admin: publicar (draft→pre-published) o borrador (pre-published→draft)
    const changeStatusNonAdmin = async (targetStatus) => {
        // Bloquear envío a revisión si la propiedad está desactivada
        if (targetStatus === 'pre-published' && data?.status === 'disabled') {
            alertify.alert("BRICKLY HOMES", "<center>Esta propiedad está desactivada. Actívala primero antes de enviarla a revisión.</center>");
            return;
        }

        // Activar propiedad desactivada → colocar como borrador (draft)
        if (targetStatus === 'draft' && data?.status === 'disabled') {
            try {
                const update = await updatePropiedad(data._id, { status: 'draft' });
                if (update.success) {
                    setdata(prev => ({ ...prev, status: 'draft' }));
                    alertify.alert("BRICKLY HOMES", "<center>Propiedad activada y colocada como borrador. Ya puedes enviarla a revisión.</center>");
                }
            } catch (errors) {
                console.error(errors);
            }
            return;
        }

        // Validar campos obligatorios solo cuando intenta enviar a aprobación
        if (targetStatus === 'pre-published') {
            const getData = await getPropiedadById(id)
            const propiedad = getData?.data;
            
            const missingFields = validateRequiredFields(propiedad);
            
            if (missingFields.length > 0) {
                const fieldList = missingFields.map(f => `• <b>${f.seccion}</b> - ${f.campo}`).join('<br>');
                alertify.alert(
                    "BRICKLY HOMES",
                    `<center><b>Completa todos los campos obligatorios antes de enviar a aprobación:</b></center>
                     <div class="scroll-moderno" style="max-height:400px;margin-top:10px;text-align:left;padding-right:10px;">
                       ${fieldList}
                     </div>`
                );
                return;
            }
            
            // Si pasa validación, proceder con el cambio
            try {
                const update = await updatePropiedad(propiedad._id, { status: targetStatus })
                if (update.success) {
                    setdata(prev => ({ ...prev, status: targetStatus }))
                    alertify.alert("BRICKLY HOMES", `<center>Propiedad enviada para aprobación.</center>`)
                }
            } catch (errors) {
                console.error(errors)
            }
            return;
        }

        try {
            const getData = await getPropiedadById(id)
            const update = await updatePropiedad(getData?.data?._id, { status: targetStatus })
            if (update.success) {
                setdata(prev => ({ ...prev, status: targetStatus }))
                const msg = 'Propiedad colocada como borrador'
                alertify.alert("BRICKLY HOMES", `<center>${msg}.</center>`)
            }
        } catch (errors) {
            console.error(errors)
        }
    };


    const { currency: currencyMode } = useCurrency();

    const formatPrice = (value, currency) => {
      const num = parseFloat(value) || 0;
      if (currency === 'GTQ') {
        return 'Q ' + new Intl.NumberFormat('es-GT', { minimumFractionDigits: 0 }).format(num);
      }
      return '$ ' + new Intl.NumberFormat('en-US', { minimumFractionDigits: 0 }).format(num);
    };

    const shareUrl = typeof window !== 'undefined' ? window.location.href : '';
    const shareTitle = data?.market?.title || 'Propiedad en Brickly Homes';

    const shareLinks = [
        {
            name: 'WhatsApp',
            icon: 'fa-brands fa-whatsapp',
            color: '#25D366',
            url: `https://wa.me/?text=${encodeURIComponent(shareTitle + ' ' + shareUrl)}`
        },
        {
            name: 'Facebook',
            icon: 'fa-brands fa-facebook',
            color: '#1877F2',
            url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`
        },
        {
            name: 'X',
            icon: 'fa-brands fa-x-twitter',
            color: '#000',
            url: `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareTitle)}`
        },
        {
            name: 'LinkedIn',
            icon: 'fa-brands fa-linkedin',
            color: '#0A66C2',
            url: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`
        },
        {
            name: 'Telegram',
            icon: 'fa-brands fa-telegram',
            color: '#26A5E4',
            url: `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareTitle)}`
        },
        {
            name: 'Copiar enlace',
            icon: 'fa-solid fa-link',
            color: '#6c757d',
            url: null
        },
    ];

    return (
        <>
            { data && (
                <Container>

                    {/* <Alert variant="success">
                        This is a alert—check it out!
                    </Alert> */}
                    { isAdmin ? (
                        <div className="position-fixed bottom-0 end-0 me-3 mb-3 d-flex flex-column gap-2" style={{ zIndex: '1999' }}>
                            {/* Aprobar (solo si está pre-published) */}
                            {data?.status === 'pre-published' && (
                                <button
                                    onClick={changeStatus}
                                    className="d-flex align-items-center justify-content-center text-white rounded-circle border-0"
                                    style={{ width: '52px', height: '52px', fontSize: '20px', backgroundColor: '#198754', cursor: 'pointer' }}
                                    title="Aprobar propiedad"
                                >
                                    <i className="fa-solid fa-check"></i>
                                </button>
                            )}
                            {/* Colocar como borrador (solo si está published) */}
                            {data?.status === 'published' && (
                                <button
                                    onClick={changeStatus}
                                    className="d-flex align-items-center justify-content-center text-white rounded-circle border-0"
                                    style={{ width: '52px', height: '52px', fontSize: '20px', backgroundColor: '#6c757d', cursor: 'pointer' }}
                                    title="Colocar como borrador"
                                >
                                    <i className="fa-duotone fa-solid fa-file-pen"></i>
                                </button>
                            )}
                            {/* Rechazar (solo si está pre-published o disabled) */}
                            {(data?.status === 'pre-published' || data?.status === 'disabled') && (
                                <button
                                    onClick={rejectProperty}
                                    className="d-flex align-items-center justify-content-center text-white rounded-circle border-0"
                                    style={{ width: '52px', height: '52px', fontSize: '20px', backgroundColor: '#dc3545', cursor: 'pointer' }}
                                    title="Rechazar propiedad"
                                >
                                    <i className="fa-solid fa-xmark"></i>
                                </button>
                            )}
                            {/* Editar */}
                            <Link
                                to={`/cpanel/propiedades/edit/${id}`}
                                className="d-flex align-items-center justify-content-center bg-dark text-white rounded-circle"
                                style={{ width: '52px', height: '52px', fontSize: '20px', textDecoration: 'none' }}
                                title="Editar propiedad"
                            >
                                <i className="fa-duotone fa-solid fa-pen-to-square"></i>
                            </Link>
                        </div>
                    ) : (
                        <div className="position-fixed bottom-0 end-0 me-3 mb-3 d-flex flex-column gap-2" style={{ zIndex: '1999' }}>
                            {/* Activar: disabled → draft */}
                            {data?.status === 'disabled' && (
                                <button
                                    onClick={() => changeStatusNonAdmin('draft')}
                                    className="d-flex align-items-center justify-content-center text-white rounded-circle border-0"
                                    style={{ width: '52px', height: '52px', fontSize: '20px', backgroundColor: '#198754', cursor: 'pointer' }}
                                    title="Activar propiedad (se colocará como borrador)"
                                >
                                    <i className="fa-solid fa-toggle-on"></i>
                                </button>
                            )}
                            {/* Rechazado: rejected → pre-published (reenviar a revisión) */}
                            {data?.status === 'rejected' && (
                                <button
                                    onClick={() => changeStatusNonAdmin('pre-published')}
                                    className="d-flex align-items-center justify-content-center text-white rounded-circle border-0"
                                    style={{ width: '52px', height: '52px', fontSize: '20px', backgroundColor: '#dc3545', cursor: 'pointer' }}
                                    title="Reenviar a revisión"
                                >
                                    <i className="fa-solid fa-rotate"></i>
                                </button>
                            )}
                            {/* Publicar: draft → pre-published */}
                            {data?.status === 'draft' && (
                                <button
                                    onClick={() => changeStatusNonAdmin('pre-published')}
                                    className="d-flex align-items-center justify-content-center text-white rounded-circle border-0"
                                    style={{ width: '52px', height: '52px', fontSize: '20px', backgroundColor: '#198754', cursor: 'pointer' }}
                                    title="Enviar a revisión"
                                >
                                    <i className="fa-solid fa-check"></i>
                                </button>
                            )}
                            {/* Borrador: published, pre-published o rejected → draft */}
                            {data?.status && data?.status !== 'draft' && data?.status !== 'disabled' && (
                                <button
                                    onClick={() => changeStatusNonAdmin('draft')}
                                    className="d-flex align-items-center justify-content-center text-white rounded-circle border-0"
                                    style={{ width: '52px', height: '52px', fontSize: '20px', backgroundColor: '#6c757d', cursor: 'pointer' }}
                                    title="Colocar como borrador"
                                >
                                    <i className="fa-duotone fa-solid fa-file-pen"></i>
                                </button>
                            )}
                            {/* Editar */}
                            <Link
                                to={`/cpanel/propiedades/edit/${id}`}
                                className="d-flex align-items-center justify-content-center bg-dark text-white rounded-circle"
                                style={{ width: '52px', height: '52px', fontSize: '20px', textDecoration: 'none' }}
                                title="Editar propiedad"
                            >
                                <i className="fa-duotone fa-solid fa-pen-to-square"></i>
                            </Link>
                        </div>
                    )}

                    <div className="mb-4 mt-5 mt-lg-0">
                        <Breadcrumb className='px-3 py-1 rounder-1' style={{ "--bs-breadcrumb-divider": "'>'", fontSize: '14px', width: 'fit-content', background: '#f0f0f0' }} >
                            <Breadcrumb.Item linkAs={Link} linkProps={{ to: "/" }}><FormattedMessage id='breadcrumb.text1' /></Breadcrumb.Item>
                            <Breadcrumb.Item linkAs={Link} linkProps={{ to: "/cpanel/propiedades" }}><FormattedMessage id='breadcrumb.text2' /></Breadcrumb.Item>
                            <Breadcrumb.Item active>{data?.market?.title}</Breadcrumb.Item>
                        </Breadcrumb>
                    </div>

                    <div className='section-1 mt-5'>
                        <div className='mt-lg-3' style={{ fontSize: 'clamp(16px, 6vw, 20px)' }}>
                            <div className="d-flex justify-content-between flex-column-reverse flex-lg-row align-items-lg-start">
                                <div>
                                    {data?.status && (
                                        <span className={`badge p-2 me-2 mb-2 ${data.status === 'published' ? 'bg-success' : data.status === 'pre-published' ? 'bg-warning text-dark' : data.status === 'rejected' ? 'bg-danger' : 'bg-secondary'}`} style={{ fontSize: '13px' }}>
                                            {data.status === 'published' ? 'Publicado' : data.status === 'pre-published' ? 'Pendiente de aprobación' : data.status === 'rejected' ? 'Rechazado' : 'Borrador'}
                                        </span>
                                    )}
                                    <div className="mt-1 lh-sm" style={{ fontSize: 'clamp(36px, 6vw, 50px)', fontFamily: 'AppleGaramond', lineHeight: 'normal !important' }}>{data?.market?.title}</div>
                                </div>
                                <Link to="/cpanel/propiedades" className='mb-4 mb-lg-0' title='Atrás'><img src={arrow} style={{ width: 'clamp(30px, 5vw, 40px)' }} alt="Atrás" srcSet="" /></Link>
                            </div>
                            {(!!data?.location?.department && !!data?.location?.municipality && !!data?.location?.zone) &&
                                <div>
                                    <i className='fa-solid fa-location-dot me-2' style={{ width: 'fit-content' }}></i>
                                    {data?.location?.department && data?.location?.department.toLowerCase() !== "ninguno" && (
                                        <>{data?.location?.department}</>
                                    )}
                                    {data?.location?.department && data?.location?.department.toLowerCase() !== "ninguno" &&
                                    data?.location?.municipality && data?.location?.municipality.toLowerCase() !== "ninguno" && (
                                        <>, {data?.location?.municipality}</>
                                    )}
                                    {data?.location?.municipality && data?.location?.municipality.toLowerCase() !== "ninguno" &&
                                    data?.location?.zone && data?.location?.zone.toLowerCase() !== "ninguno" && (
                                        <>, {data?.location?.zone}</>
                                    )}
                                </div>
                            }
                            <div><FormattedMessage id='home.text9' />: {data?.market?.type.charAt(0).toUpperCase() + data?.market?.type.slice(1)}</div>
                            { (!!data?.market?.pricePerM2 || !!data?.market?.priceM2USD ) && (
                                <div className='mt-lg-2 fw-bold text-dark' style={{ fontSize: '18px' }}>{t('Precio por M²', 'Price per M²')}: {(() => {
                                  const dp = getDisplayPrice(data?.market, currencyMode, 'pricePerM2');
                                  return dp ? formatPrice(dp.value, dp.currency) : null;
                                })()}</div>
                            ) }
                            <div className="mt-2 d-flex align-items-baseline gap-3">
                                {(() => {
                                  const dp = getDisplayPrice(data?.market, currencyMode);
                                  return dp ? (
                                    <div className='mt-lg-2 fw-bold fs-3 text-dark'>{formatPrice(dp.value, dp.currency)}</div>
                                  ) : null;
                                })()}
                                { data?.market?.mode && (() => {
                                    let modeImg = ""
                                    let modeColor = ""
                                    let modeText = ""
                                    if(data?.market?.mode == "Venta"){
                                    modeImg = venta
                                    modeColor = "bg-dark"
                                    modeText = "text3"
                                    }else if (data?.market?.mode == "Alquiler"){
                                    modeImg = alquiler
                                    modeColor = "#B65740"
                                    modeText = "text4"
                                    }
        
                                    return (
                                        <div className='d-flex align-items-center gap-2 mt-3'><img src={modeImg} alt="icons" style={{ width: '20px' }} /> <div className={`${modeText == "text3" ? "bg-dark " : ""} rounded-1 px-4 py-0 text-white fw-lighter`} style={{ fontSize: '16px', ...(modeText == "text4" && { backgroundColor: modeColor })  }}><FormattedMessage id={`favorite.${modeText}`} /></div></div>
                                    )
                                })()}
                            </div>
                        </div>

                        {data?.media?.link360 && (
                            <div className="mt-5 mt-xl-3 d-flex justify-content-end gap-3" onClick={() => setShowTourModal(true)} style={{ cursor: 'pointer' }}>
                                <img src={tour} alt="Tour 360" style={{ width: '40px' }} className='img-fluid' /> <FormattedMessage id='properties.text1' />
                            </div>
                        )}     

                        <div className="row g-3 mt-2">
                            {data?.media?.photos.find(p => p.isMain) && (
                                <div className="col-lg-8">
                                    <a className="ratio ratio-16x9 h-100 position-relative glightbox d-block" href={URL + '/' + data?.media?.photos.find(p => p.isMain).path} data-gallery={`gallery-`+data._id}>
                                    <img src={URL + '/' + data?.media?.photos.find(p => p.isMain).path} className="object-fit-cover border-radius-1" alt="Imagen principal" />
                                    {/* <div style={{ padding: '5%' }} className='position-absolute top-0 w-100 h-100 d-flex flex-column justify-content-between'>
                                        <div className='d-flex gap-2 align-items-center' style={{ backgroundColor: '#000000c7', color: 'white', width: 'fit-content', boxSizing: 'border-box', padding: '3px 10px', fontSize: '14px' }}>
                                        <img src={diamond} className="object-fit-cover" style={{ width: '14px' }} alt="Diamond" /><FormattedMessage id='home.text31' />
                                        </div>
                                        <div className='d-flex justify-content-end align-items-center gap-2'>
                                        <div className='d-flex gap-2 align-items-center' style={{ backgroundColor: '#000000c7', color: 'white', width: 'fit-content', height: 'fit-content', boxSizing: 'border-box', padding: '3px 10px', fontSize: '12px' }}><FormattedMessage id='home.text8' />: 506 </div>
                                        <img src={noLike} className="object-fit-cover" style={{ width: '30px' }} alt="No Like" />
                                        </div>
                                    </div> */}
                                    </a>
                                </div>
                            )}
                            <div className="col-lg-4">
                                <div className="d-flex gap-3 gap-lg-0 flex-lg-column container-second-img">
                                    {(() => {
                                        const isSecondary = data?.media?.photos.filter(p => !p.isMain) || []
                                        const totalSecondary = isSecondary.length

                                        return isSecondary.map((items, index) => {
                                            if(index === 0){
                                                return (
                                                    <a key={index} className="ratio ratio-4x3 second-img-section1 d-block glightbox mb-xl-2" href={URL + '/' + items.path} data-gallery={`gallery-`+data._id}>
                                                        <img src={URL + '/' + items.path} className="object-fit-cover border-radius-2" alt="Imagen secundaria 1" />
                                                    </a>
                                                )
                                            }
                                            else if(index === 1){
                                                return (
                                                    <a key={index} className="ratio ratio-4x3 second-img-section1 d-block glightbox mt-lg-2 position-relative" href={URL + '/' + items.path} data-gallery={`gallery-`+data._id}>
                                                        <img src={URL + '/' + items.path} className="object-fit-cover border-radius-2" alt="Imagen secundaria 2" />
                                                        {totalSecondary > 2 && (
                                                            <div className="position-absolute w-100 h-100 d-flex justify-content-end align-items-end p-3">
                                                                <div className="d-flex align-items-baseline gap-2 text-dark py-1 px-3 rounded-5" style={{ fontSize: '16px', backgroundColor: '#d9d9d9e6' }}>
                                                                    <i className="fa-regular fa-images"></i> +{totalSecondary - 2} {t('Fotos', 'Photos')}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </a>
                                                )
                                            }

                                            return (
                                                <a key={index} className="ratio ratio-4x3 second-img-section1 glightbox mb-2 d-none" href={URL + '/' + items.path} data-gallery={`gallery-`+data._id}>
                                                    <img src={URL + '/' + items.path} className="object-fit-cover border-radius-2" alt="Imagen secundaria 1" />
                                                </a>
                                            )
                                        })
                                    })()}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="section-2 mt-5">
                        <div className="row gx-5 gy-5 gy-lg-0" style={{ marginBottom: '2rem' }}>
                            <div className="col-lg-7 pe-lg-5 border-end">
                                {data?.market?.description && 
                                    <div style={{ marginBottom: '2rem' }}>
                                        <div className='fs-3 mb-4 d-flex justify-content-between align-items-center'>
                                            <div>
                                                <i className='fa-sharp fa-regular fa-building fs-2 me-3' style={{ width: 'fit-content' }}></i><FormattedMessage id='properties.text2' />
                                            </div>
                                            <div className="position-relative">
                                                <button
                                                    type="button"
                                                    title='Compartir'
                                                    aria-label='Compartir propiedad'
                                                    style={{ width: '40px', height: '40px', lineHeight: 1, cursor: 'pointer' }}
                                                    className='border rounded-circle bg-white text-dark d-inline-flex align-items-center justify-content-center p-0 flex-shrink-0'
                                                    onClick={() => setShowShare(s => !s)}
                                                >
                                                    <i className="fa-solid fa-share-nodes" aria-hidden="true" style={{ fontSize: '18px', lineHeight: 1 }}></i>
                                                </button>
                                                {showShare && (
                                                    <>
                                                        <div style={{ position: 'fixed', inset: 0, zIndex: 999 }} onClick={() => setShowShare(false)} />
                                                        <div className="position-absolute bg-white border rounded-3 shadow p-3" style={{ right: 0, top: '48px', zIndex: 1000, minWidth: '200px' }}>
                                                            <div className="fw-bold mb-2" style={{ fontSize: '14px' }}>Compartir propiedad</div>
                                                            <div className="d-flex flex-column gap-2">
                                                                {shareLinks.map(s => (
                                                                    s.url ? (
                                                                        <a key={s.name} href={s.url} target="_blank" rel="noreferrer" className="d-flex align-items-center gap-2 text-decoration-none text-dark" style={{ fontSize: '14px' }} onClick={() => setShowShare(false)}>
                                                                            <i className={`${s.icon} fs-5`} style={{ color: s.color, width: '24px' }}></i>
                                                                            {s.name}
                                                                        </a>
                                                                    ) : (
                                                                        <button key={s.name} className="d-flex align-items-center gap-2 border-0 bg-transparent p-0 text-dark" style={{ fontSize: '14px', cursor: 'pointer' }} onClick={() => { navigator.clipboard.writeText(shareUrl); setShowShare(false); }}>
                                                                            <i className={`${s.icon} fs-5`} style={{ color: s.color, width: '24px' }}></i>
                                                                            {s.name}
                                                                        </button>
                                                                    )
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                        {/* <div>{ dangerouslySetInnerHTML={{ __html: data.market.description }}}</div> */}
                                        <div dangerouslySetInnerHTML={{ __html: data.market.description }} />
                                    </div>
                                }

                                {(data.layout?.bedrooms >= 0 || data.layout?.bathrooms >= 0 || data?.layout?.parkingSpots >= 0 || data?.dimensions?.landM2 > 0 || data?.dimensions?.landV2 > 0) &&
                                    <>
                                        <hr className='mb-4' />
                                        <div className='d-flex justify-content-evenly' style={{ fontSize: 'clamp(16px, 3vw, 24px)' }}>
                                            
                                            {data.layout?.bedrooms >= 0 && 
                                                ((data?.market?.type.toLowerCase() == "oficina" || data?.market?.type.toLowerCase() == "bodega" ) ? (
                                                <div className='d-flex flex-column align-items-center text-center gap-2' title='Total de ambientes'><img src={space} alt="icon" style={{ width: 'clamp(16px, 4vw, 25px)' }} /> {data.layout.totalRooms}</div>
                                                ) : (
                                                    <div className='d-flex flex-column align-items-center text-center gap-2' title='Total de habitaciones'><i className="fa-solid fa-bed"></i> {data.layout?.bedrooms}</div>
                                                ))
                                            }
                                            {data.layout?.bathrooms >= 0 &&
                                                <div className='d-flex flex-column align-items-center text-center gap-2' title='Total de baños'><i className="fa-solid fa-bath"></i> {data.layout?.bathrooms + (data?.layout?.halfBathrooms || 0) }</div>
                                            }
                                            {data?.layout?.parkingSpots >= 0 &&
                                                <div className='d-flex flex-column align-items-center text-center gap-2' title='Parqueo / Driveway'><i className="fa-solid fa-car-side"></i> {data?.layout?.parkingSpots}</div>
                                            }
                                            {(data?.dimensions?.landM2 > 0 || data?.dimensions?.landV2 > 0) &&
                                                <div className='d-flex flex-column align-items-center text-center gap-2' title={data?.dimensions?.landM2 > 0 ? 'Área de terreno (m²)' : 'Área de terreno (v²)'}><i className="fa-solid fa-crop-simple"></i> {data?.dimensions?.landM2 > 0 ? `${data.dimensions.landM2}m²` : `${data.dimensions.landV2}v²`}</div>
                                            }
                                        </div>
                                        <hr className='mt-4' style={{ marginBottom: '3rem' }} />
                                    </>
                                }

                                {data?.location && 
                                    <Row className='align-items-start gy-2' style={{ marginBottom: '3rem' }}>
                                        <Col xs={12} className='fs-3 mb-2'><i className='fa-sharp fa-regular fa-location-dot fs-2 me-3' style={{ width: 'fit-content' }}></i>Ubicación y entorno</Col>
                                        {(!!data?.location?.department && data?.location?.department.toLowerCase() !== 'ninguno') &&
                                            <Col lg={6}>
                                                <div className="d-flex align-items-start">
                                                    <i className="fa-solid fa-dot fs-1" style={{ width: '20px', height: '23px', display: 'inline-flex',  alignItems: 'center', justifyContent: 'center' }}></i>
                                                    <div className='d-flex align-items-center flex-wrap'>
                                                        <div className='me-2'>Departamento:</div>
                                                        <div>{data?.location?.department}</div>
                                                    </div>
                                                </div>
                                            </Col>
                                        }
                                        {(!!data?.location?.municipality && data?.location?.municipality.toLowerCase() !== 'ninguno') &&
                                            <Col lg={6}>
                                                <div className="d-flex align-items-start">
                                                    <i className="fa-solid fa-dot fs-1" style={{ width: '20px', height: '23px', display: 'inline-flex',  alignItems: 'center', justifyContent: 'center' }}></i>
                                                    <div className='d-flex align-items-center flex-wrap'>
                                                        <div className='me-2'>Municipio:</div>
                                                        <div>{data?.location?.municipality}</div>
                                                    </div>
                                                </div>
                                            </Col>
                                        }
                                        {(!!data?.location?.zone && data?.location?.zone.toLowerCase() !== 'ninguno') &&
                                            <Col lg={6}>
                                                <div className="d-flex align-items-start">
                                                    <i className="fa-solid fa-dot fs-1" style={{ width: '20px', height: '23px', display: 'inline-flex',  alignItems: 'center', justifyContent: 'center' }}></i>
                                                    <div className='d-flex align-items-center flex-wrap'>
                                                        <div className='me-2'>Zona:</div>
                                                        <div>{data?.location?.zone}</div>
                                                    </div>
                                                </div>
                                            </Col>
                                        }
                                        {(!!data?.location?.gatedCommunity && data?.location?.gatedCommunity.toLowerCase() !== 'ninguno') &&
                                            <Col lg={6}>
                                                <div className="d-flex align-items-start">
                                                    <i className="fa-solid fa-dot fs-1" style={{ width: '20px', height: '23px', display: 'inline-flex',  alignItems: 'center', justifyContent: 'center' }}></i>
                                                    <div className='d-flex align-items-center flex-wrap'>
                                                        <div className='me-2'>Condominio:</div>
                                                        <div>{data?.location?.gatedCommunity}</div>
                                                    </div>
                                                </div>
                                            </Col>
                                        }
                                        {!!data?.location?.floor &&
                                            <Col lg={6}>
                                                <div className="d-flex align-items-start">
                                                    <i className="fa-solid fa-dot fs-1" style={{ width: '20px', height: '23px', display: 'inline-flex',  alignItems: 'center', justifyContent: 'center' }}></i>
                                                    <div className='d-flex align-items-center flex-wrap'>
                                                        <div className='me-2'>Piso:</div>
                                                        <div>{data?.location?.floor}</div>
                                                    </div>
                                                </div>
                                            </Col>
                                        }
                                        {!!data?.location?.waterRelation && (data?.location?.waterRelation.toLowerCase() !== "ninguna" && data?.location?.waterRelation.toLowerCase() !== "none") &&
                                            <Col lg={6}>
                                                <div className="d-flex align-items-start">
                                                <i className="fa-solid fa-dot fs-1" style={{ width: '20px', height: '23px', display: 'inline-flex',  alignItems: 'center', justifyContent: 'center' }}></i>
                                                    <div className='d-flex align-items-center flex-wrap'>
                                                        <div className='me-2'>Relación con el agua:</div>
                                                        <div>{data?.location?.waterRelation}</div>
                                                    </div>
                                                </div>
                                            </Col>
                                        }
                                        {!!data?.location?.view && (data?.location?.view.toLowerCase() !== 'sin vista especial' && data?.location?.view.toLowerCase() !== 'none') &&
                                            <Col lg={6}>
                                                <div className="d-flex align-items-start">
                                                    <i className="fa-solid fa-dot fs-1" style={{ width: '20px', height: '23px', display: 'inline-flex',  alignItems: 'center', justifyContent: 'center' }}></i>
                                                    <div className='d-flex align-items-center flex-wrap'>
                                                        <div className='me-2'>Vista:</div>
                                                        <div>{data?.location?.view}</div>
                                                    </div>
                                                </div>
                                            </Col>
                                        }
                                        {!!data?.location?.streettype && data?.location?.streettype.toLowerCase() !== 'none' &&
                                            <Col lg={6}>
                                                <div className="d-flex align-items-start">
                                                    <i className="fa-solid fa-dot fs-1" style={{ width: '20px', height: '23px', display: 'inline-flex',  alignItems: 'center', justifyContent: 'center' }}></i>
                                                    <div className='d-flex align-items-center flex-wrap'>
                                                        <div className='me-2'>Tipo de calle:</div>
                                                        <div>{data?.location?.streettype}</div>
                                                    </div>
                                                </div>
                                            </Col>
                                        }
                                        {!!data?.location?.address &&
                                            <Col xs={12}>
                                                <div className="d-flex align-items-start">
                                                    <i className="fa-solid fa-dot fs-1" style={{ width: '20px', height: '23px', display: 'inline-flex',  alignItems: 'center', justifyContent: 'center' }}></i>
                                                    <div className='d-flex flex-column align-items-start'>
                                                        <div className='me-2'>Dirección exacta:</div>
                                                        <div>{data?.location?.address}</div>
                                                    </div>
                                                </div>
                                            </Col>
                                        }
                                    </Row>
                                }

                                {data?.dimensions && (() => {
                                    // Verificar si existe al menos uno de los campos que SÍ nos interesan
                                    const hasRelevantData = data?.dimensions?.landV2 || 
                                                            data?.dimensions?.constructionM2 || 
                                                            data?.dimensions?.storageM2;
                                    
                                    return hasRelevantData ? (
                                        <Row className='align-items-start gy-2' style={{ marginBottom: '3rem' }}>
                                            <Col xs={12} className='fs-3 mb-2'><i className='fa-sharp fa-regular fa-chart-area fs-2 me-3' style={{ width: 'fit-content' }}></i>Dimensiones y áreas</Col>
                                            {!!data?.dimensions?.landV2 &&
                                                <Col lg={6}>
                                                    <div className="d-flex align-items-start">
                                                        <i className="fa-solid fa-dot fs-1" style={{ width: '20px', height: '23px', display: 'inline-flex',  alignItems: 'center', justifyContent: 'center' }}></i>
                                                        <div className='d-flex align-items-center flex-wrap'>
                                                            <div className='me-2'>Área de terreno (v²):</div>
                                                            <div>{data?.dimensions?.landV2}</div>
                                                        </div>
                                                    </div>
                                                </Col>
                                            }
                                            {!!data?.dimensions?.constructionM2 &&
                                                <Col lg={6}>
                                                    <div className="d-flex align-items-start">
                                                        <i className="fa-solid fa-dot fs-1" style={{ width: '20px', height: '23px', display: 'inline-flex',  alignItems: 'center', justifyContent: 'center' }}></i>
                                                        <div className='d-flex align-items-center flex-wrap'>
                                                            <div className='me-2'>Área de construcción (m²):</div>
                                                            <div>{data?.dimensions?.constructionM2}</div>
                                                        </div>
                                                    </div>
                                                </Col>
                                            }
                                            {!!data?.dimensions?.storageM2 &&
                                                <Col lg={6}>
                                                    <div className="d-flex align-items-start">
                                                        <i className="fa-solid fa-dot fs-1" style={{ width: '20px', height: '23px', display: 'inline-flex',  alignItems: 'center', justifyContent: 'center' }}></i>
                                                        <div className='d-flex align-items-center flex-wrap'>
                                                            <div className='me-2'>Área de almacén (m²):</div>
                                                            <div>{data?.dimensions?.storageM2}</div>
                                                        </div>
                                                    </div>
                                                </Col>
                                            }
                                        </Row>
                                    ) : null;
                                })()}

                                {data?.structure && (() => {
                                    const hasStructureData = data?.structure?.constructionYear || 
                                                             data?.structure?.remodelYear || 
                                                             data?.structure?.levels || 
                                                             data?.structure?.ceilingHeight || 
                                                             data?.structure?.perimeterWall !== false;
                                    return hasStructureData ? (
                                        <Row className='align-items-start gy-2' style={{ marginBottom: '3rem' }}>
                                            <Col xs={12} className='fs-3 mb-2'><i className='fa-sharp fa-regular fa-trowel-bricks fs-2 me-3' style={{ width: 'fit-content' }}></i>Estructuras y obra gris</Col>
                                            {!!data?.structure?.constructionYear ?
                                                <Col lg={6}>
                                                    <div className="d-flex align-items-start">
                                                        <i className="fa-solid fa-dot fs-1" style={{ width: '20px', height: '23px', display: 'inline-flex',  alignItems: 'center', justifyContent: 'center' }}></i>
                                                        <div className='d-flex align-items-center flex-wrap'>
                                                            <div className='me-2'>Año de construcción:</div>
                                                            <div>{data?.structure?.constructionYear}</div>
                                                        </div>
                                                    </div>
                                                </Col> : null
                                            }
                                            {!!data?.structure?.remodelYear ?
                                                <Col lg={6}>
                                                    <div className="d-flex align-items-start">
                                                        <i className="fa-solid fa-dot fs-1" style={{ width: '20px', height: '23px', display: 'inline-flex',  alignItems: 'center', justifyContent: 'center' }}></i>
                                                        <div className='d-flex align-items-center flex-wrap'>
                                                            <div className='me-2'>Año de remodelación:</div>
                                                            <div>{data?.structure?.remodelYear}</div>
                                                        </div>
                                                    </div>
                                                </Col> : null
                                            }
                                            {!!data?.structure?.levels ?
                                                <Col lg={6}>
                                                    <div className="d-flex align-items-start">
                                                        <i className="fa-solid fa-dot fs-1" style={{ width: '20px', height: '23px', display: 'inline-flex',  alignItems: 'center', justifyContent: 'center' }}></i>
                                                        <div className='d-flex align-items-center flex-wrap'>
                                                            <div className='me-2'>Niveles:</div>
                                                            <div>{data?.structure?.levels}</div>
                                                        </div>
                                                    </div>
                                                </Col> : null
                                            }
                                            {!!data?.structure?.ceilingHeight ?
                                                <Col lg={6}>
                                                    <div className="d-flex align-items-start">
                                                        <i className="fa-solid fa-dot fs-1" style={{ width: '20px', height: '23px', display: 'inline-flex',  alignItems: 'center', justifyContent: 'center' }}></i>
                                                        <div className='d-flex align-items-center flex-wrap'>
                                                            <div className='me-2'>Altura de cielos:</div>
                                                            <div>{data?.structure?.ceilingHeight}</div>
                                                        </div>
                                                    </div>
                                                </Col> : null
                                            }
                                            {!!data?.structure?.perimeterWall && data?.structure?.perimeterWall !== false &&
                                                <Col lg={6}>
                                                    <div className="d-flex align-items-start">
                                                        <i className="fa-solid fa-dot fs-1" style={{ width: '20px', height: '23px', display: 'inline-flex',  alignItems: 'center', justifyContent: 'center' }}></i>
                                                        <div className='d-flex align-items-center flex-wrap'>
                                                            <div className='me-2'>Muro Perimetral de seguridad:</div>
                                                            <div>{data.structure.perimeterWall ? 'Si' : 'No'}</div>
                                                        </div>
                                                    </div>
                                                </Col>
                                            } 
                                        </Row>
                                    ) : null;
                                })()}

                                {data?.layout && (() => {

                                    const validLayout = (data.layout.totalRooms >= 0) || data.layout.serviceRoom || data.layout.zone || (data.layout.parkingSpots >= 0) || data.layout.furnished || (data.layout.floors >= 0) || data?.layout?.laundry || data.layout.study || data.layout.familyroom || data?.layout?.deck

                                    return validLayout ? (
                                        <Row className='align-items-start gy-2' style={{ marginBottom: '3rem' }}>
                                            <Col xs={12} className='fs-3 mb-2'><i className='fa-sharp fa-regular fa-tree-city fs-2 me-3' style={{ width: 'fit-content' }}></i>Distribución de ambientes</Col>
                                            {data?.layout?.totalRooms !== undefined && data?.layout?.totalRooms !== null && data?.layout?.totalRooms !== '' &&
                                                <Col lg={6}>
                                                    <div className="d-flex align-items-start">
                                                        <i className="fa-solid fa-dot fs-1" style={{ width: '20px', height: '23px', display: 'inline-flex',  alignItems: 'center', justifyContent: 'center' }}></i>
                                                        <div className='d-flex align-items-center flex-wrap'>
                                                            <div className='me-2'>Total de Ambientes:</div>
                                                            <div>{data?.layout?.totalRooms}</div>
                                                        </div>
                                                    </div>
                                                </Col>
                                            }
                                            {!!data?.layout?.serviceRoom &&
                                                <Col lg={6}>
                                                    <div className="d-flex align-items-start">
                                                        <i className="fa-solid fa-dot fs-1" style={{ width: '20px', height: '23px', display: 'inline-flex',  alignItems: 'center', justifyContent: 'center' }}></i>
                                                        <div className='d-flex align-items-center flex-wrap'>
                                                            <div className='me-2'>Habitación de servicio:</div>
                                                            <div>{data?.layout?.serviceRoom}</div>
                                                        </div>
                                                    </div>
                                                </Col>
                                            }
                                            {!!data?.layout?.deck &&
                                                <Col lg={6}>
                                                    <div className="d-flex align-items-start">
                                                        <i className="fa-solid fa-dot fs-1" style={{ width: '20px', height: '23px', display: 'inline-flex',  alignItems: 'center', justifyContent: 'center' }}></i>
                                                        <div className='d-flex align-items-center flex-wrap'>
                                                            <div className='me-2'>Pérgola / Deck social:</div>
                                                            <div>{data?.layout?.deck ? 'Si' :'No'}</div>
                                                        </div>
                                                    </div>
                                                </Col>
                                            }
                                            {data?.layout?.parkingSpots !== undefined && data?.layout?.parkingSpots !== null && data?.layout?.parkingSpots !== '' &&
                                                <Col lg={6}>
                                                    <div className="d-flex align-items-start">
                                                        <i className="fa-solid fa-dot fs-1" style={{ width: '20px', height: '23px', display: 'inline-flex',  alignItems: 'center', justifyContent: 'center' }}></i>
                                                        <div className='d-flex align-items-center flex-wrap'>
                                                            <div className='me-2'>Parqueo / Driveway:</div>
                                                            <div>{data?.layout?.parkingSpots}</div>
                                                        </div>
                                                    </div>
                                                </Col>
                                            }
                                            {!!data?.layout?.furnished &&
                                                <Col lg={6}>
                                                    <div className="d-flex align-items-start">
                                                        <i className="fa-solid fa-dot fs-1" style={{ width: '20px', height: '23px', display: 'inline-flex',  alignItems: 'center', justifyContent: 'center' }}></i>
                                                        <div className='d-flex align-items-center flex-wrap'>
                                                            <div className='me-2'>Amueblado / No amueblado:</div>
                                                            <div>{data.layout.furnished == true ? 'Si' :'No'}</div>
                                                        </div>
                                                    </div>
                                                </Col>
                                            }
                                            {data?.layout?.floors !== undefined && data?.layout?.floors !== null && data?.layout?.floors !== '' &&
                                                <Col lg={6}>
                                                    <div className="d-flex align-items-start">
                                                        <i className="fa-solid fa-dot fs-1" style={{ width: '20px', height: '23px', display: 'inline-flex',  alignItems: 'center', justifyContent: 'center' }}></i>
                                                        <div className='d-flex align-items-center flex-wrap'>
                                                            <div className='me-2'>Número de pisos:</div>
                                                            <div>{data?.layout?.floors}</div>
                                                        </div>
                                                    </div>
                                                </Col>
                                            }
                                            {!!data?.layout?.laundry &&
                                                <Col lg={6}>
                                                    <div className="d-flex align-items-start">
                                                        <i className="fa-solid fa-dot fs-1" style={{ width: '20px', height: '23px', display: 'inline-flex',  alignItems: 'center', justifyContent: 'center' }}></i>
                                                        <div className='d-flex align-items-center flex-wrap'>
                                                            <div className='me-2'>Área de lavandería:</div>
                                                            <div>{data?.layout?.laundry}</div>
                                                        </div>
                                                    </div>
                                                </Col>
                                            }
                                            {!!data?.layout?.study &&
                                                <Col lg={6}>
                                                    <div className="d-flex align-items-start">
                                                        <i className="fa-solid fa-dot fs-1" style={{ width: '20px', height: '23px', display: 'inline-flex',  alignItems: 'center', justifyContent: 'center' }}></i>
                                                        <div className='d-flex align-items-center flex-wrap'>
                                                            <div className='me-2'> Estudio/Oficina:</div>
                                                            <div>{data?.layout?.study}</div>
                                                        </div>
                                                    </div>
                                                </Col>
                                            }
                                            {data?.layout?.familyroom &&
                                                <Col>
                                                    <div className="d-flex align-items-start">
                                                        <i className="fa-solid fa-dot fs-1" style={{ width: '20px', height: '23px', display: 'inline-flex',  alignItems: 'center', justifyContent: 'center' }}></i>
                                                        <div className='d-flex align-items-center flex-wrap'>
                                                            <div className='me-2'>Sala familiar:</div>
                                                            <div>{data?.layout?.familyroom}</div>
                                                        </div>
                                                    </div>
                                                </Col>
                                            }
                                        </Row>
                                    ) : null;
                                })() }
                
                                {data?.expenses && (() => {
                                    const exp = data.expenses;
                                    const hasExpenses = exp.stoveType || exp.waterService || exp.maintenanceCost || (exp.includes && exp.includes.length > 0) || (exp.iusi && exp.iusi.atday !== false);
                                    return hasExpenses ? (
                                        <Row className='align-items-start gy-2' style={{ marginBottom: '3rem' }}>
                                            <Col xs={12} className='fs-3 mb-2'><i className='fa-sharp fa-regular fa-book fs-2 me-3' style={{ width: 'fit-content' }}></i>Gastos fijos</Col>
                                            {!!exp.stoveType &&
                                                <Col lg={6}>
                                                    <div className="d-flex align-items-start">
                                                        <i className="fa-solid fa-dot fs-1" style={{ width: '20px', height: '23px', display: 'inline-flex',  alignItems: 'center', justifyContent: 'center' }}></i>
                                                        <div className='d-flex align-items-center flex-wrap'>
                                                            <div className='me-2'>Tipo de estufa:</div>
                                                            <div>{exp.stoveType}</div>
                                                        </div>
                                                    </div>
                                                </Col>
                                            }
                                            {!!exp.waterService &&
                                                <Col lg={6}>
                                                    <div className="d-flex align-items-start">
                                                        <i className="fa-solid fa-dot fs-1" style={{ width: '20px', height: '23px', display: 'inline-flex',  alignItems: 'center', justifyContent: 'center' }}></i>
                                                        <div className='d-flex align-items-center flex-wrap'>
                                                            <div className='me-2'>Servicio de Agua:</div>
                                                            <div>{exp.waterService}</div>
                                                        </div>
                                                    </div>
                                                </Col>
                                            }
                                            {!!exp.maintenanceCost &&
                                                <Col lg={6}>
                                                    <div className="d-flex align-items-start">
                                                        <i className="fa-solid fa-dot fs-1" style={{ width: '20px', height: '23px', display: 'inline-flex',  alignItems: 'center', justifyContent: 'center' }}></i>
                                                        <div className='d-flex align-items-center flex-wrap'>
                                                            <div className='me-2'>Mantenimiento (USD):</div>
                                                            <div>${exp.maintenanceCost.toLocaleString('en-US')}</div>
                                                        </div>
                                                    </div>
                                                </Col>
                                            }
                                            {!!exp.includes && exp.includes.length > 0 ? (
                                                <Col lg={6}>
                                                    <div className="d-flex align-items-start">
                                                        <i className="fa-solid fa-dot fs-1" style={{ width: '20px', height: '23px', display: 'inline-flex',  alignItems: 'center', justifyContent: 'center' }}></i>
                                                        <div className='d-flex align-items-center flex-wrap'>
                                                            <div className='me-2'>Incluye:</div>
                                                            <div>{exp.includes.join(', ')}</div>
                                                        </div>
                                                    </div>
                                                </Col>
                                            ) : null}
                                            {!!exp.iusi && exp.iusi.atday !== false &&
                                                <Col lg={6}>
                                                    <div className="d-flex align-items-start">
                                                        <i className="fa-solid fa-dot fs-1" style={{ width: '20px', height: '23px', display: 'inline-flex',  alignItems: 'center', justifyContent: 'center' }}></i>
                                                        <div className='d-flex align-items-center flex-wrap'>
                                                            <div className='me-2'>IUSI:</div>
                                                            <div>{exp.iusi.atday !== false ? ' (Al día)' : ''}</div>
                                                        </div>
                                                    </div>
                                                </Col>
                                            }
                                        </Row>
                                    ) : null;
                                })()}

                                {amenities.length > 0 &&
                                    <div className='d-flex align-items-baseline gap-3 flex-wrap' style={{ marginBottom: '3rem' }}>
                                        <div className='fs-3 mb-3 w-100'><i className='fa-sharp fa-regular fa-umbrella-beach fs-2 me-3' style={{ width: 'fit-content' }}></i><FormattedMessage id='properties.text5' /></div>
                                        {amenities.map((items, index) => (
                                            <div key={index} className='border rounded-4 py-1 px-2 border-dark'>{items}</div>
                                        ))}
                                    </div>
                                }
                
                                {(() => {
                                    const coor = data?.location?.coordinates
                                    if(coor){
                                        const lon = coor?.coordinates?.[0]
                                        const lat = coor?.coordinates?.[1]
                                        
                                        if(lat && lon){
                                            return (
                                                <>
                                                    <div className='fs-3 mb-4'><i className="fa-regular fa-earth-africa fs-2 me-3"></i><FormattedMessage id='properties.text7' /></div>    
                                                    <iframe 
                                                        src={`https://www.google.com/maps?q=${lat},${lon}&output=embed`}
                                                        style={{ 
                                                        maxWidth: '600px',
                                                        width: '100%', 
                                                        height: '450px',
                                                        border: '0'
                                                        }} 
                                                        allowFullScreen 
                                                        loading="lazy" 
                                                        referrerPolicy="no-referrer-when-downgrade"
                                                        title="Mapa de la propiedad"
                                                    />
                                                </>
                                            ) 
                                        }
                                    }
                                })()}
                            </div>

                            <div className="col-lg-5 ps-lg-5">
                                <div className='sticky-lg-top' style={{ top: '100px' }}>
                                    <div className='fs-3 mb-4'><FormattedMessage id='home.text11' /></div>
                                    <div className='d-flex flex-column gap-4'>
                                        { loadingAgentes ? (
                                            <div className="d-flex justify-content-center align-items-center py-5">
                                                <div className="spinner-border text-dark" role="status">
                                                    <span className="visually-hidden">Cargando...</span>
                                                </div>
                                            </div>
                                        ) : agentes.length === 0 ? null : agentes.map((items, index) => (
                                            <div key={index} className="d-none d-xl-flex align-items-start justify-content-between align-items-lg-center flex-column flex-md-row gap-4">
                                                <Link to={items._isAgency ? `/agencias/perfil/${items._id}` : `/agentes/perfil/${items._id}`} className='text-body'>
                                                    <div className="d-flex align-items-start gap-2">
                                                        <div className='rounded-circle' style={{ width: '80px', height: '80px' }}><img src={items.avatar} alt="Avatar" style={{ width: '80px', height: '80px' }} className='rounded-circle object-fit-cover' /></div>
                                                        <div>
                                                            <div className='lh-sm' style={{fontSize: '18px'}}>{items.name}  { items?.agencia && <> <br /> <span style={{fontSize: '16px'}}>{items.agencia}</span> </>}</div>
                                                            <div className='mt-2' style={{ fontSize: '12px' }}>
                                                                <StarRating rating={items.ratingAverage} size='11px' />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </Link>
                                                <div className="d-flex justify-content-md-end flex-column">
                                                    <div className='mb-2 lh-1' style={lang == 'es' ? {fontSize: '20px'} : {fontSize: '16px'}}><FormattedMessage id="home.text12" /></div>
                                                    <a href={`https://wa.me/${items.phone.replace(/\D/g, '')}?text=` + encodeURIComponent('¡Hola! Me comunico desde la plataforma Brickly Homes. Estoy interesado en una propiedad.')} target='_blank' className="rounded-1 text-center border-0 py-1" style={{ backgroundColor: 'black', color: 'white', boxSizing: 'border-box', padding: '2px 8px' }} rel="noreferrer"><i className="fa-brands fa-whatsapp me-2"></i> <FormattedMessage id="home.text13" /></a>
                                                </div>
                                            </div>
                                        )) }
                                        
                                        { agentes.map((items, index) => (
                                            <div key={index} className="d-flex d-xl-none align-items-start justify-content-between align-items-xl-center flex-column flex-md-row gap-4">
                                                <Link to={items._isAgency ? `/agencias/perfil/${items._id}` : `/agentes/perfil/${items._id}`} className='text-body'>
                                                    <div className="d-flex align-items-start gap-4">
                                                        <div className='rounded-circle' style={{ width: '100px', height: '100px' }}><img src={items.avatar} alt="Avatar" style={{ width: '100px', height: '100px' }} className='rounded-circle object-fit-cover' /></div>
                                                        <div>
                                                            <div className='lh-sm' style={{fontSize: '18px'}}>{items.name}  { items?.agencia && <> <br /> <span style={{fontSize: '16px'}}>{items.agencia}</span> </>}</div>
                                                            <div style={{ fontSize: '12px' }}>
                                                                <StarRating rating={items.ratingAverage} size='11px' />
                                                            </div>

                                                            <div className="mt-3 d-flex justify-content-md-end flex-column">
                                                                <div className='mb-2 lh-1' style={lang == 'es' ? {fontSize: '20px'} : {fontSize: '16px'}}><FormattedMessage id="home.text12" /></div>
                                                                <span onClick={(e) => { e.preventDefault(); e.stopPropagation();
                                                                    window.open(`https://wa.me/${items.phone.replace(/\D/g, '')}?text=` + encodeURIComponent('¡Hola! Me comunico desde la plataforma Brickly Homes. Estoy interesado en una propiedad.'), '_blank');
                                                                }} className="rounded-1 text-center border-0 py-1" style={{ backgroundColor: 'black', color: 'white', boxSizing: 'border-box', padding: '2px 8px' }} rel="noreferrer"><i className="fa-brands fa-whatsapp me-2"></i> <FormattedMessage id="home.text13" /></span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </Link>
                                            </div>
                                        )) }

                                    </div>
                                    <div style={{ marginTop: '4rem' }}>
                                        <div className='fs-3 mb-4'><FormattedMessage id='properties.text3' /></div>
                                        <div className="d-flex flex-column gap-3">
                                        <input type="text" name="" id="" className="form-control noRounded rounded-1 py-2" style={{ fontSize: '14px' }} placeholder={t('Nombre', 'Name')} />
                                        <input type="text" name="" id="" className="form-control noRounded rounded-1 py-2" style={{ fontSize: '14px' }} placeholder={t('Correo electrónico', 'Email')} />
                                        <input type="text" name="" id="" className="form-control noRounded rounded-1 py-2" style={{ fontSize: '14px' }} placeholder={t('Teléfono', 'Phone')} />
                                        <textarea name="" id="" className="form-control rounded-1 py-2" style={{ fontSize: '14px', minHeight: '120px' }} placeholder={t('Estoy interesado en la propiedad: '+data?.market?.title, 'I\'m interested in the property: '+data?.market?.title)} ></textarea>
                                        </div>
                                    </div>
                                </div>
                            </div>

                        </div>
                    </div>
                </Container>
            ) }
       

       {/* Modal para Rechazar propiedad */}
            <Modal
                show={showRejectModal}
                onHide={() => setShowRejectModal(false)}
                centered
            >
                <Modal.Header closeButton>
                    <Modal.Title>Rechazar propiedad</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <p className="mb-3">Selecciona el motivo del rechazo:</p>
                    <div className="d-flex flex-column gap-3">
                        <div className="form-check">
                            <input
                                type="checkbox"
                                className="form-check-input"
                                id="chkLowImagen"
                                checked={rejectReasons.lowImagen}
                                onChange={(e) => setRejectReasons(prev => ({ ...prev, lowImagen: e.target.checked }))}
                            />
                            <label className="form-check-label" htmlFor="chkLowImagen">
                                Baja calidad de imagenes
                            </label>
                        </div>
                        <div className="form-check">
                            <input
                                type="checkbox"
                                className="form-check-input"
                                id="chkIncompleteData"
                                checked={rejectReasons.incompleteData}
                                onChange={(e) => setRejectReasons(prev => ({ ...prev, incompleteData: e.target.checked }))}
                            />
                            <label className="form-check-label" htmlFor="chkIncompleteData">
                                Información incompleta
                            </label>
                        </div>
                        <div className="form-check">
                            <input
                                type="checkbox"
                                className="form-check-input"
                                id="chkOtherReasonView"
                                checked={rejectReasons.otherReason}
                                onChange={(e) => {
                                    setRejectReasons(prev => ({ ...prev, otherReason: e.target.checked }));
                                    if (!e.target.checked) setRejectOtherReasonText('');
                                }}
                            />
                            <label className="form-check-label" htmlFor="chkOtherReasonView">
                                Otro motivo
                            </label>
                        </div>
                        {rejectReasons.otherReason && (
                            <div className="ms-4">
                                <textarea
                                    className="form-control"
                                    rows="3"
                                    placeholder="Describe el motivo del rechazo..."
                                    value={rejectOtherReasonText}
                                    onChange={(e) => setRejectOtherReasonText(e.target.value)}
                                />
                            </div>
                        )}
                    </div>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="outline-dark" className="rounded-pill px-4" onClick={() => setShowRejectModal(false)}>
                        Cancelar
                    </Button>
                    <Button variant="danger" className="rounded-pill px-4" onClick={confirmReject}>
                        Rechazar
                    </Button>
                </Modal.Footer>
            </Modal>

       {/* Modal para Tour Virtual 360 */}
            <Modal
                show={showTourModal}
                onHide={() => setShowTourModal(false)}
                fullscreen={true}
            >
                <Modal.Header closeButton>
                    <Modal.Title><FormattedMessage id='properties.text1' /></Modal.Title>
                </Modal.Header>
                <Modal.Body className="p-0" style={{ height: 'calc(100vh - 60px)' }}>
                    {data?.media?.link360 ? (
                        <iframe
                            src={data.media.link360}
                            style={{
                                width: '100%',
                                height: '100%',
                                border: 'none',
                                display: 'block'
                            }}
                            allowFullScreen
                            loading="lazy"
                            title="Tour Virtual 360"
                        />
                    ) : (
                        <div className="d-flex align-items-center justify-content-center h-100 text-muted">
                            <FormattedMessage id='properties.text1' /> no disponible
                        </div>
                    )}
                </Modal.Body>
            </Modal>
        </>
    )
}

export default View
