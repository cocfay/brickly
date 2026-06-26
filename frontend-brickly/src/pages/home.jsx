import React, { useEffect, useState, useMemo, useRef } from "react";
import { Container, Button } from 'react-bootstrap';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Slider from "react-slick";
import 'glightbox/dist/css/glightbox.min.css';
import GLightbox from 'glightbox';
import useGLightbox from '../assets/js/useGLightbox';
import { useCurrency } from '../context/CurrencyContext';
import { getDisplayPrice } from '../utils/priceUtils';
import { FormattedMessage } from 'react-intl'; 

//import logo from '../assets/images/logos/logo_negro.png';
import casa1 from '../assets/images/imagenes_de_casas/img1.webp';
import casa2 from '../assets/images/imagenes_de_casas/img2.webp';
import casa3 from '../assets/images/imagenes_de_casas/img3.webp';
import casa4 from '../assets/images/imagenes_de_casas/img4.webp';

import aparta6 from '../assets/images/imagenes_de_casas/img6.webp';
import aparta7 from '../assets/images/imagenes_de_casas/img7.webp';
/* import aparta8 from '../assets/images/imagenes_de_casas/img8.webp';
import aparta9 from '../assets/images/imagenes_de_casas/img9.webp'; */

import d from '../assets/images/imagenes_de_casas/D.webp';
import p from '../assets/images/imagenes_de_casas/P.webp';
import g from '../assets/images/imagenes_de_casas/G.webp';

import avatar from '../assets/images/iconos/avatar.png';
import diamond from '../assets/images/iconos/diamond.png';
import noLike from '../assets/images/iconos/noLike.png';
import like from '../assets/images/iconos/Like.png';

//import constructoras from '../assets/images/imagenes_de_fondo/constructoras.webp';

import zona1 from '../assets/images/imagenes_de_casas/zona10.webp';
import zona2 from '../assets/images/imagenes_de_casas/antigua.webp';
import zona3 from '../assets/images/imagenes_de_casas/zona14.webp';
import zona4 from '../assets/images/imagenes_de_casas/zona15.jpg';
import zona5 from '../assets/images/imagenes_de_casas/zona16.jpg';

//import unete from '../assets/images/imagenes_de_fondo/unete.png';

import dwhite from '../assets/images/iconos/dWhite.png';

import logo2 from '../assets/images/logos/logo_ficticio_1.png';
import logo3 from '../assets/images/logos/logo_ficticio_2.png';

import alquiler from '../assets/images/iconos/alquiler.png';
import venta from '../assets/images/iconos/venta.png';
import space from '../assets/images/iconos/spaces.png';

import '../assets/css/home.css';
import '../assets/css/glightbox-custom.css';

import Contactanos from '../components/contactanos';

import SEO from '../components/SEO';
import { getCurrentUser, API_URL, logout, isAuthenticated } from '../services/authService';
import { getAsociadosPublic } from '../cpanel/services/asociados'
import { getLogoUrl } from '../services/logoService'
import { useFavorites } from '../hooks/useFavorites'
import StarRating from '../components/StarRating';
import { cleanExpiredFeatured } from '../services/cleanExpiredFeatured';
import { fetchAllPages, fetchPropertiesByPriceRange, fetchPropertiesByLocation } from '../utils/fetchAll';
import { registerWSClick } from '../services/countWS';
import { getAgencyProfilePath, getUserProfilePath } from '../utils/profileRoutes';
import { getPropertyPath } from '../utils/propertyRoutes';

const formatPrice = (value, currency) => {
  const num = parseFloat(value) || 0;
  if (currency === 'GTQ') {
    return 'Q ' + new Intl.NumberFormat('es-GT', { minimumFractionDigits: 0 }).format(num);
  }
  return '$ ' + new Intl.NumberFormat('en-US', { minimumFractionDigits: 0 }).format(num);
};

