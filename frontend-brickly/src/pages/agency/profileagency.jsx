import { useState, useEffect, useRef } from 'react';
import { Modal } from 'react-bootstrap';
import { Container, Row, Col, Button } from 'react-bootstrap';
import { Link, useParams, useNavigate } from 'react-router-dom';

import gpi from './../../assets/images/iconos/gpi.png';
import expe from './../../assets/images/iconos/expe.png'
import house_aval from './../../assets/images/iconos/house_aval.png'
import lan from './../../assets/images/iconos/lang.png'
import leads from './../../assets/images/iconos/leads.png'

import diamond from '../../assets/images/iconos/diamond.png';
import diamondb from '../../assets/images/iconos/diamondBlue.png';
import space from '../../assets/images/iconos/spaces.png';

import alquiler from '../../assets/images/iconos/alquiler.png';
import venta from '../../assets/images/iconos/venta.png';
import arrow from '../../assets/images/iconos/arrow.png'

import alertify from 'alertifyjs';
import { FormattedMessage } from 'react-intl';
import { API_URL, getCurrentUser, isAuthenticated } from '../../services/authService';
import { getLogoUrl } from '../../services/logoService';
import { useFavorites } from '../../hooks/useFavorites';
import { useCurrency } from '../../context/CurrencyContext';
import { getDisplayPrice } from '../../utils/priceUtils';
import { createReview, getReviewsByAgent, updateReview, deleteReview } from '../../services/reviewService';
import { getContactLeads } from '../../services/contactService';
import { getPublicProfile } from '../../services/profileService';
import { getAgentProfilePath } from '../../utils/profileRoutes';
import { getPropertyPath } from '../../utils/propertyRoutes';
import StarRating from '../../components/StarRating';
import ContactForm from '../../components/ContactForm';
import { isProfileComplete } from '../../utils/profileUtils';
import { fetchAllPages } from '../../utils/fetchAll';
import { useT } from '../../hooks/useT';
import Slider from 'react-slick';
import SEO from '../../components/SEO';

