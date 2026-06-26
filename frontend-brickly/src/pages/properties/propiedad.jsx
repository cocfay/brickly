import { Link, useParams, useNavigate } from 'react-router-dom';
import { Container, Breadcrumb, Button, Row, Col, Modal } from 'react-bootstrap';
import 'glightbox/dist/css/glightbox.min.css';
import '../../assets/css/glightbox-custom.css';
import useGLightbox from '../../assets/js/useGLightbox'; 
import { FormattedMessage } from 'react-intl';
import { useFavorites } from '../../hooks/useFavorites'
import { useCurrency } from '../../context/CurrencyContext';
import { getDisplayPrice } from '../../utils/priceUtils';
import StarRating from '../../components/StarRating';

import { getPropiedades, getPropiedadById } from '../../cpanel/services/propiedades';
import { getUsers } from '../../services/listUsers';
import { getCurrentUser, API_URL, isAuthenticated } from '../../services/authService'; // 👈 I
import { amenitiesMap } from '../../cpanel/data/amenites'
import ContactForm from '../../components/ContactForm';
import { registerWSClick } from '../../services/countWS';
import { getUserProfilePath } from '../../utils/profileRoutes';
import { getPropertyPath } from '../../utils/propertyRoutes';

import alquiler from '../../assets/images/iconos/alquiler.png';
import venta from '../../assets/images/iconos/venta.png';

import avatar from '../../assets/images/iconos/avatar.png';
import diamond from '../../assets/images/iconos/diamond.png';
import tour from '../../assets/images/iconos/IconoTour.png';
import arrow from '../../assets/images/iconos/arrow.png'
import space from '../../assets/images/iconos/spaces.png';
import sinPropiedad from '../../cpanel/assets/images/iconos/sinPropiedad.png';
import { useEffect, useState, useMemo, useRef } from 'react';
import { useT } from '../../hooks/useT';