function Home() {
  const navigate = useNavigate();
  const location = useLocation();
  const lang = localStorage.getItem('selectedLang')
  const { currency: currencyMode } = useCurrency();
  const { isFavorite, toggle: toggleFav, canFavorite } = useFavorites();
  const associatesSliderRef = useRef(null);

  const [user, setuser] = useState([])

  const getSlides = (desktop, tablet, mobile) => {
    const width = window.innerWidth;
    if (width < 768) return mobile;  // Móvil
    if (width < 992) return tablet;  // Tablet
    return desktop;                  // Escritorio
  };

  // ... dentro de tu componente Home
  const [width, setWidth] = useState(window.innerWidth);

  const syncAssociatesSliderAccessibility = () => {
    const root = associatesSliderRef.current;
    if (!root) return;

    const slides = root.querySelectorAll('.slick-slide');
    slides.forEach((slide) => {
      const isHidden = slide.getAttribute('aria-hidden') === 'true';
      const focusables = slide.querySelectorAll('a, button, input, select, textarea, [tabindex]');

      focusables.forEach((element) => {
        if (isHidden) {
          element.setAttribute('tabindex', '-1');
        } else if (element.getAttribute('tabindex') === '-1') {
          element.removeAttribute('tabindex');
        }
      });
    });
  };

  useEffect(() => {
    const handleResize = () => setWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Luego usas esa variable en tus settings:
  const settings = {
    dots: false,
    infinite: true,
    speed: 500,
    //slidesToShow: slidesToShow, 
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 1900,
  };

  const [propiedades, setpropiedades] = useState([])
  const [allPublished, setAllPublished] = useState([])
  const [asociados, setAsociados] = useState([])

  useEffect(() => {
    const timer = setTimeout(() => syncAssociatesSliderAccessibility(), 0);
    return () => clearTimeout(timer);
  }, [asociados, width]);
  const [preview, setpreview] = useState(null)
  const [usersMap, setUsersMap] = useState({})
  const [loading, setLoading] = useState(true)
  const [exclusivas, setExclusivas] = useState([])
  const URL = API_URL

  const lightbox = useGLightbox({
    autoplayVideos: false,
    openEffect: 'zoom',
    closeEffect: 'fade'
  }, [propiedades]);

  // Función para enriquecer propiedades con datos de agentes
  const enrichProperties = (props, usersMap) => {
    return props
      .filter(items => items.status === "published")
      .map(prop => {
        const agentIds = Array.isArray(prop.agents) && prop.agents.length > 0
          ? prop.agents
          : (prop.userId ? [prop.userId] : []);

        const agentsData = agentIds
          .map(agentId => {
            const agent = usersMap[agentId];
            if (!agent) return null;
            const agentRoles = Array.isArray(agent.roles) ? agent.roles : [agent.roles];
            const agencia = agent.parentId ? usersMap[agent.parentId] : null;
            return {
              _id: agent._id,
              profileSlug: agent.profileSlug,
              name: agent.name || '',
              phone: agent.phone || '',
              avatar: agent.avatar ? API_URL + agent.avatar.replace('/uploads', '') : null,
              ratingAverage: agent.ratingAverage ?? 0,
              _isAgency: agentRoles.includes('agencia'),
              agencia: agencia ? {
                _id: agencia._id,
                profileSlug: agencia.profileSlug,
                name: agencia.name || '',
                avatar: agencia.avatar ? API_URL + agencia.avatar.replace('/uploads', '') : null
              } : null
            };
          })
          .filter(Boolean);

        return { ...prop, agentsData };
      });
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        // 1. Cargar usuarios (mapa para agentes)
        const usersResponse = await fetch(`${API_URL}/users/list-user?limit=9999`)
          .then(r => r.json())
          .catch(() => []);
        
        const map = {};
        const usersArr = Array.isArray(usersResponse?.data) ? usersResponse.data : Array.isArray(usersResponse) ? usersResponse : [];
        usersArr.forEach(u => { map[u._id] = u; });
        setUsersMap(map);

        // 2. Cargar propiedades destacadas (featured) - hasta 100
        // 3. Cargar propiedades exclusivas (hasta 3)
        // 4. Cargar propiedades recientes (página 1, limit 4)
        // 5. Cargar propiedades por rango de precio para contadores Diamond/Platinum/Gold
        //    usando la API con filtros priceUSDMin/priceUSDMax (más eficiente que traer todo)
        const [featuredRes, exclusivasRes, recentRes] = await Promise.all([
          fetch(`${API_URL}/properties?limit=100&featured.isActive=true`).then(r => r.json()).catch(() => ({ data: [] })),
          fetch(`${API_URL}/properties?limit=3&status=published&exclusive=true`).then(r => r.json()).catch(() => ({ data: [] })),
          fetch(`${API_URL}/properties?limit=4&status=published&featured.isActive=false&exclusive=false`).then(r => r.json()).catch(() => ({ data: [] }))
        ]);

        // Obtener propiedades por rango de precio para contadores (Diamond, Platinum, Gold)
        // usando la API con filtros priceUSDMin/priceUSDMax - mucho más eficiente que traer todas
        const [diamondData, platinumData, goldData] = await Promise.all([
          fetchPropertiesByPriceRange(API_URL, { min: 2000000, max: null }).catch(() => []),
          fetchPropertiesByPriceRange(API_URL, { min: 1000000, max: 2000000 }).catch(() => []),
          fetchPropertiesByPriceRange(API_URL, { min: 500000, max: 1000000 }).catch(() => [])
        ]);

        // Combinar todas las propiedades de los 3 rangos para los contadores de ubicación
        // (necesitamos todas las publicadas para los filtros de ubicación)
        const allPublishedData = [...diamondData, ...platinumData, ...goldData];
        // Eliminar duplicados por si alguna propiedad aparece en más de un rango
        const seenIds = new Set();
        const uniquePublished = allPublishedData.filter(p => {
          if (seenIds.has(p._id)) return false;
          seenIds.add(p._id);
          return true;
        });

        // Enriquecer propiedades destacadas con datos de agentes
        const featuredData = Array.isArray(featuredRes?.data) ? featuredRes.data : [];
        const featuredEnriched = enrichProperties(featuredData, map);

        // Enriquecer propiedades exclusivas con datos de agentes
        const exclusivasData = Array.isArray(exclusivasRes?.data) ? exclusivasRes.data : [];
        const exclusivasEnriched = enrichProperties(exclusivasData, map);
        setExclusivas(exclusivasEnriched);

        // Enriquecer propiedades recientes con datos de agentes
        const recentData = Array.isArray(recentRes?.data) ? recentRes.data : [];
        const recentEnriched = enrichProperties(recentData, map);

        // Combinar propiedades destacadas + recientes (sin duplicados)
        // Estas se usarán para mostrar las secciones de featured y recientes
        const allIds = new Set();
        const combined = [...featuredEnriched, ...recentEnriched];
        const uniqueCombined = combined.filter(p => {
          if (allIds.has(p._id)) return false;
          allIds.add(p._id);
          return true;
        });

        setpropiedades(uniqueCombined);

        // Guardar todas las publicadas para contadores de rangos (Diamond, Platinum, Gold)
        // Se formatean los precios para que los use el useMemo de contadores
        const formatCount = (n) => {
          const num = parseInt(n) || 0;
          if (num >= 1000000) return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
          if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
          return String(num);
        };

        const publishedForCount = uniquePublished.map(p => ({
          ...p,
          visitCounter: formatCount(p.visitCounter),
          market: {
            ...p.market,
            priceRaw: p.market?.price || 0,
            priceUSDRaw: p.market?.priceUSD || 0,
            price: 'Q ' + new Intl.NumberFormat('es-GT', { minimumFractionDigits: 0 }).format(p.market?.price || 0),
            priceUSD: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(p.market?.priceUSD || 0)
          }
        }));

        setAllPublished(publishedForCount);

      } catch (errors) {
        console.error('hay un error' + errors);
      } finally {
        setLoading(false);
      }
    };

    loadData();

    // Limpiar destacados expirados (propiedades y usuarios)
    cleanExpiredFeatured();

    // Cargar asociados (público, sin autenticación)
    const loadAsociados = async () => {
      const result = await getAsociadosPublic();
      if (result.success) {
        const data = Array.isArray(result.data) ? result.data : [];
        setAsociados(data);
      }
    };
    loadAsociados();
  }, [])

  // Configuración de ubicaciones para la sección de zonas
  const locationConfigs = useMemo(() => [
    {
      id: 'zona10',
      label: 'Zona 10, Guatemala',
      img: zona1,
      alt: 'Zona 10',
      filters: { department: 'Guatemala', zone: 'Zona 10' },
    },
    {
      id: 'antigua',
      label: 'Antigua Guatemala, Sacatepéquez',
      img: zona2,
      alt: 'Antigua Guatemala',
      filters: { department: 'Sacatepéquez', municipality: 'Antigua Guatemala' },
    },
    {
      id: 'zona14',
      label: 'Zona 14, Guatemala',
      img: zona3,
      alt: 'Zona 14',
      filters: { department: 'Guatemala', zone: 'Zona 14' },
    },
    {
      id: 'escuintla',
      label: 'Escuintla',
      img: zona4,
      alt: 'Escuintla',
      filters: { department: 'Escuintla' },
    },
    {
      id: 'zona16',
      label: 'Zona 16, Guatemala',
      img: zona5,
      alt: 'Zona 16',
      filters: { department: 'Guatemala', zone: 'Zona 16' },
    },
  ], []);

  // Estado para contadores de ubicación (se cargan desde la API)
  const [locationCounts, setLocationCounts] = useState(locationConfigs.map(() => 0));
  const [locationCountsLoaded, setLocationCountsLoaded] = useState(false);

  // Cargar contadores de ubicación desde la API con filtros de ubicación
  useEffect(() => {
    const loadLocationCounts = async () => {
      try {
        const results = await Promise.all([
          fetchPropertiesByLocation(API_URL, { department: 'Guatemala', zone: 'Zona 10' }).catch(() => []),
          fetchPropertiesByLocation(API_URL, { department: 'Sacatepéquez', municipality: 'Antigua Guatemala' }).catch(() => []),
          fetchPropertiesByLocation(API_URL, { department: 'Guatemala', zone: 'Zona 14' }).catch(() => []),
          fetchPropertiesByLocation(API_URL, { department: 'Escuintla' }).catch(() => []),
          fetchPropertiesByLocation(API_URL, { department: 'Guatemala', zone: 'Zona 16' }).catch(() => []),
        ]);
        setLocationCounts(results.map(data => data.length));
      } catch (e) {
        console.error('Error cargando contadores de ubicación:', e);
      } finally {
        setLocationCountsLoaded(true);
      }
    };
    loadLocationCounts();
  }, []);

  // Rangos fijos: base USD, GTQ = USD * 7.8
  const TC = 7.8; // tipo de cambio aproximado
  const priceRanges = useMemo(() => {
    if (currencyMode === 'USD') {
      return { t1: 500000, t2: 1000000, t3: 2000000 };
    }
    return { t1: 500000 * TC, t2: 1000000 * TC, t3: 2000000 * TC };
  }, [currencyMode]);

  // Contadores calculados según rangos y moneda (usando todas las publicadas)
  const { cantd, cantp, cantg } = useMemo(() => {
    if (!allPublished.length) return { cantd: 0, cantp: 0, cantg: 0 };
    const { t2, t3 } = priceRanges;
    const count = (min, max) => allPublished.filter(item => {
      const price = parseFloat(currencyMode === 'GTQ' ? item.market?.priceRaw : item.market?.priceUSDRaw) || 0;
      return price >= min && (max == null || price <= max);
    }).length;
    return { cantd: count(t3, null), cantp: count(t2, t3), cantg: count(priceRanges.t1, t2) };
  }, [allPublished, currencyMode, priceRanges]);

  // Propiedades destacadas (featured.isActive === true), ordenadas por updatedAt descendente (más reciente primero)
  const destacadas = useMemo(() => {
    if (!propiedades.length) return [];
    return propiedades
      .filter(p => p.featured?.isActive === true)
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  }, [propiedades]);


  // Primera destacada (la que expira más pronto)
  const propiedadReciente = useMemo(() => {
    return destacadas.length > 0 ? destacadas[0] : null;
  }, [destacadas]);

  // Las siguientes 3 destacadas
  const propiedadesSecundarias = useMemo(() => {
    if (!destacadas.length || !propiedadReciente) return [];
    return destacadas
      .filter(p => p._id !== propiedadReciente._id)
      .slice(0, 3);
  }, [destacadas, propiedadReciente]);

  // Propiedades más recientes (Agregado recientemente)
  // Ordenadas primero por cantidad de fotos (las que más tienen primero) y luego por fecha
  // Excluye propiedades destacadas (featured.isActive === true) y exclusivas (exclusive === true)
  const recientes = useMemo(() => {
    if (!propiedades.length) return [];
    return [...propiedades]
      .filter(p => !p.featured?.isActive && !p.exclusive)
      .sort((a, b) => {
        const photosA = a.media?.photos?.length || 0;
        const photosB = b.media?.photos?.length || 0;
        if (photosB !== photosA) return photosB - photosA;
        return new Date(b.updatedAt) - new Date(a.updatedAt);
      })
      .slice(0, 4);
  }, [propiedades]);

  // Primera más reciente
  const propiedadMasReciente = useMemo(() => {
    return recientes.length > 0 ? recientes[0] : null;
  }, [recientes]);

  // Las siguientes 3 más recientes
  const propiedadesRecientesSecundarias = useMemo(() => {
    if (!recientes.length || !propiedadMasReciente) return [];
    return recientes.filter(p => p._id !== propiedadMasReciente._id).slice(0, 3);
  }, [recientes, propiedadMasReciente]);

  const handlePreview = (href) =>{
    /* console.log(href) */
    setpreview(href)
  }

  // Efecto para hacer scroll a la sección "Explora por ubicación" cuando se vuelve desde propiedades
  useEffect(() => {
    if (location.state?.scrollToLocation === 'explora-ubicacion') {
      // Pequeño timeout para asegurar que el DOM ya esté renderizado
      setTimeout(() => {
        const el = document.getElementById('explora-ubicacion');
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    }
  }, [location.state]);

  useEffect(() => {
    const syncUser = () => {
      const user = getCurrentUser();
      setuser(user);
    };
    syncUser();
    window.addEventListener('logout', syncUser);
    return () => window.removeEventListener('logout', syncUser);
  }, []);

  return (
    <>
        <SEO
          title="Home"
          description="Brickly Homes - Encuentra las mejores propiedades en venta y alquiler en Guatemala. Casas, apartamentos, terrenos, oficinas y proyectos inmobiliarios. Tu hogar ideal te espera."
          url="https://www.bricklyhomes.com"
        />
        <Container>
          <div className='section-1' style={{ marginTop: 'clamp(2rem, 10vw, 4rem)'}}>
            {/* Header siempre visible */}
            <div className="d-flex justify-content-between align-items-center">
              <div className='lh-sm'>
                <div className="mb-2 mb-lg-0" style={{ fontSize: 'clamp(38px, 6vw, 84px)', fontFamily: 'AppleGaramond' }}>
                  <FormattedMessage id="home.text1" />
                </div>
                <div style={{ fontSize: 'clamp(18px, 3vw, 28px)' }}>
                  <FormattedMessage id="home.text2" />
                </div>
              </div>
              <div className="d-none d-lg-block">
                <Link to="/propiedades" state={{ featured: true }} className='link-more-black d-flex align-items-center gap-2'><FormattedMessage id="home.text3" /> <i className="fa-solid fa-angle-right"></i></Link>
              </div>
            </div>

            {/* Loading skeleton */}
            {loading && (
              <>
                <div className='row mt-5 text-black'>
                  <div className='col-xl-7'>
                    <div className="row g-3 row-section1-imgs">
                      <div className="col-xl-8">
                        <div className="skeleton skeleton-main-img w-100"></div>
                      </div>
                      <div className="col-xl-4">
                        <div className="d-flex gap-3 gap-xl-0 flex-xl-column container-second-img">
                          <div className="skeleton skeleton-secondary-img"></div>
                          <div className="skeleton skeleton-secondary-img"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className='col-xl-5'>
                    <div className="skeleton-info">
                      <div className="skeleton skeleton-title"></div>
                      <div className="skeleton skeleton-text"></div>
                      <div className="skeleton skeleton-text-short"></div>
                      <div className="skeleton skeleton-price"></div>
                      <div className="d-flex gap-2 mt-3">
                        <div className="skeleton skeleton-text-short"></div>
                        <div className="skeleton skeleton-text-short"></div>
                        <div className="skeleton skeleton-text-short"></div>
                      </div>
                      <hr className='my-4' />
                      <div className="d-flex align-items-center gap-3">
                        <div className="skeleton skeleton-avatar"></div>
                        <div>
                          <div className="skeleton skeleton-text"></div>
                          <div className="skeleton skeleton-text-short"></div>
                        </div>
                        <div className="ms-auto skeleton skeleton-button"></div>
                      </div>
                    </div>
                  </div>
                </div>
                {/* Skeleton cards secundarias */}
                <div style={{ marginTop: 'clamp(5rem, 10vw, 9rem)'}}>
                  <div className="row gy-5 gy-xl-0">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="col-md-6 col-xl-4">
                        <div className="skeleton skeleton-img-square"></div>
                        <div className="skeleton-info mt-3">
                          <div className="skeleton skeleton-title"></div>
                          <div className="skeleton skeleton-text"></div>
                          <div className="skeleton skeleton-text-short"></div>
                          <div className="d-flex gap-2">
                            <div className="skeleton skeleton-text-short"></div>
                            <div className="skeleton skeleton-text-short"></div>
                            <div className="skeleton skeleton-text-short"></div>
                          </div>
                          <div className="skeleton skeleton-price"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Contenido real - propiedad destacada principal */}
            {!loading && destacadas.length > 0 && propiedadReciente && (() => {
              const item = propiedadReciente;
              const photos = item.media?.photos || [];
              const totalPhotos = photos.length;
              const mainPhoto = totalPhotos > 0 ? URL + '/' + photos[0].path : casa1;
              const secondPhoto = totalPhotos > 1 ? URL + '/' + photos[1].path : casa1;
              const thirdPhoto = totalPhotos > 2 ? URL + '/' + photos[2].path : casa1;
              return (
                <>
                  <div className='row mt-5 text-black'>
                    <div className='col-xl-7'>
                      <div className="row g-3 row-section1-imgs">
                        <div className="col-xl-8">
                          <div className="ratio ratio-16x9 h-100 position-relative d-block">
                            {width >= 768 ? (
                              <a className="glightbox d-block w-100 h-100" href={mainPhoto} data-gallery={`gallery-${item._id}`} onClick={(e) => e.stopPropagation()}>
                                <img src={mainPhoto} className="object-fit-cover border-radius-1 w-100 h-100" alt="Imagen principal" width="800" height="450" fetchPriority="high" />
                              </a>
                            ) : (
                              <Link to={getPropertyPath(item)} className="d-block w-100 h-100" onClick={(e) => e.stopPropagation()}>
                                <img src={mainPhoto} className="object-fit-cover border-radius-1 w-100 h-100" alt="Imagen principal" width="800" height="450" fetchPriority="high" />
                              </Link>
                            )}
                            <div style={{ padding: '5%', pointerEvents: 'none' }} className='position-absolute top-0 w-100 h-100 d-flex flex-column justify-content-between'>
                              <div className='d-flex gap-2 align-items-center rounded-4' style={{ backgroundColor: '#000000c7', color: 'white', width: 'fit-content', boxSizing: 'border-box', padding: '3px 10px', fontSize: '14px', pointerEvents: 'auto' }}>
                                <img src={diamond} className="object-fit-cover" style={{ width: '14px' }} alt="Diamond" /><FormattedMessage id="home.text31" />
                              </div>
                              <div className='d-flex justify-content-end align-items-center gap-2' style={{ pointerEvents: 'auto' }}>
                                {/* Visualizaciones ocultas temporalmente
                                <div className='d-flex gap-2 align-items-center rounded-4' style={{ backgroundColor: '#000000c7', color: 'white', width: 'fit-content', height: 'fit-content', boxSizing: 'border-box', padding: '3px 10px', fontSize: '12px' }}><FormattedMessage id="home.text8" />: {item.visitCounter || 0} </div>
                                */}
                                <div className={`favorite-icon ${isFavorite(item._id) ? 'like' : 'unlike'}`} style={{ cursor: 'pointer' }} onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (isAuthenticated() && !canFavorite) return; const iconElement = e.currentTarget.querySelector('i'); iconElement.style.transform = 'scale(1.3)'; setTimeout(() => { iconElement.style.transform = 'scale(1)'; toggleFav(item._id); }, 200); }}>
                                  <i className="fa-solid fa-heart"></i>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="col-xl-4">
                          <div className="d-flex gap-3 gap-xl-0 flex-xl-column container-second-img">
                            {(() => {
                              const isSecondary = photos.slice(1) || [];
                              const totalSecondary = isSecondary.length;

                              return isSecondary.map((photo, index) => {
                                const photoUrl = URL + '/' + photo.path;
                                if (index === 0) {
                                  return width >= 768 ? (
                                    <a key={index} className="ratio ratio-4x3 second-img-section1 d-block glightbox mb-2" href={photoUrl} data-gallery={`gallery-${item._id}`} onClick={(e) => e.stopPropagation()}>
                                      <img src={photoUrl} className="object-fit-cover border-radius-2" alt="Imagen secundaria 1" width="400" height="300" loading="lazy" />
                                    </a>
                                  ) : (
                                    <Link key={index} to={getPropertyPath(item)} className="ratio ratio-4x3 second-img-section1 d-block mb-2">
                                      <img src={photoUrl} className="object-fit-cover border-radius-2" alt="Imagen secundaria 1" width="400" height="300" loading="lazy" />
                                    </Link>
                                  );
                                } else if (index === 1) {
                                  return width >= 768 ? (
                                    <a key={index} className="ratio ratio-4x3 second-img-section1 d-block glightbox mt-xl-2 position-relative" href={photoUrl} data-gallery={`gallery-${item._id}`} onClick={(e) => e.stopPropagation()}>
                                      <img src={photoUrl} className="object-fit-cover border-radius-2" alt="Imagen secundaria 2" width="400" height="300" loading="lazy" />
                                      {totalSecondary > 2 && (
                                        <div className="position-absolute w-100 h-100 d-flex justify-content-end align-items-end p-3">
                                          <div className="d-flex align-items-baseline gap-2 text-dark py-1 px-3 rounded-5" style={{ fontSize: 'clamp(10px, 3vw, 16px)', backgroundColor: '#d9d9d9e6' }}>
                                            <i className="fa-regular fa-images"></i> +{totalSecondary - 2} <FormattedMessage id="home.fotos" />
                                          </div>
                                        </div>
                                      )}
                                    </a>
                                  ) : (
                                    <Link key={index} to={getPropertyPath(item)} className="ratio ratio-4x3 second-img-section1 d-block mt-xl-2 position-relative">
                                      <img src={photoUrl} className="object-fit-cover border-radius-2" alt="Imagen secundaria 2" width="400" height="300" loading="lazy" />
                                      {totalSecondary > 2 && (
                                        <div className="position-absolute w-100 h-100 d-flex justify-content-end align-items-end p-3">
                                          <div className="d-flex align-items-baseline gap-2 text-dark py-1 px-3 rounded-5" style={{ fontSize: 'clamp(10px, 3vw, 16px)', backgroundColor: '#d9d9d9e6' }}>
                                            <i className="fa-regular fa-images"></i> +{totalSecondary - 2} <FormattedMessage id="home.fotos" />
                                          </div>
                                        </div>
                                      )}
                                    </Link>
                                  );
                                }
                                return width >= 768 ? (
                                  <a key={index} className="ratio ratio-4x3 second-img-section1 glightbox mb-2 d-none" href={photoUrl} data-gallery={`gallery-${item._id}`} onClick={(e) => e.stopPropagation()}>
                                    <img src={photoUrl} className="object-fit-cover border-radius-2" alt="Imagen secundaria" />
                                  </a>
                                ) : (
                                  <Link key={index} to={getPropertyPath(item)} className="ratio ratio-4x3 second-img-section1 mb-2 d-none">
                                    <img src={photoUrl} className="object-fit-cover border-radius-2" alt="Imagen secundaria" />
                                  </Link>
                                );
                              });
                            })()}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className='col-xl-5'>
                      <Link to={getPropertyPath(item)} className='text-body' onClick={(e) => e.stopPropagation()}>
                            <div className='mt-xl-3' style={{ fontSize: 'clamp(16px, 3vw, 20px)' }}>
                              <div className="mt-3 mt-xl-0 lh-sm text-truncate" style={{ fontSize: 'clamp(30px, 6vw, 50px)', fontFamily: 'AppleGaramond' }}>{item.market?.title || 'Sin título'}</div>
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
                              <div><FormattedMessage id="home.text9" />: {item.market?.type || 'N/A'}</div>
                              <div className='my-4 fw-bold fs-4 text-dark d-flex align-items-center gap-4'>
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
                              { (item.layout?.bedrooms > 0 || item.layout?.bathrooms > 0 || item?.layout?.parkingSpots > 0 || item?.dimensions?.landM2 > 0 || item?.dimensions?.landV2 > 0) && 
                                <div className='d-flex gap-4 mt-3' style={{ fontSize: '16px' }}>
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
                            </div>
                      </Link>
                      <hr className='my-4' />
                      <div>
                        <div className='mb-3' style={{ fontSize: 'clamp(16px, 6vw, 20px)' }}><FormattedMessage id="home.text11" /></div>
                        {item.agentsData?.length > 0 && (() => {
                          const agent = item.agentsData[0];
                          return (
                          <div key={agent._id}>
                            <div className="d-none d-md-flex align-items-start justify-content-between align-items-lg-center flex-column flex-md-row gap-4">
                              <Link to={getUserProfilePath(agent)} className='text-body' onClick={(e) => e.stopPropagation()}>
                                <div className="d-flex align-items-center gap-2">
                                  <div className='rounded-circle' style={{ width: '60px', height: '60px' }}>
                                    <img src={agent.avatar || avatar} alt="Avatar" width="60" height="60" className='rounded-circle object-fit-cover' />
                                  </div>
                                  <div>
                                    <div className='lh-sm'>{agent.name}{agent?.agencia?.name && <> <br /><span style={{fontSize: '14px'}}>{agent.agencia.name}</span></>}</div>
                                    <div style={{ fontSize: '12px' }}>
                                      <StarRating rating={agent.ratingAverage} size='11px' />
                                    </div>
                                  </div>
                                </div>
                              </Link>
                              <div className="d-flex justify-content-md-end flex-column">
                                <div className='mb-2 lh-1' style={lang == 'es' ? {fontSize: '20px'} : {fontSize: '16px'}}><FormattedMessage id="home.text12" /></div>
                                <span className="rounded-1 text-center border-0 py-1" style={{ backgroundColor: 'black', color: 'white', boxSizing: 'border-box', padding: '2px 8px', cursor: 'pointer' }} onClick={(e) => { e.preventDefault(); e.stopPropagation(); registerWSClick(agent._id); window.open(`https://wa.me/${agent.phone.replace(/\D/g, '')}?text=` + encodeURIComponent('¡Hola! Estoy interesado en una propiedad.'), '_blank'); }}><i className="fa-brands fa-whatsapp me-2"></i> <FormattedMessage id="home.text13" /></span>
                              </div>
                            </div>
                            {/* Versión móvil del agente - mismo diseño que en propiedad.jsx */}
                            <div key={agent._id + '-mobile'} className="d-flex d-md-none align-items-start justify-content-between align-items-lg-center flex-column flex-md-row gap-4">
                              <Link to={getUserProfilePath(agent)} className='text-body' onClick={(e) => e.stopPropagation()}>
                                <div className="d-flex align-items-start gap-4">
                                  <div className='rounded-circle' style={{ width: '100px', height: '100px' }}>
                                    <img src={agent.avatar || avatar} alt="Avatar" width="100" height="100" className='rounded-circle object-fit-cover' />
                                  </div>
                                  <div>
                                    <div className='lh-sm' style={{fontSize: '18px'}}>{agent.name}{agent?.agencia?.name && <> <br /><span style={{fontSize: '16px'}}>{agent.agencia.name}</span></>}</div>
                                    <div style={{ fontSize: '12px' }}>
                                      <StarRating rating={agent.ratingAverage} size='11px' />
                                    </div>
                                    <div className="mt-3 d-flex justify-content-md-end flex-column">
                                      <div className='mb-2 lh-1' style={lang == 'es' ? {fontSize: '20px'} : {fontSize: '16px'}}><FormattedMessage id="home.text12" /></div>
                                      <span className="rounded-1 text-center border-0 py-1" style={{ backgroundColor: 'black', color: 'white', boxSizing: 'border-box', padding: '2px 8px', cursor: 'pointer' }} onClick={(e) => { e.preventDefault(); e.stopPropagation(); registerWSClick(agent._id); window.open(`https://wa.me/${agent.phone.replace(/\D/g, '')}?text=` + encodeURIComponent('¡Hola! Estoy interesado en una propiedad.'), '_blank'); }}><i className="fa-brands fa-whatsapp me-2"></i> <FormattedMessage id="home.text13" /></span>
                                    </div>
                                  </div>
                                </div>
                              </Link>
                            </div>
                          </div>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                </>
              );
            })()}

            {/* Propiedades secundarias destacadas */}
            {!loading && propiedadesSecundarias.length > 0 && (
              <div style={{ marginTop: 'clamp(5rem, 10vw, 9rem)'}}>
                <div className="row gy-5 gy-xl-0">
                  {propiedadesSecundarias.map((item) => {
                    const imgSrc = item.media?.photos?.length > 0 ? URL + '/' + item.media.photos[0].path : casa2;
                    return (
                      <div key={item._id} className="col-md-6 col-xl-4">
                        <Link to={getPropertyPath(item)} className="position-relative d-flex flex-column text-body h-100">
                          <div className="position-relative">
                            <img src={imgSrc} className="object-fit-cover w-100 border-radius-1" style={{ aspectRatio: '4 / 4' }} alt="Imagen principal" width="400" height="400" loading="lazy" />
                            <div style={{ padding: '5%' }} className='position-absolute top-0 w-100 h-100 d-flex flex-column justify-content-between'>
                              <div className='d-flex gap-2 align-items-center rounded-4' style={{ backgroundColor: '#000000c7', color: 'white', width: 'fit-content', boxSizing: 'border-box', padding: '3px 10px', fontSize: '14px' }}>
                                <img src={diamond} className="object-fit-cover" style={{ width: '14px' }} alt="Diamond" /><FormattedMessage id="home.text31" />
                              </div>
                              <div className='d-flex justify-content-end align-items-center gap-2'>
                                {/* Visualizaciones ocultas temporalmente
                                <div className='d-flex gap-2 align-items-center rounded-4' style={{ backgroundColor: '#000000c7', color: 'white', width: 'fit-content', height: 'fit-content', boxSizing: 'border-box', padding: '3px 10px', fontSize: '12px' }}><FormattedMessage id="home.text8" />: {item.visitCounter || 0} </div>
                                */}
                                <div className={`favorite-icon ${isFavorite(item._id) ? 'like' : 'unlike'}`} style={{ cursor: 'pointer' }} onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (isAuthenticated() && !canFavorite) return; const iconElement = e.currentTarget.querySelector('i'); iconElement.style.transform = 'scale(1.3)'; setTimeout(() => { iconElement.style.transform = 'scale(1)'; toggleFav(item._id); }, 200); }}>
                                  <i className="fa-solid fa-heart"></i>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className='mt-3 d-flex flex-column flex-grow-1'>
                            <div className="lh-sm text-truncate" style={{ fontSize: 'clamp(34px, 6vw, 50px)', fontFamily: 'AppleGaramond' }}>{item.market?.title || 'Sin título'}</div>
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
                            <div><FormattedMessage id="home.text9" />: {item.market?.type || 'N/A'}</div>
                            {(item.layout?.bedrooms > 0 || item.layout?.bathrooms > 0 || item?.layout?.parkingSpots > 0 || item?.dimensions?.landM2 > 0 || item?.dimensions?.landV2 > 0) && 
                              <div className='d-flex gap-4 my-3' style={{ fontSize: '16px' }}>
                                {item.layout?.bedrooms > 0 && (
                                  item?.market?.type?.toLowerCase() === 'oficina' && item?.layout?.totalRooms > 0 ? (
                                    <div className='d-flex align-items-center gap-2' title='Total de ambientes'><img src={space} alt="icon" /> {item.layout?.totalRooms}</div>
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
                  })}
                </div>
              </div>
            )}
          </div>

          {/* ── Sección Exclusivas ────────────────────────────── */}
          {!loading && exclusivas.length > 0 && (
            <div className="section-exclusivas" style={{ marginTop: 'clamp(5rem, 10vw, 8rem)'}}>
              <div className="d-flex justify-content-between align-items-center">
                <div className='lh-sm'>
                  <div className="mb-2 mb-lg-0" style={{ fontSize: 'clamp(38px, 6vw, 84px)', fontFamily: 'AppleGaramond' }}>
                    Propiedades Exclusivas
                  </div>
                  <div style={{ fontSize: 'clamp(18px, 3vw, 28px)' }}>
                    <FormattedMessage id="home.text5" />
                  </div>
                </div>
                <div className="d-none d-lg-block">
                  <Link to="/propiedades" state={{ exclusive: true }} className='link-more-black d-flex align-items-center gap-2'><FormattedMessage id="home.text6" /> <i className="fa-solid fa-angle-right"></i></Link>
                </div>
              </div>

              <div style={{ marginTop: 'clamp(2rem, 5vw, 4rem)'}}>
                <div className="row gy-5 gy-xl-0">
                  {exclusivas.map((item) => {
                    const imgSrc = item.media?.photos?.length > 0 ? URL + '/' + item.media.photos[0].path : casa2;
                    return (
                      <div key={item._id} className="col-md-6 col-xl-4">
                        <Link to={getPropertyPath(item)} className="position-relative d-flex flex-column text-body h-100">
                          <div className="position-relative">
                            <img src={imgSrc} className="object-fit-cover w-100 border-radius-1" style={{ aspectRatio: '4 / 4' }} alt="Imagen principal" width="400" height="400" loading="lazy" />
                            <div style={{ padding: '5%' }} className='position-absolute top-0 w-100 h-100 d-flex flex-column justify-content-between'>
                              <div className='d-flex gap-2 align-items-center rounded-4' style={{ backgroundColor: '#000000c7', color: 'white', width: 'fit-content', boxSizing: 'border-box', padding: '3px 10px', fontSize: '14px' }}>
                                <FormattedMessage id="home.text7" />
                              </div>
                              <div className='d-flex justify-content-end align-items-center gap-2'>
                                {/* Visualizaciones ocultas temporalmente
                                <div className='d-flex gap-2 align-items-center rounded-4' style={{ backgroundColor: '#000000c7', color: 'white', width: 'fit-content', height: 'fit-content', boxSizing: 'border-box', padding: '3px 10px', fontSize: '12px' }}><FormattedMessage id="home.text8" />: {item.visitCounter || 0} </div>
                                */}
                                <div className={`favorite-icon ${isFavorite(item._id) ? 'like' : 'unlike'}`} style={{ cursor: 'pointer' }} onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (isAuthenticated() && !canFavorite) return; const iconElement = e.currentTarget.querySelector('i'); iconElement.style.transform = 'scale(1.3)'; setTimeout(() => { iconElement.style.transform = 'scale(1)'; toggleFav(item._id); }, 200); }}>
                                  <i className="fa-solid fa-heart"></i>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className='mt-3 d-flex flex-column flex-grow-1'>
                            <div className="lh-sm text-truncate" style={{ fontSize: 'clamp(34px, 6vw, 50px)', fontFamily: 'AppleGaramond' }}>{item.market?.title || 'Sin título'}</div>
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
                            <div><FormattedMessage id="home.text9" />: {item.market?.type || 'N/A'}</div>
                            {(item.layout?.bedrooms > 0 || item.layout?.bathrooms > 0 || item?.layout?.parkingSpots > 0 || item?.dimensions?.landM2 > 0 || item?.dimensions?.landV2 > 0) && 
                              <div className='d-flex gap-4 my-3' style={{ fontSize: '16px' }}>
                                {item.layout?.bedrooms > 0 && (
                                  item?.market?.type?.toLowerCase() === 'oficina' && item?.layout?.totalRooms > 0 ? (
                                    <div className='d-flex align-items-center gap-2' title='Total de ambientes'><img src={space} alt="icon" /> {item.layout?.totalRooms}</div>
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
                  })}
                </div>
              </div>
            </div>
          )}

          <div className="section-2" style={{ marginTop: 'clamp(5rem, 10vw, 8rem)'}}>
            {/* Header siempre visible */}
            <div style={{ marginTop: 'clamp(5rem, 10vw, 8rem)'}} className='fs-4 text-uppercase fw-bold'><FormattedMessage id="home.text10" /></div>

            {/* Loading skeleton */}
            {loading && (
              <>
                <div className='row gx-5 mt-5'>
                  <div className='col-lg-7'>
                    <div className="skeleton skeleton-main-img w-100" style={{ minHeight: '350px' }}></div>
                  </div>
                  <div className='col-lg-5'>
                    <div className="skeleton-info">
                      <div className="skeleton skeleton-title"></div>
                      <div className="skeleton skeleton-text"></div>
                      <div className="skeleton skeleton-text-short"></div>
                      <div className="skeleton skeleton-price"></div>
                      <div className="d-flex gap-2 mt-3">
                        <div className="skeleton skeleton-text-short"></div>
                        <div className="skeleton skeleton-text-short"></div>
                        <div className="skeleton skeleton-text-short"></div>
                      </div>
                      <hr className='my-4' />
                      <div className="d-flex align-items-center gap-3">
                        <div className="skeleton skeleton-avatar"></div>
                        <div>
                          <div className="skeleton skeleton-text"></div>
                          <div className="skeleton skeleton-text-short"></div>
                        </div>
                        <div className="ms-auto skeleton skeleton-button"></div>
                      </div>
                    </div>
                  </div>
                </div>
                {/* Skeleton cards secundarias */}
                <div className="row gy-5 gy-xl-0" style={{ marginTop: 'clamp(2rem, 10vw, 6rem)'}}>
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="col-md-6 col-xl-4">
                      <div className="skeleton skeleton-img-square"></div>
                      <div className="skeleton-info mt-3">
                        <div className="skeleton skeleton-title"></div>
                        <div className="skeleton skeleton-text"></div>
                        <div className="skeleton skeleton-text-short"></div>
                        <div className="d-flex gap-2">
                          <div className="skeleton skeleton-text-short"></div>
                          <div className="skeleton skeleton-text-short"></div>
                          <div className="skeleton skeleton-text-short"></div>
                        </div>
                        <div className="skeleton skeleton-price"></div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Contenido real */}
            {!loading && propiedades.length > 0 && propiedadMasReciente && (() => {
                const item = propiedadMasReciente;
                    return (
                      <>
                        <div className='row gx-5 mt-5' key={item._id}>
                          <div className='col-lg-7 order-1'>
                            <div
                              className="d-block position-relative ratio ratio-16x9 h-100 propiedades-zoom"
                              style={{ cursor: width >= 768 ? 'zoom-in' : 'pointer' }}
                              onClick={() => {
                                if (width < 768) {
                                  navigate(getPropertyPath(item));
                                  return;
                                }
                                const photos = item.media.photos.map(p => ({
                                  href: URL + '/' + p.path,
                                  type: 'image',
                                }));
                                const currentUrl = preview ? preview : URL + '/' + item.media.photos[0].path;
                                const startAt = photos.findIndex(p => p.href === currentUrl);
                                const lb = GLightbox({
                                  elements: photos,
                                  startAt: startAt >= 0 ? startAt : 0,
                                  touchNavigation: true,
                                  loop: true,
                                  openEffect: 'zoom',
                                  closeEffect: 'fade',
                                });
                                lb.open();
                              }}
                            >
                              <img src={ preview ? preview : URL + '/' + item.media.photos[0].path } className="object-fit-cover border-radius-1 w-100 h-100" alt="Imagen principal" width="800" height="450" loading="lazy" style={{ position: 'absolute', top: 0, left: 0 }} />
                              <div style={{ padding: '5%', position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }} className='d-flex flex-column justify-content-between'>
                                {/* <div className='d-flex gap-2 align-items-center' style={{ backgroundColor: '#000000c7', color: 'white', width: 'fit-content', boxSizing: 'border-box', padding: '1px 24px', fontSize: '14px' }}>
                                  <FormattedMessage id="home.text7" />
                                </div> */}
                                <div className='d-flex mt-auto justify-content-end align-items-center gap-2'>
                                  {/* Visualizaciones ocultas temporalmente
                                  <div className='d-flex gap-2 align-items-center rounded-4' style={{ backgroundColor: '#000000c7', color: 'white', width: 'fit-content', height: 'fit-content', boxSizing: 'border-box', padding: '3px 10px', fontSize: '12px' }}><FormattedMessage id="home.text8" />: { item.visitCounter } </div>
                                  */}
                                  <div className={`favorite-icon ${isFavorite(item._id) ? 'like' : 'unlike'}` } style={{ cursor: 'pointer' }} onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (isAuthenticated() && !canFavorite) return; const iconElement = e.currentTarget.querySelector('i'); iconElement.style.transform = 'scale(1.3)'; setTimeout(() => { iconElement.style.transform = 'scale(1)'; toggleFav(item._id); }, 200); }}>
                                    <i className="fa-solid fa-heart"></i>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className='col-lg-5 order-3 order-lg-2'>
                            <div className="text-body">
                              <div className='mt-lg-3' style={{ fontSize: 'clamp(16px, 3vw, 20px)' }}>
                                <Link className="text-body text-decoration-none" to={getPropertyPath(item)}>
                                <div className="lh-sm text-truncate" style={{ fontSize: 'clamp(34px, 3.5vw, 46px)', fontFamily: 'AppleGaramond' }}>{ item.market.title }</div>
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
                                <div className="mt-lg-4 d-flex align-items-center gap-4 mb-3">
                                  {(() => {
                                    const dp = getDisplayPrice(item.market, currencyMode);
                                    return dp ? (
                                      <div className='fw-bold fs-3 text-dark'>{formatPrice(dp.value, dp.currency)}</div>
                                    ) : null;
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
                                {(item.layout?.bedrooms > 0 || item.layout?.bathrooms > 0 || item.layout?.parkingSpots > 0 || item.dimensions?.landM2 > 0 || item?.dimensions?.landV2 > 0) && 
                                  <div className='d-flex gap-4 mt-3' style={{ fontSize: '16px' }}>
                                    {item.layout?.bedrooms > 0 && (
                                      item?.market?.type?.toLowerCase() === 'oficina' && item?.layout?.totalRooms > 0 ? (
                                        <div className='d-flex align-items-center gap-2' title='Total de ambientes'><img src={space} alt="icon" style={{ width: '14px' }} /> {item.layout.totalRooms}</div>
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
                                </Link>
                              </div>
                              <hr className='my-4' />
                              <div>
                                <div className='mb-3' style={{ fontSize: 'clamp(16px, 6vw, 20px)' }}><FormattedMessage id="home.text11" /></div>
                                {item.agentsData?.length > 0 && (() => {
                                  const agent = item.agentsData[0];
                                  return (
                                <div className='d-flex flex-column gap-4'>
                                    <div key={agent._id} className="d-none d-md-flex align-items-start justify-content-between align-items-lg-center flex-column flex-md-row gap-4">
                                        <Link to={getUserProfilePath(agent)} className='text-body'>
                                            <div className="d-flex align-items-start gap-2">
                                                <div className='rounded-circle' style={{ width: '60px', height: '60px' }}><img src={agent.avatar} alt="Avatar" width="60" height="60" className='rounded-circle object-fit-cover' /></div>
                                                <div>
                                                    <div className='lh-sm'>{agent.name}  { agent?.agencia?.name && <> <br /> <span style={{fontSize: '14px'}}>{agent.agencia.name}</span> </>}</div>
                                                    <div style={{ fontSize: '12px' }}>
                                                        <StarRating rating={agent.ratingAverage} size='11px' />
                                                    </div>
                                                </div>
                                            </div>
                                        </Link>
                                        <div className="d-flex justify-content-md-end flex-column">
                                            <div className='mb-2 lh-1' style={lang == 'es' ? {fontSize: '20px'} : {fontSize: '16px'}}><FormattedMessage id="home.text12" /></div>
                                            <a href={`https://wa.me/${agent.phone.replace(/\D/g, '')}?text=` + encodeURIComponent('¡Hola! Me comunico desde la plataforma Brickly Homes. Estoy interesado en una propiedad.')} target='_blank' className="rounded-1 text-center border-0 py-1" style={{ backgroundColor: 'black', color: 'white', boxSizing: 'border-box', padding: '2px 8px' }} rel="noreferrer" onClick={() => registerWSClick(agent._id)}><i className="fa-brands fa-whatsapp me-2"></i> <FormattedMessage id="home.text13" /></a>
                                        </div>
                                    </div>
                                
                                    <div key={agent._id + '-mobile'} className="d-flex d-md-none align-items-start justify-content-between align-items-lg-center flex-column flex-md-row gap-4">
                                        <Link to={getUserProfilePath(agent)} className='text-body'>
                                            <div className="d-flex align-items-start gap-4">
                                                <div className='rounded-circle' style={{ width: '100px', height: '100px' }}><img src={agent.avatar} alt="Avatar" width="100" height="100" className='rounded-circle object-fit-cover' /></div>
                                                <div>
                                                    <div className='lh-sm' style={{fontSize: '18px'}}>{agent.name}  { agent?.agencia?.name && <> <br /> <span style={{fontSize: '16px'}}>{agent.agencia.name}</span> </>}</div>
                                                    <div style={{ fontSize: '12px' }}>
                                                        <StarRating rating={agent.ratingAverage} size='11px' />
                                                    </div>
                                                    <div className="mt-3 d-flex justify-content-md-end flex-column">
                                                        <div className='mb-2 lh-1' style={lang == 'es' ? {fontSize: '20px'} : {fontSize: '16px'}}><FormattedMessage id="home.text12" /></div>
                                                        <span onClick={(e) => { e.preventDefault(); e.stopPropagation();
                                                            registerWSClick(agent._id);
                                                            window.open(`https://wa.me/${agent.phone.replace(/\D/g, '')}?text=` + encodeURIComponent('¡Hola! Estoy interesado en una propiedad.'), '_blank');
                                                        }} className="rounded-1 text-center border-0 py-1" style={{ backgroundColor: 'black', color: 'white', boxSizing: 'border-box', padding: '2px 8px', cursor: 'pointer' }} rel="noreferrer"><i className="fa-brands fa-whatsapp me-2"></i> <FormattedMessage id="home.text13" /></span>
                                                    </div>
                                                </div>
                                            </div>
                                        </Link>
                                    </div>
                              </div>
                                  );
                                })()}
                              </div>
                            </div>
                          </div>

                          <div className="mt-4 mt-lg-5 mb-4 mb-lg-0 col-12 order-2 order-lg-3 carrusel-slide-wrapper">
                            <Slider {...settings} className="carrusel" slidesToShow={getSlides(4, 3, 2)}>
                              {item.media.photos.map((photo, idx) => {
                                if (idx === 0) return null; // omitir la imagen principal
                                return (
                                  <div key={idx} className="items">
                                    <img
                                      src={URL + '/' + photo.path}
                                      alt={`Imagen ${idx}`}
                                      style={{ width: '100%', cursor: 'pointer' }}
                                      onClick={() => handlePreview(URL + '/' + photo.path)}
                                    />
                                  </div>
                                );
                              })}
                            </Slider>
                          </div>

                        </div>
                      </>
                    );
                  })()}

                {propiedadesRecientesSecundarias.length > 0 && (
                <div className="row gy-5 gy-xl-0" style={{ marginTop: 'clamp(2rem, 10vw, 6rem)'}}>
                  {propiedadesRecientesSecundarias.map((item, index) => {
                      if (!item.media?.photos?.length) return null;
                      return (
                        <div key={item._id} className="col-md-6 col-xl-4 d-flex flex-column">
                          <div className="position-relative d-block">
                            <Link to={getPropertyPath(item)} className="d-block propiedades-zoom">
                              <img src={URL + '/' + item.media.photos[0].path} className="object-fit-cover w-100 border-radius-1" alt="Imagen principal" width="400" height="400" loading="lazy" style={{ aspectRatio: '4 / 4' }} />
                              <div style={{ padding: '5%' }} className='position-absolute top-0 w-100 h-100 d-flex flex-column justify-content-between'>
                                  {/* <div className='d-flex gap-2 align-items-center' style={{ backgroundColor: '#000000c7', color: 'white', width: 'fit-content', boxSizing: 'border-box', padding: '1px 24px', fontSize: '14px' }}>
                                    <FormattedMessage id="home.text7" />
                                  </div> */}
                                  <div className='d-flex mt-auto justify-content-end align-items-center gap-2'>
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
              )}

          </div>

          <div className="section-3" style={{ marginTop: 'clamp(5rem, 10vw, 8rem)'}}>
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <div style={{ fontSize: 'clamp(36px, 6vw, 84px)', fontFamily: 'AppleGaramond' }}>
                  <FormattedMessage id="home.text14" />
                </div>
                <div className="mt-2 lh-sm" style={{ fontSize: 'clamp(16px, 3vw, 24px)', whiteSpace: 'pre-line' }}>
                  <FormattedMessage id="home.text15" />
                </div>
              </div>
            </div>

            <div className="row gy-4 gy-lg-0 gx-3 top-propiedades" style={{ marginTop: 'clamp(1rem, 3vw, 4rem)'}}>
              <div className="col-lg-4">
                <Link to="/propiedades" state={{ minPrice: priceRanges.t3, maxPrice: null }} className="position-relative text-white overflow-hidden zoom-in d-block text-decoration-none">
                  <img src={d} className="object-fit-cover w-100" alt="Diamond" />
                  <div className="d-flex position-absolute top-0 flex-column justify-content-between h-100 w-100">
                    <div className="d-flex justify-content-between align-items-center bg-dark px-3">
                      <div className="fs-1" style={{ fontFamily: 'AppleGaramond' }}>Diamond</div>
                      <div>{currencyMode === 'GTQ' ? 'Q16M+' : '$2M+'}</div>
                    </div>
                    <div className="text-center pb-3" style={{ zIndex: '99' }}>{cantd} <FormattedMessage id={cantd === 1 ? "home.text16_singular" : "home.text16"} /></div>
                  </div>
                </Link>
              </div>
              <div className="col-lg-4">
                <Link to="/propiedades" state={{ minPrice: priceRanges.t2, maxPrice: priceRanges.t3 }} className="position-relative text-white overflow-hidden zoom-in d-block text-decoration-none">
                  <img src={p} className="object-fit-cover w-100" alt="Platinum" />
                  <div className="d-flex position-absolute top-0 flex-column justify-content-between h-100 w-100">
                    <div className="d-flex justify-content-between align-items-center bg-dark px-3">
                      <div className="fs-1" style={{ fontFamily: 'AppleGaramond', color: '#AEADAD' }}>Platinum</div>
                      <div>{currencyMode === 'GTQ' ? 'Q8M - Q16M' : '$1M - $2M'}</div>
                    </div>
                    <div className="text-center pb-3" style={{ zIndex: '99' }}>{cantp} <FormattedMessage id={cantp === 1 ? "home.text16_singular" : "home.text16"} /></div>
                  </div>
                </Link>
              </div>
              <div className="col-lg-4">
                <Link to="/propiedades" state={{ minPrice: priceRanges.t1, maxPrice: priceRanges.t2 }} className="position-relative text-white overflow-hidden zoom-in d-block text-decoration-none">
                  <img src={g} className="object-fit-cover w-100" alt="Gold" />
                  <div className="d-flex position-absolute top-0 flex-column justify-content-between h-100 w-100">
                    <div className="d-flex justify-content-between align-items-center bg-dark px-3">
                      <div className="fs-1" style={{ fontFamily: 'AppleGaramond', color: '#FFB102' }}>Gold</div>
                      <div>{currencyMode === 'GTQ' ? 'Q4M - Q8M' : '$500K - $1M'}</div>
                    </div>
                    <div className="text-center pb-3" style={{ zIndex: '99' }}>{cantg} <FormattedMessage id={cantg === 1 ? "home.text16_singular" : "home.text16"} /></div>
                  </div>
                </Link>
              </div>
            </div>
          </div>
      </Container>

      <div className="section-4 position-relative" style={{ marginTop: 'clamp(5rem, 10vw, 8rem)' }}>

        <div className="banner2">
          <div className="position-absolute w-100 top-0 start-0 text-white" style={{ marginTop: 'clamp(1rem, 6vw, 5rem)' }}>
            <Container>
              <div className="lh-1 mt-4 mt-lg-0" style={{ fontSize: 'clamp(36px, 6vw, 84px)', fontFamily: 'AppleGaramond' }}><FormattedMessage id="home.text18" /></div>
              {/* <div className="mt-4 lh-sm" style={{ fontSize: 'clamp(20px, 3vw, 24px)' }}><FormattedMessage id="home.text19" /></div> */}
              <div className="d-flex justify-content-center justify-content-lg-start mt-5" style={{ marginTop: 'clamp(2rem, 10vw, 4rem)' }}>
                <Link to="/asociados" className='link-more-white d-flex align-items-center gap-2'><FormattedMessage id="home.text19" /> <i className="fa-solid fa-angle-right"></i></Link>
              </div>
            </Container>
          </div>
        </div>

        {/* <img src={constructoras} alt="banner" className="w-100" />
        <div className="position-absolute top-0 start-0 w-100">
          <Container className="mt-5 text-white">
            <div className="lh-1" style={{ fontSize: 'clamp(20px, 6vw, 84px)', fontFamily: 'AppleGaramond' }}>Constructoras e <br /> inmobiliarias asociadas</div>
            <div className="mt-4 lh-sm" style={{ fontSize: 'clamp(16px, 6vw, 24px)' }}>Descubre los desarrolladores y firmas especializadas tras las propiedades <br /> más selectas de nuestra colección</div>
            <div style={{ marginTop: 'clamp(2rem, 10vw, 4rem)' }}>
              <a href="#" className='link-more-white d-flex align-items-center gap-2'>Explora sus proyectos <i className="fa-solid fa-angle-right"></i></a>
            </div>
          </Container>
        </div> */}

        {asociados.length > 0 && (   
          <Container>
            <div className="mt-5">
              <div ref={associatesSliderRef}>
              <Slider
                {...settings}
                className="carrusel"
                slidesToShow={getSlides(5, 3, 2)}
                onInit={() => setTimeout(syncAssociatesSliderAccessibility, 0)}
                onReInit={() => setTimeout(syncAssociatesSliderAccessibility, 0)}
                afterChange={() => syncAssociatesSliderAccessibility()}
              >
                {asociados.map((item, idx) => {
                  const imgUrl = item.logo_url ? getLogoUrl(item.logo_url) : null;
                  const agencyProfile = usersMap[item.type] || item.type;
                  return (
                    <div key={item._id || idx} className="items logos d-flex justify-content-center">
                      {imgUrl ? (
                        <Link to={getAgencyProfilePath(agencyProfile)}>
                          <img src={imgUrl} alt={item.name || 'Asociado'} className="rounded-circle border" style={{ width: "clamp(120px, 20vw, 150px)", height: 'clamp(120px, 20vw, 150px)', objectFit: 'cover' }} />
                        </Link>
                      ) : (
                        <Link to={getAgencyProfilePath(agencyProfile)}>
                          <div className="d-flex align-items-center justify-content-center bg-light" style={{ width: "clamp(120px, 20vw, 150px)", height: 'clamp(120px, 20vw, 150px)', borderRadius: '8px' }}>
                            <i className="fa-solid fa-image fs-1 text-muted"></i>
                          </div>
                        </Link>
                      )}
                    </div>
                  );
                })}
              </Slider>
              </div>
            </div>
          </Container>
        )}

      </div>

      <div className='section-5' id="explora-ubicacion" style={{ marginTop: 'clamp(5rem, 10vw, 8rem)'}}>
        <Container>
          <div className="d-flex justify-content-between flex-column flex-xl-row align-items-xl-center gap-3 gap-xl-0">
            <div className='lh-sm'>
              <div style={{ fontSize: 'clamp(36px, 6vw, 84px)', fontFamily: 'AppleGaramond' }}>
                <FormattedMessage id="home.text20" />
              </div>
              <div className="mt-3" style={{ fontSize: 'clamp(16px, 3vw, 28px)' }}>
                <FormattedMessage id="home.text21" />
              </div>
            </div>
            <Link to="/propiedades" className='link-more-black align-items-center gap-2 d-none d-lg-flex'><FormattedMessage id="home.text22" /> <i className="fa-solid fa-angle-right"></i></Link>
          </div>
          {/* <div className="d-none d-lg-flex justify-content-lg-end">
            <a href="#" className='link-more-black d-flex align-items-center gap-2'>Ver todas las ubiaciones <i className="fa-solid fa-angle-right"></i></a>
          </div> */}

          <div className="row mt-4 g-4">
            {locationConfigs.map((config, index) => {
              const count = locationCounts[index];
              // Determinar clases de orden responsivo
              let orderClasses = '';
              if (index === 1) orderClasses = 'order-3 order-lg-2';
              else if (index === 2) orderClasses = 'order-5 order-md-3';
              else if (index === 3) orderClasses = 'order-2 order-lg-4';
              else if (index === 4) orderClasses = 'order-4 order-lg-5';

              // Determinar si es col-lg-4 o col-lg-6
              const colClass = index < 3 ? 'col-lg-4' : 'col-lg-6';

              return (
                <div key={config.id} className={`${colClass} ${orderClasses}`}>
                  <Link
                    to="/propiedades"
                    state={{ ...config.filters, fromLocationSection: true }}
                    className="position-relative overflow-hidden zoom-in d-block text-decoration-none text-white"
                  >
                    <img src={config.img} className="w-100 object-fit-cover" alt={config.alt} style={{ height: index < 3 ? 'min(596px, 60vw)' : 'min(333px, 50vw)' }} />
                    <div className="position-absolute w-100 h-100 top-0 start-0 pt-5 text-white">
                      <div style={{ backgroundColor: '#000000cf', width: 'fit-content' }} className="px-4 py-1">
                        <div className="fs-5">{config.label}</div>
                        <div>{count} <FormattedMessage id={count === 1 ? "home.text16_singular" : "home.text16"} /></div>
                      </div>
                    </div>
                  </Link>
                </div>
              );
            })}
          </div>
        </Container>
      </div>

      <div className='section-6' style={{ marginTop: 'clamp(5rem, 10vw, 6rem)'}}>

        <Container className="mb-4 mb-lg-0">
          <div className='lh-sm'>
            <div className="lh-1" style={{ fontSize: 'clamp(36px, 6vw, 84px)', fontFamily: 'AppleGaramond' }}>
              <FormattedMessage id="home.text23" />
            </div>
            <div className="mt-3" style={{ fontSize: 'clamp(16px, 4vw, 28px)' }}>
              <FormattedMessage id="home.text24" />
            </div>
          </div>
        </Container>

        <div className="unete mt-5 position-relative d-none d-lg-block">
          <div className="position-absolute w-100 top-50 translate-middle-y start-0 text-white">
            <Container>
              <div style={{ backgroundColor: '#000000d4', width: 'clamp(100px, 32vw, 290px)' }} className="text-white p-4">
                <div className="mb-2"><img src={dwhite} alt="Diamon" style={{ width: '35px' }} srcSet="" /></div>
                <FormattedMessage id="home.text25" />
                <div className="mt-4 d-flex justify-content-center">
                  <Link to={ user ? '/propiedades' : '/login' } className="link-more-white d-flex align-items-center gap-2" style={{ fontSize: '16px' }}><FormattedMessage id="home.text26" /></Link>
                </div>
              </div>
            </Container>
          </div>
        </div>

        <div className="d-block d-lg-none">
            <div className="unete-movil"></div>
            <Container>
              <div style={{ backgroundColor: '#000000d4' }} className="text-white p-4 mt-5">
                <div className="mb-2"><img src={dwhite} alt="Diamon" style={{ width: '35px' }} srcSet="" /></div>
                <FormattedMessage id="home.text25" />
                <div className="mt-4 d-flex justify-content-center">
                  <a href="#" className="link-more-white d-flex align-items-center gap-2" style={{ fontSize: '16px' }}><FormattedMessage id="home.text26" /></a>
                </div>
              </div>
            </Container>
        </div>
        
        <div className="text-center" style={{ marginTop: 'clamp(3rem, 10vw, 4rem)' }}>
          <Container>
            <div className="lh-1 text-start text-lg-center m-lg-auto col-12 col-md-9" style={{ fontSize: 'clamp(36px, 6vw, 84px)', fontFamily: 'AppleGaramond' }}><FormattedMessage id="home.text27" /></div>
          </Container>
          <div className="lh-1 d-flex justify-content-center align-items-center gap-2 gap-lg-4" style={{ fontSize: 'clamp(20px, 6vw, 52px)', fontFamily: 'AppleGaramond', marginTop: 'clamp(2rem, 10vw, 4rem)' }}>
            <div><FormattedMessage id="home.text28" /></div>
            <div style={{ fontSize: 'clamp(6px, 1vw, 10px)', color: 'rgb(255, 177, 2)' }}><i className="fa-solid fa-circle"></i></div>
            <div><FormattedMessage id="home.text29" /></div>
            <div style={{ fontSize: 'clamp(6px, 1vw, 10px)', color: 'rgb(255, 177, 2)' }}><i className="fa-solid fa-circle"></i></div>
            <div><FormattedMessage id="home.text30" /></div>
          </div>
        </div>
      </div>

      <Contactanos />
    </>
    

  );
}

export default Home;