function profileAgency() {

    const t = useT()

    const pluralize = (count, singular, plural) => count === 1 ? singular : plural

    const [agente, setagente] = useState(null)   // aquí guardamos la agencia
    const [whatsappUrl, setwhatsappUrl] = useState('')
    const [propiedades, setPropiedades] = useState([])
    const [propFiltradas, setPropFiltradas] = useState([])
    const [filtroActivo, setFiltroActivo] = useState('Todos')
    const [agentesDisponibles, setAgentesDisponibles] = useState([])
    const [loadingAgentes, setLoadingAgentes] = useState(true)
    const [leadsCount, setLeadsCount] = useState(0)
    const [total, setTotal] = useState(0)
    const [totalVenta, setTotalVenta] = useState(0)
    const [totalAlquiler, setTotalAlquiler] = useState(0)
    const [tiposMap, setTiposMap] = useState({})
    const [extraWSClicks, setExtraWSClicks] = useState(0)
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768)
    const [loading, setLoading] = useState(true)
    const sliderContainerRef = useRef(null)
    const [agencyId, setAgencyId] = useState(null)

    const syncSliderAccessibility = () => {
        const root = sliderContainerRef.current
        if (!root) return

        const slides = root.querySelectorAll('.slick-slide')
        slides.forEach((slide) => {
            const hidden = slide.getAttribute('aria-hidden') === 'true'
            const focusables = slide.querySelectorAll('a, button, input, select, textarea, [tabindex]')
            focusables.forEach((element) => {
                if (hidden) {
                    element.setAttribute('tabindex', '-1')
                } else if (element.getAttribute('tabindex') === '-1') {
                    element.removeAttribute('tabindex')
                }
            })
        })
    }

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth <= 768)
        window.addEventListener('resize', checkMobile)
        return () => window.removeEventListener('resize', checkMobile)
    }, [])

    useEffect(() => {
        const timer = setTimeout(() => syncSliderAccessibility(), 0)
        return () => clearTimeout(timer)
    }, [agentesDisponibles, isMobile])

    const params = useParams()
    const profileIdentifier = params.slug || params.id
    const url = API_URL
    const navigate = useNavigate()
    const { isFavorite, toggle: toggleFav, canFavorite } = useFavorites()
    const { currency: currencyMode } = useCurrency()

    useEffect(() => {
        if (!agencyId) return
        const visitKey = `visited_agency_${agencyId}`
        if (visitRegistered.current || localStorage.getItem(visitKey)) return
        visitRegistered.current = true
        fetch(`${API_URL}/users/${agencyId}/click`, { method: 'POST' })
            .then(() => localStorage.setItem(visitKey, '1'))
            .catch(e => console.error('Error registrando visita', e))
    }, [agencyId])

    useEffect(() => {
        const loadAgencyData = async () => {
            setLoadingAgentes(true);
            try {
                if (!profileIdentifier) return;

                const found = await getPublicProfile(profileIdentifier);
                const roles = Array.isArray(found?.roles) ? found.roles : [found?.roles].filter(Boolean);

                if (!found?.isEnabled || !roles.includes('agencia')) {
                    setagente(null);
                    setLoading(false);
                    return;
                }

                setAgencyId(found._id);
                setagente(found);
                setwhatsappUrl(`https://wa.me/${found.phone.replace(/\D/g, '')}?text=` + encodeURIComponent('¡Hola! Estoy interesado en una propiedad.'))

                // La API ya filtra: solo agentes con propiedades publicadas
                const hijosAgentes = await fetchAllPages(`${API_URL}/users/list-user?hasProperty=published&roles=agente`);

                // Agentes hijos activos que pertenecen a esta agencia
                const hijos = hijosAgentes.filter(u =>
                    String(u.parentId?._id || u.parentId || '') === String(found._id) &&
                    u.isEnabled
                ).map(a => ({
                    ...a,
                    agencia: {
                        _id: found._id,
                        profileSlug: found.profileSlug,
                        name: found.name || ''
                    },
                    avatarUrl: a.avatar ? API_URL + a.avatar.replace('/uploads', '') : null,
                    propCount: Array.isArray(a.propertiesPublished) ? a.propertiesPublished.length : (a.propCount || 0)
                }));

                setAgentesDisponibles(hijos);
            } catch (error) {
                console.error('Error cargando datos de la agencia:', error);
                setagente(null);
                setLoading(false);
            } finally {
                setLoadingAgentes(false);
            }
        };
        loadAgencyData();
    }, [profileIdentifier])

    // Cargar leads de la agencia
    useEffect(() => {
        if (!agencyId) return;
        const loadLeads = async () => {
            const result = await getContactLeads({ agentId: agencyId });
            if (result.success) {
                setLeadsCount(Array.isArray(result.data) ? result.data.length : 0);
            }
        };
        loadLeads();
    }, [agencyId]);

    // Cargar propiedades de la agencia (3 más recientes + totales por modo + tipos)
    useEffect(() => {
        if (!agencyId) return;
        const loadProps = async () => {
            try {
                const baseUrl = `${API_URL}/properties?userId=${agencyId}&status=published`;
                const tipos = ['Casa', 'Apartamento', 'Terreno', 'Oficina', 'Bodega', 'Local comercial', 'Edificio', 'Finca'];
                const [recentRes, ventaRes, alquilerRes, ...tipoRes] = await Promise.all([
                    fetch(`${baseUrl}&limit=3`).then(r => r.json()).catch(() => ({ data: [], total: 0 })),
                    fetch(`${baseUrl}&market.mode=Venta&limit=1`).then(r => r.json()).catch(() => ({ total: 0 })),
                    fetch(`${baseUrl}&market.mode=Alquiler&limit=1`).then(r => r.json()).catch(() => ({ total: 0 })),
                    ...tipos.map(t => fetch(`${baseUrl}&market.type=${t}&limit=1`).then(r => r.json()).catch(() => ({ total: 0 }))),
                ]);
                const props = recentRes.data || [];
                setPropiedades(props);
                setPropFiltradas(props);
                setTotal(recentRes.total || 0);
                setTotalVenta(ventaRes.total || 0);
                setTotalAlquiler(alquilerRes.total || 0);
                // Mapa de tipos con al menos 1 propiedad
                const tiposMap = {};
                tipoRes.forEach((res, i) => {
                    if (res.total > 0) tiposMap[tipos[i]] = true;
                });
                setTiposMap(tiposMap);
            } catch (error) {
                console.error('Error cargando propiedades:', error);
            } finally {
                setLoading(false);
            }
        };
        loadProps();
    }, [agencyId]);

    const aplicarFiltro = (modo) => {
        setFiltroActivo(modo);
        if (modo === 'Todos') {
            setPropFiltradas(propiedades);
        } else {
            setPropFiltradas(propiedades.filter(p => p.market?.mode === modo));
        }
        navigate('/propiedades', { state: { userId: agencyId, agentName: agente?.name, mode: modo } });
    };

    const ultimas3 = propFiltradas.slice(-3).reverse();

    // Tipos de propiedad (verificados por API en totales)
    const tiposDisponibles = tiposMap;


    const formatPrice = (raw, currency) => {
        const num = parseFloat(raw) || 0;
        if (currency === 'GTQ') {
            return 'Q ' + new Intl.NumberFormat('es-GT', { minimumFractionDigits: 0 }).format(num);
        }
        return '$ ' + new Intl.NumberFormat('en-US', { minimumFractionDigits: 0 }).format(num);
    };

    const visitRegistered = useRef(false)

    // Estado para el módulo de reseña
    const currentUser = getCurrentUser()
    const isClient = Array.isArray(currentUser?.roles)
        ? currentUser.roles.some(r => r === 'client' || r === 'cliente')
        : currentUser?.roles === 'client' || currentUser?.roles === 'cliente'
    const [starHover, setStarHover] = useState(0)
    const [starSelected, setStarSelected] = useState(0)
    const [reviewComment, setReviewComment] = useState('')
    const [reviewLoading, setReviewLoading] = useState(false)
    const [reviewMsg, setReviewMsg] = useState(null) // { type: 'success'|'error', text }
    const [myReview, setMyReview] = useState(null) // reseña existente del usuario
    const [isEditingReview, setIsEditingReview] = useState(false)

    const [reviewAlert, setReviewAlert] = useState({ show: false, variant: '', message: '' });

    const handleDeleteReview = () => {
        alertify.confirm(
            'BRICKLY HOMES',
            t('¿Estás seguro de eliminar tu reseña?', 'Are you sure you want to delete your review?'),
            async () => {
                setReviewLoading(true);
                setReviewMsg(null);

                const result = await deleteReview(agencyId);

                setReviewLoading(false);
                if (result.success) {
                    setMyReview(null);
                    setReviews(prev => prev.filter(r => r._id !== myReview?._id));
                    setReviewAlert({ show: true, variant: 'success', message: t('¡Reseña eliminada correctamente!', 'Review deleted successfully!') });
                    setTimeout(() => setReviewAlert(prev => ({ ...prev, show: false })), 3000);
                    setIsEditingReview(false);
                    setStarSelected(0);
                    setStarHover(0);
                    setReviewComment('');
                } else {
                    setReviewAlert({ show: true, variant: 'danger', message: result.error || t('Error al eliminar la reseña.', 'Error deleting review.') });
                    setTimeout(() => setReviewAlert(prev => ({ ...prev, show: false })), 3000);
                }
            },
            () => {} // Cancel
        );
    };

    const handleSubmitReview = async () => {
        if (starSelected === 0) {
            setReviewMsg({ type: 'error', text: t('Selecciona una calificación.', 'Please select a rating.') })
            return
        }
        if (!reviewComment.trim()) {
            setReviewMsg({ type: 'error', text: t('Escribe un comentario.', 'Please write a comment.') })
            return
        }
        setReviewLoading(true)
        setReviewMsg(null)

        let result
        if (myReview && isEditingReview) {
            result = await updateReview({ agentId: agencyId, comment: reviewComment.trim(), rating: starSelected })
        } else {
            result = await createReview({ agentId: agencyId, comment: reviewComment.trim(), rating: starSelected })
        }

        setReviewLoading(false)
        if (result.success) {
            const updated = { ...myReview, comment: reviewComment.trim(), rating: starSelected }

            // Construir reviewerId con los datos actuales del usuario para mostrar sin refrescar
            const avatarPath = currentUser?.avatar
            const enrichedReviewerId = {
                _id: currentUser?._id,
                name: currentUser?.name || null,
                avatar: avatarPath || null,
                avatarUrl: avatarPath
                    ? API_URL + avatarPath.replace('/uploads', '')
                    : null
            }

            const newReview = {
                ...result.data,
                reviewerId: enrichedReviewerId
            }

            setMyReview(myReview ? updated : newReview)
            setReviews(prev => myReview
                ? prev.map(r => r._id === myReview._id ? { ...r, comment: reviewComment.trim(), rating: starSelected } : r)
                : [newReview, ...prev]
            )
            setReviewMsg({ type: 'success', text: myReview
                ? t('¡Reseña actualizada correctamente!', 'Review updated successfully!')
                : t('¡Reseña enviada correctamente!', 'Review submitted successfully!')
            })
            setIsEditingReview(false)
            setStarSelected(0)
            setStarHover(0)
            setReviewComment('')
        } else {
            setReviewMsg({ type: 'error', text: result.error || t('Error al enviar la reseña.', 'Error submitting review.') })
        }
    }
    
    const [reviews, setReviews] = useState([])
    const [showAllReviews, setShowAllReviews] = useState(false)
    const [modalRatingFilter, setModalRatingFilter] = useState('Todas')
    const [modalSort, setModalSort] = useState('recientes')

    // Calcular ratingCount y ratingAverage desde las reseñas reales
    const ratingCount = reviews.length
    const ratingAverage = ratingCount > 0
        ? (reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / ratingCount)
        : 0

    useEffect(() => {
        if (!agencyId) return
        const loadReviews = async () => {
            try {
                const result = await getReviewsByAgent(agencyId)
                if (result.success) {
                    setReviews(result.data)
                    const mine = result.data.find(r => r.reviewerId?._id === currentUser?._id)
                    if (mine) setMyReview(mine)
                        
                    //console.log(result.data);
                }
            } catch(e) {
                console.error('Error cargando reseñas:', e)
            }
        }
        loadReviews()
    }, [agencyId])

    return (
        <Container style={{ marginTop: 'clamp(2rem, 3vw, 4rem)', marginBottom: 'clamp(2rem, 5vw, 5rem)' }}>
            { agente && (
                <>
                <SEO title={agente.name} description={agente.agentInfo?.description || `Perfil de la agencia inmobiliaria ${agente.name} en Brickly Homes.`} />
                <Link onClick={() => navigate(-1)} className='d-block my-4 text-end' title='Atrás' aria-label={t('Volver a la vista anterior', 'Go back to previous view')}><img src={arrow} style={{ width: 'clamp(30px, 5vw, 40px)' }} alt="Atrás" srcSet="" /></Link>
                    <Row className='g-5 flex-column-reverse flex-lg-row'>
                        <Col lg={5}>
                            <div style={{ backgroundColor: '#f9f9f9' }}>
                                <div className="position-relative d-none d-lg-block">
                                    <img src={url+agente.avatar.replace('/uploads', '')} alt="Agency" className='ratio ratio-1x1 w-100 object-fit-cover border' style={{ height: '460px' }} loading="lazy" />
                                    <div className="position-absolute top-0 start-0 w-100 h-100" style={{ pointerEvents: 'none', padding: '5%' }}>
                                        <div className="d-flex align-items-baseline gap-2">
                                            {agente.featured_user ? (
                                                    <div className='d-flex gap-2 align-items-center rounded-4' style={{ backgroundColor: '#000000c7', color: 'white', width: 'fit-content', padding: '3px 10px', fontSize: '14px' }}>
                                                        <img src={diamond} style={{ width: '14px' }} alt="" /> Destacado
                                                    </div>
                                            ) : null}
                                            {agente.agentInfo?.verified == true ? (
                                                <div className="d-flex align-items-center gap-2 py-1 px-2 rounded-4" style={{ background: '#193968', color: '#fff', width: 'fit-content', fontSize: '14px', padding: '3px 10px'}}><img src={gpi} style={{ width: '28px' }} alt="GPI" /> <div style={{ width: '0.1px', minHeight: '20px', backgroundColor: '#fff' }}></div> Verificado</div>
                                            ) : null}
                                        </div>
                                    </div>
                                </div>
                                <div className='py-3 px-auto px-2px-lg-4'>
                                    <div className='fs-4 mb-2'>{t('Contáctanos', 'Contact')}</div>
                                    <div className="d-flex justify-content-between flex-column flex-xl-row align-items-xl-end gap-4 gap-lg-2">
                                        <div className="d-flex flex-column gap-1">
                                            <a href={`tel:${agente.phone.replace(/\D/g, '')}`} className="d-flex align-items-center gap-2 text-body" aria-label={`Llamar a ${agente.name}`}><i className="fa-solid fa-mobile-screen-button" aria-hidden="true"></i> {agente.phone}</a>
                                            <a href={`mailto:${agente.email}`} className="d-flex align-items-center gap-2 text-body" aria-label={`Enviar correo a ${agente.name}`}><i className="fa-regular fa-envelope" aria-hidden="true"></i> {agente.email}</a>
                                            <div className="d-flex align-items-center gap-2"><i className="fa-solid fa-location-dot" style={{ width: '100%', maxWidth: '20px' }}></i> {agente.agentInfo?.address} </div>
                                            <a href={agente.agentInfo?.wesite} target='_blank' rel="noreferrer" className="d-flex align-items-center gap-2 text-body text-truncate" style={{ maxWidth: '280px' }} aria-label={`Abrir sitio web de ${agente.name}`}>
                                                <i className="fa-solid fa-globe" aria-hidden="true"></i>
                                                <span className="text-truncate">{agente.agentInfo?.wesite}</span>   
                                            </a>
                                        </div>
                                        { (agente?.agentInfo?.tiktok || agente?.agentInfo?.instagram || agente?.agentInfo?.linkedin) && (
                                            <div className="d-flex algin-items-center gap-2">
                                                { agente?.agentInfo?.instagram &&
                                                    <a href={`${agente?.agentInfo.instagram}`} target='_blank' rel="noreferrer" className='text-white bg-dark rounded-circle' title='Instagram' aria-label={`Abrir Instagram de ${agente.name}`} style={{ width: '30px', height: '30px', display: 'grid', placeItems: 'center' }}><i className="fa-brands fa-instagram" aria-hidden="true"></i></a>
                                                }
                                                { agente?.agentInfo?.linkedin &&
                                                    <a href={`${agente?.agentInfo.linkedin}`} target='_blank' rel="noreferrer" className='text-white bg-dark rounded-circle' title='Linkedin' aria-label={`Abrir LinkedIn de ${agente.name}`} style={{ width: '30px', height: '30px', display: 'grid', placeItems: 'center' }}><i className="fa-brands fa-linkedin" aria-hidden="true"></i></a>
                                                }
                                                { agente?.agentInfo?.tiktok &&
                                                    <a href={`${agente?.agentInfo.tiktok}`} target='_blank' rel="noreferrer" className='text-white bg-dark rounded-circle' title='Tiktok' aria-label={`Abrir TikTok de ${agente.name}`} style={{ width: '30px', height: '30px', display: 'grid', placeItems: 'center' }}><i className="fa-brands fa-tiktok" aria-hidden="true"></i></a>
                                                }
                                            </div> )
                                        }
                                    </div>
                                </div>
                            </div>
                        </Col>
                        <Col lg={7}>
                            <div>
                                <div className="d-flex flex-column flex-lg-row align-items-start align-items-lg-center gap-3 mb-4">
                                    {agente.agentInfo?.logo && (
                                         <img src={getLogoUrl(agente.agentInfo.logo)} alt="Logo" className="object-fit-cover ratio ratio-1x1 rounded-circle border" style={{ width: 'clamp(60px, 5vw, 70px)', height: 'clamp(60px, 5vw, 70px)' }} loading="lazy" />
                                    )}
                                    <div className="lh-1" style={{ fontSize: 'clamp(38px, 4.5vw, 142px)', fontFamily: 'AppleGaramond' }}>{agente.name}</div>
                                </div>
                                <div className="position-relative d-block d-lg-none">
                                    {/* imagen movil */}
                                    <img src={url+agente.avatar.replace('/uploads', '')} alt="Agency" className='ratio ratio-1x1 w-100 object-fit-cover border d-block d-lg-none mb-4' style={{ height: '460px', objectPosition: 'top' }} loading="lazy" />
                                    <div className="position-absolute top-0 start-0 w-100 h-100" style={{ pointerEvents: 'none', padding: '5%' }}>
                                        <div className="d-flex align-items-baseline gap-2">
                                            {agente.featured_user ? (
                                                    <div className='d-flex gap-2 align-items-center rounded-4' style={{ backgroundColor: '#000000c7', color: 'white', width: 'fit-content', padding: '3px 10px', fontSize: '14px' }}>
                                                        <img src={diamond} style={{ width: '14px' }} alt="" /> Destacado
                                                    </div>
                                            ) : null}
                                            {agente.agentInfo?.verified == true ? (
                                                <div className="d-flex align-items-center gap-2 py-1 px-2 rounded-4" style={{ background: '#193968', color: '#fff', width: 'fit-content', fontSize: '14px', padding: '3px 10px'}}><img src={gpi} style={{ width: '28px' }} alt="GPI" /> <div style={{ width: '0.1px', minHeight: '20px', backgroundColor: '#fff' }}></div> Verificado</div>
                                            ) : null}
                                        </div>
                                    </div>
                                </div>
                                <div className='mb-3 d-flex align-items-baseline gap-5' style={{ fontSize: '20px' }}>
                                    <div className='mt-1'>
                                        <StarRating rating={ratingAverage} size='16px' />
                                    </div>
                                    <div className='text-decoration-underline'>{ratingCount} {t(pluralize(ratingCount, 'Reseña', 'Reseñas'), pluralize(ratingCount, 'Review', 'Reviews'))}</div>
                                </div>
                                <div style={{ fontSize: 'clamp(16px, 3vw, 18px)' }}>{agente.agentInfo?.description}</div>
                                <div className="d-flex gap-5 mt-3 flex-column" style={{ fontSize: '16px' }}>
                                    <div className='mt-4 mt-lg-0 gap-2 gap-lg-3' style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
                                        <div className='d-flex align-items-center gap-3'><img src={house_aval} style={{ width: '30px' }} alt="icons" />{propiedades.length} {t(pluralize(propiedades.length, 'Propiedad disponible', 'Propiedades disponibles'), pluralize(propiedades.length, 'Available property', 'Available properties'))}</div>
                                        <div className='d-flex align-items-center gap-3'><img src={expe} style={{ width: '30px' }} alt="icons" />{agente.agentInfo.expe} {t(pluralize(agente.agentInfo.expe, 'Año de experiencia', 'Años de experiencia'), pluralize(agente.agentInfo.expe, 'Year of experience', 'Years of experience'))}</div>
                                    <div className='d-flex align-items-center gap-3'><img src={leads} style={{ width: '30px' }} alt="icons" />{new Intl.NumberFormat().format(leadsCount + (agente?.clickCounterWs || 0) + extraWSClicks)} {t(pluralize(leadsCount + (agente?.clickCounterWs || 0) + extraWSClicks, 'Prospecto', 'Prospectos'), pluralize(leadsCount + (agente?.clickCounterWs || 0) + extraWSClicks, 'Prospect', 'Prospects'))}</div>
                                        <div className='d-flex align-items-center gap-3'><i className="fa-sharp fa-regular fa-people-group" style={{ width: '30px', height: '25px', fontSize: '24px' }}></i>{agentesDisponibles.length} {t(pluralize(agentesDisponibles.length, 'Agente disponible', 'Agentes disponibles'), pluralize(agentesDisponibles.length, 'Available agent', 'Available agents'))}</div>
                                    </div>
                                </div>
                                <div className='mt-5'>
                                    { loadingAgentes ? (
                                        <div>
                                            <div className='mb-3' style={{ fontSize: '18px' }}>{t('Agentes disponibles', 'Available agents')}</div>
                                            <div className="d-flex gap-3" style={{ overflow: 'hidden' }}>
                                                {Array.from({ length: isMobile ? 2 : 5 }).map((_, i) => (
                                                    <div key={i} className="placeholder-glow" style={{ flex: '0 0 auto', width: isMobile ? '50%' : 'calc(20% - 12px)', minWidth: '160px' }}>
                                                        <div className="placeholder w-100 bg-secondary rounded-3" style={{ aspectRatio: '1 / 1', height: '200px' }}></div>
                                                        <div className="mt-2 d-flex flex-column align-items-center gap-1">
                                                            <p className="placeholder col-8 rounded-1 mb-0" style={{ height: '18px' }}></p>
                                                            <p className="placeholder col-5 rounded-1 mb-0" style={{ height: '12px' }}></p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ) : agentesDisponibles.length > 0 && (
                                        <div>
                                            <div className='mb-3' style={{ fontSize: '18px' }}>{t('Agentes disponibles', 'Available agents')}</div>
                                            {agentesDisponibles.length === 1 ? (
                                                <div style={{ maxWidth: isMobile ? '50%' : '20%', minWidth: '200px' }}>
                                                    {agentesDisponibles.map((agnt, i) => (
                                                        <div key={i} className="px-2">
                                                            <Link to={getAgentProfilePath(agnt)} className="text-body text-decoration-none d-block">
                                                                <div className="position-relative mx-auto" style={{ borderRadius: '14px', width: '100%' }}>
                                                                    <img
                                                                        src={agnt.avatarUrl || ''}
                                                                        alt={agnt.name}
                                                                        className="object-fit-cover rounded-3 w-100"
                                                                        style={{ objectPosition: 'top', display: 'block', height: '200px' }}
                                                                    />
                                                                    <div className="position-absolute top-0 start-0 m-2">
                                                                        <div className="d-flex align-items-center gap-2">
                                                                            {agnt.featured_user ? (
                                                                                    <img src={agnt.featured_user === 2 ? diamondb : diamond} style={{ width: '24px' }} alt="destacado" />
                                                                            ) : null}
                                                                            
                                                                            {agnt.agentInfo?.verified == true ? (
                                                                                <div className="d-flex align-items-center rounded-4" style={{ background: '#193968', width: '29px', height: '29px' }}><img src={gpi} style={{ width: '28px' }} alt="GPI" className="d-block mx-auto" /></div>
                                                                            ) : null}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div className="mt-1 px-1 text-center mx-auto" style={{ width: '100%' }}>
                                                                    <div className="text-truncate" style={{ fontSize: '16px' }}>{agnt.name}</div>
                                                                    <div className="d-flex justify-content-center mt-0">
                                                                        <StarRating rating={agnt.ratingAverage} size='9px' />
                                                                    </div>
                                                                </div>
                                                            </Link>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="agentes-slider" ref={sliderContainerRef}>
                                                <Slider
                                                    key={isMobile ? 'mobile' : 'desktop'}
                                                    dots={false}
                                                    arrows={true}
                                                    infinite={agentesDisponibles.length >= 2}


                                                    speed={500}
                                                    slidesToShow={isMobile ? 2 : Math.min(agentesDisponibles.length, 4)}
                                                    slidesToScroll={1}
                                                    autoplay={isMobile ? true : agentesDisponibles.length >= 2}
                                                    autoplaySpeed={2500}
                                                    pauseOnHover={false}
                                                    swipeToSlide={true}
                                                    afterChange={() => syncSliderAccessibility()}
                                                    responsive={isMobile ? [] : [
                                                        {
                                                            breakpoint: 1400,
                                                            settings: {
                                                                slidesToShow: Math.min(agentesDisponibles.length, 4),
                                                                slidesToScroll: 1,
                                                                infinite: agentesDisponibles.length >= 2,
                                                                autoplay: agentesDisponibles.length >= 2,
                                                                autoplaySpeed: 2500,
                                                                pauseOnHover: false
                                                            }
                                                        },
                                                        {
                                                            breakpoint: 1200,
                                                            settings: {
                                                                slidesToShow: Math.min(agentesDisponibles.length, 3),
                                                                slidesToScroll: 1,
                                                                infinite: agentesDisponibles.length >= 2,
                                                                autoplay: agentesDisponibles.length >= 2,
                                                                autoplaySpeed: 2500,
                                                                pauseOnHover: false
                                                            }
                                                        },
                                                        {
                                                            breakpoint: 992,
                                                            settings: {
                                                                slidesToShow: Math.min(agentesDisponibles.length, 3),
                                                                slidesToScroll: 1,
                                                                infinite: agentesDisponibles.length >= 2,
                                                                autoplay: agentesDisponibles.length >= 2,
                                                                autoplaySpeed: 2500,
                                                                pauseOnHover: false
                                                            }
                                                        },
                                                        {
                                                            breakpoint: 768,
                                                            settings: {
                                                                slidesToShow: Math.min(agentesDisponibles.length, 2),
                                                                slidesToScroll: 1,
                                                                infinite: agentesDisponibles.length >= 2,
                                                                autoplay: agentesDisponibles.length >= 2,
                                                                autoplaySpeed: 2500,
                                                                pauseOnHover: false
                                                            }
                                                        },
                                                    ]}
                                                >

                                                    {agentesDisponibles.map((agnt, i) => (
                                                        <div key={i}>

                                                            <Link to={getAgentProfilePath(agnt)} className="text-body text-decoration-none d-block">
                                                                {/* Imagen cuadrada con border-radius y estrella */}
                                                                <div className="position-relative mx-auto" style={{ borderRadius: '14px', width: '100%', maxWidth: '200px', height: '200px' }}>
                                                                    <img
                                                                        src={agnt.avatarUrl || ''}
                                                                        alt={agnt.name}
                                                                        className="object-fit-cover rounded-3 w-100 h-100"
                                                                        style={{ objectPosition: 'top', display: 'block' }}
                                                                    />
                                                                    {/* Diamante si es agente destacado */}
                                                                    <div className="position-absolute top-0 start-0 m-2">
                                                                        <div className="d-flex align-items-center gap-2">
                                                                            {agnt.featured_user ? (
                                                                                    <img src={agnt.featured_user === 2 ? diamondb : diamond} style={{ width: '24px' }} alt="destacado" />
                                                                            ) : null}
                                                                            
                                                                            {agnt.agentInfo?.verified == true ? (
                                                                                <div className="d-flex align-items-center rounded-4" style={{ background: '#193968', width: '29px', height: '29px' }}><img src={gpi} style={{ width: '28px' }} alt="GPI" className="d-block mx-auto" /></div>
                                                                            ) : null}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                {/* Nombre y rating debajo */}
                                                                <div className="mt-1 px-1 text-center mx-auto" style={{ width: '100%', maxWidth: '200px' }}>
                                                                    <div className="text-truncate" style={{ fontSize: '16px' }}>{agnt.name}</div>
                                                                    <div className="d-flex justify-content-center mt-0">
                                                                        <StarRating rating={agnt.ratingAverage} size='9px' />
                                                                    </div>
                                                                </div>
                                                            </Link>
                                                        </div>
                                                    ))}
                                                </Slider>
                                            </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </Col>
                    </Row>

                    {/* Separador */}
                    <div className="d-flex flex-column gap-3" style={{ marginTop: 'clamp(2rem, 6vw, 6rem)' }}>
                        <div style={{fontSize: 'clamp(26px, 3vw, 40px)'}} className='mb-3'>{t(`Propiedades disponibles de ${agente.name}`, `Properties available from ${agente.name}`)}</div>
                        <div className="d-flex align-items-center gap-4 gap-md-5 links" style={{fontSize: 'clamp(14px, 3vw, 22px)'}}>
                            <button
                                onClick={() => aplicarFiltro('Todos')}
                                className={`btn btn-link text-body text-decoration-none p-0 ${filtroActivo === 'Todos' ? 'fw-bold' : ''}`}
                            >
                                <FormattedMessage id='favorite.text2' /> ({total})
                            </button>
                            <button
                                onClick={() => aplicarFiltro('Venta')}
                                className={`btn btn-link text-body text-decoration-none p-0 d-flex align-items-center gap-1 gap-lg-2 ${filtroActivo === 'Venta' ? 'fw-bold' : ''}`}
                            >
                                <img src={venta} alt="icons" style={{ width: '20px' }} />
                                <FormattedMessage id='favorite.text3' /> ({totalVenta})
                            </button>
                            <button
                                onClick={() => aplicarFiltro('Alquiler')}
                                className={`btn btn-link text-body text-decoration-none p-0 d-flex align-items-center gap-1 gap-lg-2 ${filtroActivo === 'Alquiler' ? 'fw-bold' : ''}`}
                            >
                                <img src={alquiler} alt="icons" style={{ width: '20px' }} />
                                <FormattedMessage id='favorite.text4' /> ({totalAlquiler})
                            </button>
                        </div>
                    </div>
                    <div className="d-flex flex-column flex-md-row gap-5 gap-md-0 justify-content-between align-items-center mt-5">
                        <div className='d-flex align-items-center gap-3 flex-wrap'>
                            {tiposDisponibles['Casa'] && (
                                <Button variant='light' style={{ borderColor: '#cbcbcb' }} onClick={() => navigate('/propiedades', { state: { type: 'Casa', userId: agencyId, agentName: agente.name } })}><FormattedMessage id='profileAgent.text6' /></Button>
                            )}
                            {tiposDisponibles['Apartamento'] && (
                                <Button variant='light' style={{ borderColor: '#cbcbcb' }} onClick={() => navigate('/propiedades', { state: { type: 'Apartamento', userId: agencyId, agentName: agente.name } })}><FormattedMessage id='profileAgent.text7' /></Button>
                            )}
                            {tiposDisponibles['Terreno'] && (
                                <Button variant='light' style={{ borderColor: '#cbcbcb' }} onClick={() => navigate('/propiedades', { state: { type: 'Terreno', userId: agencyId, agentName: agente.name } })}><FormattedMessage id='profileAgent.text9' /></Button>
                            )}
                            {tiposDisponibles['Oficina'] && (
                                <Button variant='light' style={{ borderColor: '#cbcbcb' }} onClick={() => navigate('/propiedades', { state: { type: 'Oficina', userId: agencyId, agentName: agente.name } })}><FormattedMessage id='profileAgent.text10' /></Button>
                            )}
                            {tiposDisponibles['Bodega'] && (
                                <Button variant='light' style={{ borderColor: '#cbcbcb' }} onClick={() => navigate('/propiedades', { state: { type: 'Bodega', userId: agencyId, agentName: agente.name } })}><FormattedMessage id='profileAgent.text8' /></Button>
                            )}
                            {tiposDisponibles['Local comercial'] && (
                                <Button variant='light' style={{ borderColor: '#cbcbcb' }} onClick={() => navigate('/propiedades', { state: { type: 'Local comercial', userId: agencyId, agentName: agente.name } })}>Local comercial</Button>
                            )}
                            {tiposDisponibles['Edificio'] && (
                                <Button variant='light' style={{ borderColor: '#cbcbcb' }} onClick={() => navigate('/propiedades', { state: { type: 'Edificio', userId: agencyId, agentName: agente.name } })}>Edificio</Button>
                            )}
                            {tiposDisponibles['Finca'] && (
                                <Button variant='light' style={{ borderColor: '#cbcbcb' }} onClick={() => navigate('/propiedades', { state: { type: 'Finca', userId: agencyId, agentName: agente.name } })}>Finca</Button>
                            )}
                        </div>

                        <Link
                            to="/propiedades"
                            state={{ userId: agencyId, agentName: agente.name, mode: filtroActivo }}
                            className='text-body text-decoration-none d-flex align-items-center gap-2'
                            style={{fontSize: 'clamp(16px, 3vw, 18px)'}}
                        >
                            <FormattedMessage id='profileAgent.text11' />
                            <i className="fa-regular fa-arrow-right"></i>
                        </Link>
                    </div>
                    <div style={{ marginTop: '2rem', marginBottom: '6rem'}}>
                        <div className="row gy-5">
                            {loading ? (
                                Array.from({ length: 3 }).map((_, i) => (
                                    <div key={i} className="col-md-6 col-xl-4">
                                        <div className="placeholder-glow">
                                            <div className="placeholder w-100 bg-secondary" style={{ aspectRatio: '4 / 4', borderRadius: '4px' }}></div>
                                            <div className="mt-3 d-flex flex-column gap-2">
                                                <p className="placeholder col-8 rounded-1" style={{ height: '28px' }}></p>
                                                <p className="placeholder col-5 rounded-1" style={{ height: '16px' }}></p>
                                                <p className="placeholder col-4 rounded-1" style={{ height: '16px' }}></p>
                                                <p className="placeholder col-7 rounded-1" style={{ height: '16px' }}></p>
                                                <p className="placeholder col-6 rounded-1" style={{ height: '24px' }}></p>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : ultimas3.length > 0 ? ultimas3.map((item, index) => {
                                const mainPhoto = item.media?.photos?.find(p => p.isMain) || item.media?.photos?.[0];
                                const imgSrc = mainPhoto ? `${url}/${mainPhoto.path}` : null;
                                return (
                                    <div key={item._id || index} className="col-md-6 col-xl-4">
                                        <Link to={getPropertyPath(item)} className="position-relative d-block propiedades-zoom" onClick={() => sessionStorage.setItem('fromAgentId', agencyId)}>
                                            {imgSrc
                                                ? <img src={imgSrc} className="object-fit-cover w-100 border-radius-1" style={{ aspectRatio: '4 / 4' }} alt="" loading="lazy" />
                                                : <div className="w-100 bg-secondary border-radius-1" style={{ aspectRatio: '4 / 4' }}></div>
                                            }
                                            <div style={{ padding: '5%' }} className='position-absolute top-0 w-100 h-100 d-flex flex-column justify-content-between'>
                                                {item.featured?.isActive ? (
                                                    <div className='d-flex gap-2 align-items-center rounded-4' style={{ backgroundColor: '#000000c7', color: 'white', width: 'fit-content', padding: '3px 10px', fontSize: '14px' }}>
                                                        <img src={diamond} style={{ width: '14px' }} alt="" /><FormattedMessage id="home.text31" />
                                                    </div>
                                                    ) : <div />
                                                }
                                                <div className='d-flex justify-content-end align-items-center mt-auto gap-2'>
                                                    <div className='rounded-4' style={{ backgroundColor: '#000000c7', color: 'white', padding: '3px 10px', fontSize: '12px' }}><FormattedMessage id="home.text8" />: {item.visitCounter || 0}</div>
                                                    <div className={`favorite-icon ${isFavorite(item._id) ? 'like' : 'unlike'}`} style={{ cursor: 'pointer' }} onClick={(e) => { e.preventDefault(); if (isAuthenticated() && !canFavorite) return; const iconElement = e.currentTarget.querySelector('i'); iconElement.style.transform = 'scale(1.3)'; setTimeout(() => { iconElement.style.transform = 'scale(1)'; toggleFav(item._id); }, 200); }}>
                                                        <i className="fa-solid fa-heart"></i>
                                                    </div>
                                                </div>
                                            </div>
                                        </Link>
                                        <Link className="text-body flex-grow-1 d-flex flex-column" to={getPropertyPath(item)}>
                                            <div className='mt-3 d-flex flex-column flex-grow-1'>
                                            <div className="text-truncate" style={{ fontSize: 'clamp(34px, 6vw, 46px)', fontFamily: 'AppleGaramond' }}>{ item.market.title }</div>
                                            <div>
                                                <i className='fa-solid fa-location-dot me-2' style={{ width: 'fit-content' }}></i>
                                                {item?.location?.department && item?.location?.department.toLowerCase() !== "ninguno" && (
                                                    <>{item?.location?.department}</>
                                                )}
                                                {item?.location?.department && item?.location?.department.toLowerCase() !== "ninguno" &&
                                                item?.location?.municipality && item?.location?.municipality.toLowerCase() !== "ninguno" && (
                                                    <>, {item?.location?.municipality}</>
                                                )}
                                                {item?.location?.municipality && item?.location?.municipality.toLowerCase() !== "ninguno" &&
                                                item?.location?.zone && item?.location?.zone.toLowerCase() !== "ninguno" && (
                                                    <>, {item?.location?.zone}</>
                                                )}
                                            </div>
                                            <div><FormattedMessage id="home.text9" />: { item.market.type }</div>
                                            { (item.layout?.bedrooms > 0 || item.layout?.bathrooms > 0 || item?.layout?.parkingSpots > 0 || item?.dimensions?.landM2 > 0 || item?.dimensions?.landV2 > 0) && 
                                                <div className='d-flex gap-4 my-3' style={{ fontSize: '16px' }}>
                                                {item.layout?.bedrooms > 0 && (
                                                    item?.market?.type?.toLowerCase() === 'oficina' && item?.layout?.totalRooms > 0 ? (
                                                    <div className='d-flex align-items-center gap-2' title='Total de ambientes'><img src={space} alt="icon" style={{ width: '14px' }} /> {item.layout?.totalRooms}</div>
                                                    ) : (
                                                    <div title='Total de habitaciones'><i className="fa-solid fa-bed me-2"></i> {item?.layout?.bedrooms || 0}</div>
                                                    ))}
                                                {item.layout?.bathrooms > 0 &&
                                                    <div title='Total de baños'><i className="fa-solid fa-bath me-2"></i> {(item.layout?.bathrooms || 0) + (item.layout?.halfBathrooms || 0)}</div>
                                                }
                                                {item.layout?.parkingSpots > 0 &&
                                                    <div title='Parqueo / Driveway'><i className="fa-solid fa-car-side me-2"></i> {item.layout?.parkingSpots || 0}</div>
                                                }
                                                {(item?.dimensions?.landM2 > 0 || item?.dimensions?.landV2 > 0) &&
                                                    <div title={item?.dimensions?.landM2 > 0 ? 'Área de terreno (m²)' : 'Área de terreno (v²)'}><i className="fa-solid fa-crop-simple me-2"></i> {item?.dimensions?.landM2 > 0 ? `${item.dimensions.landM2}m²` : `${item.dimensions.landV2}v²`}</div>
                                                }
                                                </div>
                                            }
                                            <div className='mt-auto fw-bold fs-4 text-dark d-flex align-items-center gap-4'>
                                                {(() => {
                                                const dp = getDisplayPrice(item.market, currencyMode);
                                                return dp ? formatPrice(dp.value, dp.currency) : null;
                                                })()}
                                                { item.market.mode && (() => {
                                                let modeImg = ""
                                                let modeColor = ""
                                                let modeText = ""
                                                if(item.market.mode == "Venta"){
                                                    modeImg = venta
                                                    modeColor = "bg-dark"
                                                    modeText = "text3"
                                                }else if (item.market.mode == "Alquiler"){
                                                    modeImg = alquiler
                                                    modeColor = "#B65740"
                                                    modeText = "text4"
                                                }
                            
                                                return (
                                                    <div className='d-flex align-items-center gap-2'><img src={modeImg} alt="icons" style={{ width: '20px' }} /> <div className={`${modeText == "text3" ? "bg-dark " : ""} rounded-1 px-4 py-0 text-white fw-lighter`} style={{ fontSize: '16px', ...(modeText == "text4" && { backgroundColor: modeColor })  }}><FormattedMessage id={`favorite.${modeText}`} /></div></div>
                                                )
                                                })()}
                                                
                                            </div>
                                            </div>
                                        </Link>
                                    </div>
                                );
                            }) : (
                                <div className="col-12 text-muted py-4">{t('No hay propiedades disponibles.', 'No properties available.')}</div>
                            )}
                        </div>
                    </div>
                    <div style={{ marginTop: '2rem', marginBottom: 'clamp(5rem, 10vw, 9rem)' }}>
                        <div className='lh-sm mb-3 mb-lg-0' style={{ fontSize: 'clamp(30px, 3vw, 46px)' }}>{t('Reseñas recientes', 'Recent reviews')}</div>
                        <div className='mb-5 d-flex align-items-baseline gap-4' style={{ fontSize: '20px' }}>
                            <div className='mt-1'>
                                <StarRating rating={ratingAverage} size='16px' />
                            </div>
                            <div className='text-decoration-underline'>{ratingCount} {t(pluralize(ratingCount, 'Reseña', 'Reseñas'), pluralize(ratingCount, 'Review', 'Reviews'))}</div>
                        </div>
                        <Row className='divider-vertical position-relative g-5'>
                            <Col md={7} className='pe-lg-5'>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(330px, 1fr))', gap: '14px' }}>
                                    { reviews.length > 0
                                        ? reviews.slice(0, 4).map((item, index) => (
                                            <div key={index} className='border py-3 px-3'>
                                                <div className="d-flex gap-3 align-items-center mb-4">
                                                    { item.reviewerId?.avatarUrl
                                                        ? <img src={item.reviewerId.avatarUrl} alt="avatar" style={{ width: '45px', height: '45px', borderRadius: '50%', objectFit: 'cover' }} />
                                                        : <i className="fa-regular fa-circle-user" style={{ fontSize: '45px' }}></i>
                                                    }
                                                    <div className="d-flex flex-column">
                                                        <span style={{ fontSize: '18px' }}>{item.reviewerId?.name || t('Usuario', 'User')}</span>
                                                        <span style={{ fontSize: '12px' }} className='text-muted'>
                                                            {item.createdAt ? new Date(item.createdAt).toLocaleDateString('es-GT', { year: 'numeric', month: 'long', day: 'numeric' }) : ''}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className='mt-1 mb-3 d-flex gap-4 align-items-center'>
                                                    <div className='d-flex gap-1 align-items-center'>
                                                        {[1,2,3,4,5].map(n => (
                                                            <i key={n} className="fa-solid fa-star" style={{ color: n <= (item.rating || 0) ? 'gold' : '#ddd', fontSize: '14px' }}></i>
                                                        ))}
                                                    </div>
                                                    <span>{item.rating}/5</span>
                                                </div>
                                                <div className="scroll-moderno pe-2">"{item.comment}"</div>
                                            </div>
                                        ))
                                        : <div className='text-muted'>{t('No hay comentarios aún.', 'No comments yet.')}</div>
                                    }
                                </div>
                                { reviews.length > 4 && (
                                    <button
                                        className='btn btn-outline-dark rounded-1 mt-4 px-4'
                                        onClick={() => { setModalRatingFilter('Todas'); setModalSort('recientes'); setShowAllReviews(true); }}
                                    >
                                        {t(pluralize(reviews.length, 'Ver la reseña', 'Ver todas las reseñas'), pluralize(reviews.length, 'See the review', 'See all reviews'))} ({reviews.length})
                                    </button>
                                )}
                            </Col>
                            <Col md={5} className='ps-lg-5 d-none d-lg-block'>
                                <ContactForm
                                    agentId={agencyId}
                                    type="Formulario Agente"
                                />
                            </Col>
                        </Row>
                        <div className="mt-5 position-relative">
                            {/* Alerta flotante para eliminar reseña */}
                            {reviewAlert.show && (
                                <div style={{
                                    position: 'fixed',
                                    bottom: '24px',
                                    right: '24px',
                                    backgroundColor: '#1a1a1a',
                                    color: 'white',
                                    padding: '14px 22px',
                                    borderRadius: '8px',
                                    boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
                                    fontSize: '15px',
                                    zIndex: 9999,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    maxWidth: '320px',
                                }}>
                                    <i
                                        className={`fa-regular ${reviewAlert.variant === 'success' ? 'fa-circle-check' : 'fa-circle-xmark'}`}
                                        style={{ color: reviewAlert.variant === 'success' ? '#4caf50' : '#f44336', fontSize: '18px', flexShrink: 0 }}
                                    ></i>
                                    {reviewAlert.message}
                                </div>
                            )}
                            <div style={{ fontSize: 'clamp(22px, 3vw, 38px)' }}>{t('Valorar y escribir una reseña', 'Rate and write a review')}</div>
                            {isClient ? (
                                <>
                                    {myReview && !isEditingReview ? (
                                        // Ya dejó reseña — mostrar resumen y botón editar
                                        <div className='mt-4'>
                                            <div className='text-muted mb-3'>{t('Ya dejaste una reseña para este agente.', 'You already left a review for this agent.')}</div>
                                            <div className='d-flex gap-1 align-items-center mb-2'>
                                                {[1,2,3,4,5].map(n => (
                                                    <i key={n} className="fa-sharp fa-solid fa-star" style={{ color: n <= myReview.rating ? 'gold' : '#ddd', fontSize: '20px' }}></i>
                                                ))}
                                                <span className='ms-2 text-muted' style={{ fontSize: '14px' }}>{myReview.rating}/5</span>
                                            </div>
                                            <div className='text-muted mb-3' style={{ fontSize: '14px' }}>"{myReview.comment}"</div>
                                            <div className='d-flex gap-2 align-items-center'>
                                                <button
                                                    className='btn btn-outline-dark rounded-2 px-4'
                                                    onClick={() => {
                                                        setStarSelected(myReview.rating)
                                                        setReviewComment(myReview.comment)
                                                        setReviewMsg(null)
                                                        setIsEditingReview(true)
                                                    }}
                                                >
                                                    <i className="fa-solid fa-pen me-2"></i>{t('Editar reseña', 'Edit review')}
                                                </button>
                                                <button
                                                    className='btn btn-outline-danger rounded-2 px-3'
                                                    onClick={handleDeleteReview}
                                                    disabled={reviewLoading}
                                                    title={t('Eliminar reseña', 'Delete review')}
                                                >
                                                    <i className="fa-regular fa-trash-can"></i>
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        // Formulario crear o editar
                                        <>
                                            <div className='text-muted mt-4'>
                                                {isEditingReview
                                                    ? t('Edita tu reseña.', 'Edit your review.')
                                                    : t('Comparte tu experiencia con el agente.', 'Share your experience with the agent.')
                                                }
                                            </div>
                                            <div className="mt-4 d-flex align-items-center gap-1 fs-3">
                                                {[1, 2, 3, 4, 5].map(n => (
                                                    <i
                                                        key={n}
                                                        className="fa-sharp fa-solid fa-star"
                                                        style={{ cursor: 'pointer', color: (starHover || starSelected) >= n ? 'gold' : '#ddd', transition: 'color 0.15s' }}
                                                        onMouseEnter={() => setStarHover(n)}
                                                        onMouseLeave={() => setStarHover(0)}
                                                        onClick={() => setStarSelected(n)}
                                                    ></i>
                                                ))}
                                                {starSelected > 0 && (
                                                    <span className='ms-2 text-muted' style={{ fontSize: '16px' }}>{starSelected}/5</span>
                                                )}
                                            </div>
                                            <div className="mt-4" style={{ width: 'min(720px, 100%)' }}>
                                                <textarea
                                                    className='w-100 no-outline'
                                                    style={{ background: '#FAFAFA', color: 'black', border: '0', borderBottom: '2px solid black', minHeight: '140px', maxHeight: '140px' }}
                                                    placeholder={t('Escribe tu comentario...', 'Write your comment...')}
                                                    value={reviewComment}
                                                    maxLength={250}
                                                    onChange={e => setReviewComment(e.target.value)}
                                                />
                                                <span className={`small ${reviewComment.length > 240 ? 'text-danger' : 'text-muted'}`}>
                                                    {reviewComment.length}/250
                                                </span>
                                                {reviewMsg && (
                                                    <div className={`mt-2 small ${reviewMsg.type === 'success' ? 'text-success' : 'text-danger'}`}>
                                                        {reviewMsg.text}
                                                    </div>
                                                )}
                                                <div className='d-flex gap-2 mt-2 justify-content-end'>
                                                    {isEditingReview && (
                                                        <button className='btn btn-outline-secondary rounded-2 px-3' onClick={() => { setIsEditingReview(false); setStarSelected(0); setReviewComment(''); setReviewMsg(null) }}>
                                                            {t('Cancelar', 'Cancel')}
                                                        </button>
                                                    )}
                                                    <Button
                                                        className='rounded-2 px-3 bg-dark border-dark'
                                                        onClick={handleSubmitReview}
                                                        disabled={reviewLoading}
                                                    >
                                                        {reviewLoading
                                                            ? <><span className='spinner-border spinner-border-sm me-2' />{isEditingReview ? t('Guardando...', 'Saving...') : t('Enviando...', 'Sending...')}</>
                                                            : isEditingReview ? t('Guardar cambios', 'Save changes') : t('Enviar reseña', 'Submit review')
                                                        }
                                                    </Button>
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </>
                            ) : (
                                <Link to="/login" className='d-block text-muted mt-4' style={{ fontSize: '15px' }}>
                                    {t('Solo los clientes registrados pueden escribir una reseña.', 'Only registered clients can write a review.')}
                                </Link>
                            )}

                            <div className='d-block d-lg-none mt-5'>
                                <ContactForm
                                    agentId={agencyId}
                                    type="Formulario Agente"
                                />
                            </div>
                        </div>
                    </div>
                </>
            ) }

            {/* Modal: todas las reseñas */}
            <Modal show={showAllReviews} onHide={() => setShowAllReviews(false)} size="lg" centered scrollable>
                <Modal.Header closeButton className='border-0 pb-0 mb-4'>
                    <Modal.Title style={{ fontSize: 'clamp(20px, 3vw, 28px)' }}>
                        {t(pluralize(reviews.length, 'La reseña', 'Todas las reseñas'), pluralize(reviews.length, 'The review', 'All reviews'))} ({reviews.length})
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body className='pt-2 scroll-moderno' style={{ maxHeight: '100%' }}>
                    {/* Filtros por calificación + ordenamiento */}
                    <div className='d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4'>
                        <div className='d-flex flex-wrap gap-2'>
                            {['Todas', 1, 2, 3, 4, 5].map(val => (
                                <button
                                    key={val}
                                    onClick={() => setModalRatingFilter(val)}
                                    className={`btn btn-sm rounded-pill px-3 ${modalRatingFilter === val ? 'bg-dark text-white' : 'btn-outline-secondary'}`}
                                    style={{ fontSize: '13px' }}
                                >
                                    {val !== 'Todas' && <i className="fa-solid fa-star me-1" style={{ color: modalRatingFilter === val ? 'gold' : '#aaa', fontSize: '11px' }}></i>}
                                    {val === 'Todas' ? t('Todas', 'All') : val}
                                </button>
                            ))}
                        </div>
                        <select
                            className='form-select form-select-sm w-auto mt-4 mt-lg-0'
                            value={modalSort}
                            onChange={e => setModalSort(e.target.value)}
                            style={{ fontSize: '13px' }}
                        >
                            <option value="recientes">{t('Recientes', 'Recent')}</option>
                            <option value="antiguas">{t('Antiguas', 'Oldest')}</option>
                        </select>
                    </div>

                    {/* Lista de reseñas */}
                    <div className='d-flex flex-column gap-3'>
                        {(() => {
                            let filtered = modalRatingFilter === 'Todas'
                                ? [...reviews]
                                : reviews.filter(r => r.rating === modalRatingFilter)

                            filtered = filtered.sort((a, b) => {
                                const da = new Date(a.createdAt || 0)
                                const db = new Date(b.createdAt || 0)
                                return modalSort === 'recientes' ? db - da : da - db
                            })

                            if (filtered.length === 0) {
                                return <div className='text-muted py-3'>{t('No hay reseñas con esta calificación.', 'No reviews with this rating.')}</div>
                            }

                            return filtered.map((item, index) => (
                                <div key={index} className='border rounded-1 py-3 px-3'>
                                    <div className='d-flex gap-3 align-items-center mb-3'>
                                        {item.reviewerId?.avatarUrl
                                            ? <img src={item.reviewerId.avatarUrl} alt="avatar" style={{ width: '45px', height: '45px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                                            : <i className="fa-regular fa-circle-user" style={{ fontSize: '45px', flexShrink: 0 }}></i>
                                        }
                                        <div className='d-flex flex-column flex-grow-1'>
                                            <div className='d-flex justify-content-between align-items-center flex-wrap gap-2'>
                                                <span style={{ fontSize: '16px', fontWeight: 500 }}>{item.reviewerId?.name || t('Usuario', 'User')}</span>
                                                <span style={{ fontSize: '12px' }} className='text-muted'>
                                                    {item.createdAt ? new Date(item.createdAt).toLocaleDateString('es-GT', { year: 'numeric', month: 'long', day: 'numeric' }) : ''}
                                                </span>
                                            </div>
                                            <div className='d-flex gap-1 align-items-center mt-1'>
                                                {[1,2,3,4,5].map(n => (
                                                    <i key={n} className="fa-solid fa-star" style={{ color: n <= (item.rating || 0) ? 'gold' : '#ddd', fontSize: '13px' }}></i>
                                                ))}
                                                <span className='ms-1 text-muted' style={{ fontSize: '12px' }}>{item.rating}/5</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{ fontSize: '14px' }}>"{item.comment}"</div>
                                </div>
                            ))
                        })()}
                    </div>
                </Modal.Body>
            </Modal>
        </Container>
    );
}

export default profileAgency;