function Propiedad() {

    const t = useT()
    const requestFieldIds = {
        name: 'property-request-name',
        email: 'property-request-email',
        phone: 'property-request-phone',
        message: 'property-request-message',
    }
    const lang = localStorage.getItem('selectedLang')
    const { id, slug } = useParams()
    const propertyIdentifier = slug || id
    const URL = API_URL
    const ame = amenitiesMap
    ////console.log(ame);
    
    const navigate = useNavigate() 
    const [data, setdata] = useState(null)
    const [amenities, setamenities] = useState([])
    const [todasPropiedades, setTodasPropiedades] = useState([])
    const [agentes, setAgentes] = useState([])
    const [loadingAgentes, setLoadingAgentes] = useState(true)
    const [whatsappUrl, setwhatsappUrl] = useState('')
    const [loading, setLoading] = useState(true)

    const lightbox = useGLightbox({
        autoplayVideos: false,
        openEffect: 'zoom',
        closeEffect: 'fade'
    }, [data])

    const visitRegistered = useRef(false)

    // TODO: Activar cuando exista el endpoint POST /users/:id/whatsapp-click
    // const handleWhatsClick = (agentId) => {
    //     const key = `whatsClicked_${agentId}`;
    //     if (localStorage.getItem(key)) return;
    //     localStorage.setItem(key, '1');
    //     fetch(`${API_URL}/users/${agentId}/whatsapp-click`, { method: 'POST' })
    //         .catch(e => console.error('Error registrando click WhatsApp', e));
    // };

    useEffect(() => {
        if (!data?._id) return
        const visitKey = `visited_property_${data._id}`
        if (visitRegistered.current || localStorage.getItem(visitKey)) return
        visitRegistered.current = true
        fetch(`${API_URL}/properties/${data._id}/visit`, { method: 'POST' })
            .then(() => localStorage.setItem(visitKey, '1'))
            .catch(e => console.error('Error registrando visita', e))
    }, [data?._id])

    useEffect(()  => {
        const loadData = async () =>{
            try{
                if (!propertyIdentifier) return
                const getData = await getPropiedadById(propertyIdentifier)

                const dataa = {
                    ...getData.data,
                    dimensions: {
                        ...getData.data.dimensions,
                        landM2: getData.data.dimensions?.landM2 || 0,
                        landV2: getData.data.dimensions?.landV2 || 0,
                    }
                }
                
                setdata(dataa)
                if (dataa.propertySlug && slug !== dataa.propertySlug) {
                    navigate(getPropertyPath(dataa), { replace: true })
                }
                ////console.log(getData.data);

                const amenitiesData = getData?.data?.amenities
                const keyAme = amenitiesData && typeof amenitiesData === 'object' && !Array.isArray(amenitiesData)
                  ? Object.keys(amenitiesData)
                  : []
                const filterAmenities = keyAme.map(key => ame[key]).filter(valor => valor !==undefined)
                setamenities(filterAmenities);

                // Cargar propiedades publicadas para las relacionadas (aleatorias)
                ////console.log('⏩ Llamando a getPropiedades...');
                const todas = await getPropiedades({ status: 'published', limit: 50 })
                ////console.log('⏩ getPropiedades completado');
                // Cuando se usa limit, la API devuelve { data: { data: [...] } }
                let props = Array.isArray(todas.data) ? todas.data : (todas.data?.data || [])
                // Mezclar aleatoriamente para mostrar propiedades diferentes cada vez
                props = [...props].sort(() => Math.random() - 0.5)
                setTodasPropiedades(props)

                // Cargar agentes de la propiedad
                setLoadingAgentes(true)
                // Combinar userId (creador) + agents (compartidos), sin duplicados
                const ownerId  = getData?.data?.userId
                const agentIds = getData?.data?.agents || []
                const allAgentIds = [...new Set([...(ownerId ? [ownerId] : []), ...agentIds])]
                ////console.log('🔗 allAgentIds (sin duplicados):', allAgentIds);

                const users = await getUsers()
                ////console.log('👥 [getUsers] success:', users.success);
                ////console.log('👥 [getUsers] total usuarios:', users.data?.length);
                if (!users.success) {
                    console.error('❌ [getUsers] Error:', users.error);
                }
                if (users.success) {
                    // Filtrar solo agentes y agencias (roles relevantes)
                    const relevantUsers = users.data.filter(u =>
                        Array.isArray(u.roles) && (u.roles.includes('agente') || u.roles.includes('agencia'))
                    );
                    //console.log('👥 [getUsers] relevantes (agente/agencia):', relevantUsers.length);
                    //console.log('👥 [getUsers] IDs relevantes:', relevantUsers.map(u => u._id));
                    const usersMap = {}
                    relevantUsers.forEach(u => { usersMap[u._id] = u })

                    // Validar cada agentId contra el mapa
                    //console.group('🔎 [Map] Validando cada agentId en usersMap:');
                    allAgentIds.forEach(agId => {
                        if (usersMap[agId]) {
                            const u = usersMap[agId];
                            //console.log(`✅ ${agId} → ENCONTRADO: ${u.name} (roles: ${JSON.stringify(u.roles)}, isEnabled: ${u.isEnabled})`);
                        } else {
                            console.warn(`❌ ${agId} → NO ENCONTRADO en usersMap`);
                        }
                    });
                    //console.groupEnd();

                    // Filtrar agentes individuales (excluir agencias y admins)
                    const agentesData = allAgentIds
                        .map(agId => usersMap[agId])
                        .filter(Boolean)
                        // Excluir agencias y admins — solo mostrar agentes/arquitectos individuales
                        .filter(agent => {
                            const roles = Array.isArray(agent.roles) ? agent.roles : [agent.roles]
                            const exclude = roles.includes('agencia') || roles.includes('admin')
                            if (exclude) {
                                //console.log(`⏭️ [Filtro] ${agent._id} (${agent.name}) → EXCLUIDO por rol: ${roles.join(', ')}`);
                            }
                            return !exclude
                        })
                        .map(agent => {
                            const agency = agent.parentId ? usersMap[agent.parentId] : null
                            const mapped = {
                                ...agent,
                                avatar: URL + agent.avatar.replace('/uploads', ''),
                                agencia: agency ? {
                                    _id: agency._id,
                                    profileSlug: agency.profileSlug,
                                    name: agency.name || ''
                                } : null
                            };
                            //console.log(`✅ [Filtro] ${agent._id} (${agent.name}) → INCLUIDO como agente individual, agencia: ${mapped.agencia || 'ninguna'}`);
                            return mapped;
                        })

                    //console.log('📊 agentesData después de filtrar:', agentesData.length, 'agentes');

                    if (agentesData.length > 0) {
                        // Hay agentes individuales asignados — mostrarlos
                        // Ordenar: el agente del perfil desde donde se llegó va primero
                        const fromAgentId = sessionStorage.getItem('fromAgentId')
                        //console.log('📌 fromAgentId (sessionStorage):', fromAgentId);
                        if (fromAgentId) {
                            agentesData.sort((a, b) => {
                                if (a._id === fromAgentId) return -1
                                if (b._id === fromAgentId) return 1
                                return 0
                            })
                        }

                        setAgentes(agentesData)
                        //console.log('✅ [Resultado] Mostrando agentes individuales:', agentesData.length);
                    } else {
                        // No hay agentes individuales — mostrar info del creador (agencia o agente individual)
                        //console.log('⚠️ [Fallback] No hay agentes individuales → mostrando owner');
                        if (ownerId && usersMap[ownerId]) {
                            const owner = usersMap[ownerId]
                            const ownerRoles = Array.isArray(owner.roles) ? owner.roles : [owner.roles]
                            //console.log(`ℹ️ [Fallback] Owner encontrado: ${owner.name} (roles: ${ownerRoles.join(', ')}, isEnabled: ${owner.isEnabled})`);
                            setAgentes([{
                                ...owner,
                                avatar: owner.avatar ? URL + owner.avatar.replace('/uploads', '') : null,
                                agencia: null,
                                _isOwner: true,
                                _isAgency: ownerRoles.includes('agencia')
                            }])
                            //console.log('✅ [Resultado] Mostrando owner como fallback');
                        } else {
                            console.warn('❌ [Fallback] ownerId no encontrado en usersMap o no existe ownerId');
                        }
                    }
                }
                //console.groupEnd();
                
            } catch(errors){
                console.error("Error" + errors)
                } finally {
                setLoadingAgentes(false)
                setLoading(false)
            }
        }
        loadData()
    },[propertyIdentifier, slug, navigate])

    const propiedadesSecundarias = useMemo(() => {
        if (!todasPropiedades.length) return [];
        return todasPropiedades
            .filter(p => p._id !== data?._id && p.status === "published")
            .slice(0, 3);
    }, [todasPropiedades, data?._id]);

    const { isFavorite, toggle: toggleFav, canFavorite } = useFavorites();
    const { currency: currencyMode } = useCurrency();
    const [showShare, setShowShare] = useState(false);

    const formatPrice = (value, currency) => {
      const num = parseFloat(value) || 0;
      if (currency === 'GTQ') {
        return 'Q ' + new Intl.NumberFormat('es-GT', { minimumFractionDigits: 0 }).format(num);
      }
      return '$ ' + new Intl.NumberFormat('en-US', { minimumFractionDigits: 0 }).format(num);
    };

    const getAgencyName = (agency) => {
      if (!agency) return '';
      if (typeof agency === 'string') return agency;
      return agency.name || '';
    };
    
    const [showTourModal, setShowTourModal] = useState(false);

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

    /* setwhatsappUrl(`https://wa.me/${agent.phone.replace(/\D/g, '')}?text=` + encodeURIComponent('¡Hola! Estoy interesado en una propiedad.')) */

    return (
        <>
            {data && (
                <Container>
                    <div className="mb-4 mt-5">
                        <Breadcrumb className='px-3 py-1 rounder-1' style={{ "--bs-breadcrumb-divider": "'>'", fontSize: '14px', width: 'fit-content', background: '#f0f0f0' }} >
                            <Breadcrumb.Item linkAs={Link} linkProps={{ to: "/" }}><FormattedMessage id='breadcrumb.text1' /></Breadcrumb.Item>
                            <Breadcrumb.Item linkAs={Link} linkProps={{ to: "/propiedades" }}><FormattedMessage id='breadcrumb.text2' /></Breadcrumb.Item>
                            <Breadcrumb.Item active>{data?.market?.title}</Breadcrumb.Item>
                        </Breadcrumb>
                    </div>

                    <div className='section-1 mt-5'>
                        <div className='mt-lg-3' style={{ fontSize: 'clamp(16px, 6vw, 18px)' }}>
                            <div className="d-flex justify-content-between flex-column-reverse flex-lg-row align-items-lg-start gap-3 gap-lg-0">
                                <div className="mt-3 mt-lg-0 lh-1 mb-3 mb-lg-2 lh-1" style={{ fontSize: 'clamp(44px, 6vw, 50px)', fontFamily: 'AppleGaramond', lineHeight: 'normal !important' }}>{data?.market?.title}</div>
                                <Link onClick={() => navigate(-1)} title='Atrás' aria-label={t('Volver a la vista anterior', 'Go back to previous view')}><img src={arrow} style={{ width: 'clamp(30px, 5vw, 40px)' }} alt="Atrás" srcSet="" /></Link>
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
                            <div className="mt-5 mt-xl-3 d-flex justify-content-end gap-3" style={{ cursor: 'pointer' }} onClick={() => setShowTourModal(true)}>
                                <img src={tour} alt="Tour 360" style={{ width: '40px' }} className='img-fluid' />
                                <FormattedMessage id='properties.text1' />
                            </div>
                        )}     

                        <div className="row g-3 mt-2">
                            {data?.media?.photos.find(p => p.isMain) && (
                                <div className="col-lg-8">
                                    <div className="position-relative h-100">
                                        <div className="ratio ratio-16x9 h-100">
                                            <a className="glightbox d-block w-100 h-100" href={URL + '/' + data?.media?.photos.find(p => p.isMain).path} data-gallery={`gallery-`+data._id}>
                                                <img src={URL + '/' + data?.media?.photos.find(p => p.isMain).path} className="object-fit-cover border-radius-1 w-100 h-100" alt="Imagen principal" loading="lazy" />
                                            </a>
                                        </div>
                                        <div
                                            className={`favorite-icon position-absolute bottom-0 end-0 m-3 ${isFavorite(data._id) ? 'like' : 'unlike'}`}
                                            style={{ cursor: 'pointer', filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.5))' }}
                                        onClick={(e) => {
                                                e.stopPropagation();
                                                if (isAuthenticated() && !canFavorite) return;
                                                const iconElement = e.currentTarget.querySelector('i');
                                                iconElement.style.transform = 'scale(1.3)';
                                                setTimeout(() => { iconElement.style.transform = 'scale(1)'; toggleFav(data._id); }, 200);
                                            }}
                                        >
                                            <i className="fa-solid fa-heart" style={{ width: '17px', height: '16px' }}></i>
                                        </div>
                                    </div>
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
                                                    <a key={index} className="ratio ratio-4x3 second-img-section1 d-block glightbox mb-lg-2" href={URL + '/' + items.path} data-gallery={`gallery-`+data._id}>
                                                        <img src={URL + '/' + items.path} className="object-fit-cover border-radius-2" alt="Imagen secundaria 1" loading="lazy" />
                                                    </a>
                                                )
                                            }
                                            else if(index === 1){
                                                return (
                                                    <a key={index} className="ratio ratio-4x3 second-img-section1 d-block glightbox mt-lg-2 position-relative" href={URL + '/' + items.path} data-gallery={`gallery-`+data._id}>
                                                        <img src={URL + '/' + items.path} className="object-fit-cover border-radius-2" alt="Imagen secundaria 2" loading="lazy" />
                                                        {totalSecondary > 2 && (
                                                            <div className="position-absolute w-100 h-100 d-flex justify-content-end align-items-end p-3">
                                                                <div className="d-flex align-items-baseline gap-2 text-dark py-1 px-3 rounded-5" style={{ fontSize: 'clamp(10px, 3vw, 16px)', backgroundColor: '#d9d9d9e6' }}>
                                                                    <i className="fa-regular fa-images"></i> +{totalSecondary - 2} {t('Fotos', 'Photos')}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </a>
                                                )
                                            }

                                            return (
                                                <a key={index} className="ratio ratio-4x3 second-img-section1 glightbox mb-xl-2 d-none" href={URL + '/' + items.path} data-gallery={`gallery-`+data._id}>
                                                    <img src={URL + '/' + items.path} className="object-fit-cover border-radius-2" alt="Imagen secundaria 1" loading="lazy" />
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
                                                    aria-label={t('Compartir propiedad', 'Share property')}
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
                                                                        <a key={s.name} href={s.url} target="_blank" rel="noreferrer" aria-label={`Compartir en ${s.name}`} className="d-flex align-items-center gap-2 text-decoration-none text-dark" style={{ fontSize: '14px' }} onClick={() => setShowShare(false)}>
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


                                {(data.layout?.bedrooms > 0 || data.layout?.bathrooms > 0 || data?.layout?.parkingSpots > 0 || data?.dimensions?.landM2 > 0 || data?.dimensions?.landV2 > 0) && 
                                    <>
                                        <hr className='mb-4' />
                                        <div className='d-flex justify-content-evenly' style={{ fontSize: 'clamp(16px, 3vw, 24px)' }}>
                                            
                                            {data.layout?.bedrooms > 0 && 
                                                ((data?.market?.type.toLowerCase() == "oficina" || data?.market?.type.toLowerCase() == "bodega" ) ? (
                                                <div className='d-flex flex-column align-items-center text-center gap-2' title='Total de ambientes'><img src={space} alt="icon" style={{ width: 'clamp(16px, 4vw, 25px)' }} /> {data.layout.totalRooms}</div>
                                                ) : (
                                                    <div className='d-flex flex-column align-items-center text-center gap-2' title='Total de habitaciones'><i className="fa-solid fa-bed"></i> {data.layout?.bedrooms}</div>
                                                ))
                                            }
                                            {data.layout?.bathrooms > 0 &&
                                                <div className='d-flex flex-column align-items-center text-center gap-2' title='Total de baños'><i className="fa-solid fa-bath"></i> {data.layout.bathrooms + (data?.layout?.halfBathrooms || 0)}</div>
                                            }
                                            {data?.layout?.parkingSpots > 0 &&
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

                                    const validLayout = (data.layout.totalRooms > 0) || data.layout.serviceRoom || data.layout.zone || (data.layout.parkingSpots > 0) || data.layout.furnished || data.layout.floors || data?.layout?.laundry || data.layout.study || data.layout.familyroom || data?.layout?.deck

                                    return validLayout ? (
                                        <Row className='align-items-start gy-2' style={{ marginBottom: '3rem' }}>
                                            <Col xs={12} className='fs-3 mb-2'><i className='fa-sharp fa-regular fa-tree-city fs-2 me-3' style={{ width: 'fit-content' }}></i>Distribución de ambientes</Col>
                                            {!!data?.layout?.totalRooms > 0 &&
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
                                            {!!data?.layout?.parkingSpots > 0 &&
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
                                            {!!data?.layout?.floors &&
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
                                                <div className='d-block d-lg-none'>
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
                                                </div>
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
                                                <Link to={getUserProfilePath(items)} className='text-body'>
                                                    <div className="d-flex align-items-start gap-2">
                                                        <div className='rounded-circle' style={{ width: '80px', height: '80px' }}><img src={items.avatar} alt="Avatar" style={{ width: '80px', height: '80px' }} className='rounded-circle object-fit-cover' loading="lazy" /></div>
                                                        <div>
                                                            <div className='lh-sm' style={{fontSize: '18px'}}>{items.name}  { getAgencyName(items?.agencia) && <> <br /> <span style={{fontSize: '16px'}}>{getAgencyName(items.agencia)}</span> </>}</div>
                                                            <div className='mt-2' style={{ fontSize: '12px' }}>
                                                                <StarRating rating={items.ratingAverage} size='11px' />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </Link>
                                                <div className="d-flex justify-content-md-end flex-column">
                                                    <div className='mb-2 lh-1' style={lang == 'es' ? {fontSize: '20px'} : {fontSize: '16px'}}><FormattedMessage id="home.text12" /></div>
                                                <a href={`https://wa.me/${items.phone.replace(/\D/g, '')}?text=` + encodeURIComponent('¡Hola! Me comunico desde la plataforma Brickly Homes. Estoy interesado en la propiedad '+ data.market?.title +'.')} target='_blank' className="rounded-1 text-center border-0 py-1" style={{ backgroundColor: 'black', color: 'white', boxSizing: 'border-box', padding: '2px 8px' }} rel="noreferrer" aria-label={`Contactar por WhatsApp a ${items.name || 'agente'}`} onClick={() => registerWSClick(items._id)}><i className="fa-brands fa-whatsapp me-2" aria-hidden="true"></i> <FormattedMessage id="home.text13" /></a>
                                                </div>
                                            </div>
                                        )) }
                                        
                                        { agentes.map((items, index) => (
                                            <div key={index} className="d-flex d-xl-none align-items-start justify-content-between align-items-xl-center flex-column flex-md-row gap-4">
                                                <Link to={getUserProfilePath(items)} className='text-body'>
                                                    <div className="d-flex align-items-start gap-4">
                                                        <div className='rounded-circle' style={{ width: '100px', height: '100px' }}><img src={items.avatar} alt="Avatar" style={{ width: '100px', height: '100px' }} className='rounded-circle object-fit-cover' loading="lazy" /></div>
                                                        <div>
                                                            <div className='lh-sm' style={{fontSize: '18px'}}>{items.name}  { getAgencyName(items?.agencia) && <> <br /> <span style={{fontSize: '16px'}}>{getAgencyName(items.agencia)}</span> </>}</div>
                                                            <div style={{ fontSize: '12px' }}>
                                                                <StarRating rating={items.ratingAverage} size='11px' />
                                                            </div>

                                                            <div className="mt-3 d-flex justify-content-md-end flex-column">
                                                                <div className='mb-2 lh-1' style={lang == 'es' ? {fontSize: '20px'} : {fontSize: '16px'}}><FormattedMessage id="home.text12" /></div>
                                                                <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation();
                                                                    registerWSClick(items._id);
                                                                    window.open(`https://wa.me/${items.phone.replace(/\D/g, '')}?text=` + encodeURIComponent('¡Hola! Me comunico desde la plataforma Brickly Homes. Estoy interesado en la propiedad "' + data?.market?.title + '".'), '_blank');
                                                                }} aria-label={`Contactar por WhatsApp a ${items.name || 'agente'}`} className="rounded-1 text-center border-0 py-1" style={{ backgroundColor: 'black', color: 'white', boxSizing: 'border-box', padding: '2px 8px' }}><i className="fa-brands fa-whatsapp me-2" aria-hidden="true"></i> <FormattedMessage id="home.text13" /></button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </Link>
                                            </div>
                                        )) }


                                    </div>
                                    <div style={{ marginTop: '4rem' }}>
                                        <ContactForm
                                            agentId={agentes.map(a => a._id)}
                                            type="Formulario Propiedad"
                                            info={data?.market?.title || ''}
                                            defaultMessage={t('Estoy interesado en la propiedad: '+data?.market?.title, 'I\'m interested in the property: '+data?.market?.title)}
                                        />

                                    </div>

                                    {(() => {
                                        const coor = data?.location?.coordinates
                                        if(coor){
                                            const lon = coor?.coordinates?.[0]
                                            const lat = coor?.coordinates?.[1]
                                            
                                            if(lat && lon){
                                                return (
                                                    <div className='d-none d-lg-block mt-5'>
                                                        <div className='fs-3 mb-3'><i className="fa-regular fa-earth-africa fs-2 me-3"></i><FormattedMessage id='properties.text7' /></div>    
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
                                                    </div>
                                                ) 
                                            }
                                        }
                                    })()}
                                </div>
                            </div>
                        </div>
                    </div>                

                    <div className="row gy-5 gy-xl-0" style={{ marginTop: 'clamp(2rem, 10vw, 6rem)', marginBottom: 'clamp(2rem, 10vw, 6rem)'}}>
                        <div className="d-flex flex-column flex-lg-row justify-content-between align-items-lg-center mb-5 gap-3 gap-lg-0">
                            <div style={{ fontSize: 'clamp(36px, 5vw, 64px)', fontFamily: 'AppleGaramond' }}>
                                <FormattedMessage id='properties.text9' />
                            </div>
                            <Link to="/propiedades" className='link-more-black d-flex align-items-center gap-2'>
                                <FormattedMessage id='properties.text10' />
                                <i className="fa-solid fa-angle-right"></i>
                            </Link>
                        </div>
                        {todasPropiedades.length === 0 ? (
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
                        ) : propiedadesSecundarias.map((item, index) => {
                            return (
                            <div key={item._id} className={`col-md-6 col-xl-4 ${index == 0 ? 'mt-2 mt-lg-0' : '' }`}>
                                <div className="position-relative d-block">
                                    <Link to={getPropertyPath(item)} className="d-block propiedades-zoom">
                                        <img src={item.media?.photos?.[0]?.path ? URL + '/' + item.media.photos[0].path : sinPropiedad} className="object-fit-cover w-100 border-radius-1" alt="Imagen principal" style={{ aspectRatio: '4 / 4' }} loading="lazy" />
                                        <div style={{ padding: '5%' }} className='position-absolute top-0 w-100 h-100 d-flex flex-column justify-content-between'>
                                            {/* <div className='d-flex gap-2 align-items-center' style={{ backgroundColor: '#000000c7', color: 'white', width: 'fit-content', boxSizing: 'border-box', padding: '1px 24px', fontSize: '14px' }}>
                                            <FormattedMessage id="home.text7" />
                                            </div> */}
                                            {item.featured?.isActive ? (
                                                <div className='d-flex gap-2 align-items-center rounded-4' style={{ backgroundColor: '#000000c7', color: 'white', width: 'fit-content', padding: '3px 10px', fontSize: '14px' }}>
                                                    <img src={diamond} style={{ width: '14px' }} alt="" /><FormattedMessage id="home.text31" />
                                                </div>
                                                ) : <div />
                                            }
                                            <div className='d-flex justify-content-end align-items-center gap-2'>
                                                {/* Visualizaciones ocultas temporalmente
                                                <div className='d-flex gap-2 align-items-center rounded-4' style={{ backgroundColor: '#000000c7', color: 'white', width: 'fit-content', height: 'fit-content', boxSizing: 'border-box', padding: '3px 10px', fontSize: '12px' }}><FormattedMessage id="home.text8" />: { item.visitCounter } </div>
                                                */}
                                                <div className={`favorite-icon ${isFavorite(item._id) ? 'like' : 'unlike'}` } style={{ cursor: 'pointer' }} onClick={(e) => { e.preventDefault(); if (isAuthenticated() && !canFavorite) return; const iconElement = e.currentTarget.querySelector('i'); iconElement.style.transform = 'scale(1.3)'; setTimeout(() => { iconElement.style.transform = 'scale(1)'; toggleFav(item._id); }, 200); }}>
                                                    <i className="fa-solid fa-heart"></i>
                                                </div>
                                            </div>
                                        </div>
                                    </Link>
                                </div>
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
                            )
                        })}
                    </div>            
                </Container>
            ) }

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

export default Propiedad




