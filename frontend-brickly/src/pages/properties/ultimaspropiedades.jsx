import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Container } from 'react-bootstrap';
import { FormattedMessage } from 'react-intl';
import { useCurrency } from '../../context/CurrencyContext';
import { getDisplayPrice } from '../../utils/priceUtils';
import { useFavorites } from '../../hooks/useFavorites';

import diamond from '../../assets/images/iconos/diamond.png';

import alquiler from '../../assets/images/iconos/alquiler.png';
import venta from '../../assets/images/iconos/venta.png';
import space from '../../assets/images/iconos/spaces.png';

import SEO from '../../components/SEO';
import { API_URL, isAuthenticated } from '../../services/authService'; 
import { useT } from '../../hooks/useT';

import '../../assets/css/propiedades.css';

const formatPrice = (value, currency) => {
  const num = parseFloat(value) || 0;
  if (currency === 'GTQ') {
    return 'Q ' + new Intl.NumberFormat('es-GT', { minimumFractionDigits: 0 }).format(num);
  }
  return '$ ' + new Intl.NumberFormat('en-US', { minimumFractionDigits: 0 }).format(num);
};

function UltimasPropiedades() {
  const t = useT();

  const { currency: currencyMode } = useCurrency();
  const { isFavorite, toggle: toggleFav, canFavorite } = useFavorites();

  const [propiedades, setpropiedades] = useState([]);
  const [loadingShow, setloading] = useState(true);

  const URL = API_URL;

  useEffect(() => {
    const getProperties = async () => {
      try {
        // Obtener solo las primeras 21 propiedades publicadas (más rápido)
        const res = await fetch(`${API_URL}/properties?status=published&limit=21`);
        const todasPublicadasRaw = await res.json();
        // Asegurar que sea un array aunque la API devuelva objeto
        const dataArray = Array.isArray(todasPublicadasRaw) ? todasPublicadasRaw : (todasPublicadasRaw?.data || []);

        // Reconvertir: agregar priceRaw y priceUSDRaw (la API no los incluye)
        const todasPublicadas = dataArray.map(p => ({
          ...p,
          market: {
            ...p.market,
            priceRaw: p.market?.price || 0,
            priceUSDRaw: p.market?.priceUSD || 0,
          },
        }));

        setpropiedades(todasPublicadas);

      } catch (errors) {
        console.error('Error:', errors);
      } finally {
        setloading(false);
      }
    };
    getProperties();
  }, []);

  // Ordenar por updatedAt descendente (más recientes primero)
  const sortedPropiedades = [...propiedades].sort((a, b) => {
    return new Date(b.updatedAt) - new Date(a.updatedAt);
  });

  // Solo las primeras 21 propiedades
  const visiblePropiedades = sortedPropiedades.slice(0, 21);

  return (

    <>
        <SEO
          title="Últimas Propiedades"
          description="Descubre las últimas propiedades agregadas en Brickly Homes. Explora nuestra selección de propiedades en venta y alquiler en Guatemala."
          url="https://www.bricklyhomes.com/ultima-propiedades"
        />
        <Container>
      <div className="mt-3 mt-lg-5">
        <div className="d-flex align-items-center justify-content-between gap-3">
          <div style={{ fontSize: 'clamp(20px, 3vw, 28px)'}}>
            <FormattedMessage id='property.text1' />
          </div>
          
        </div>
      </div>

      {loadingShow ? (
        <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>
      ) : propiedades && propiedades.length > 0 ? (
        <div style={{ marginTop: 'clamp(2rem, 3vw, 3rem)'}}>
          <div className="row gy-5" style={{ marginBottom: 'clamp(5rem, 8vw, 7rem)' }}>
            {visiblePropiedades.map((item, index) => (
              <div className="col-md-6 col-xl-4 d-flex flex-column" key={item._id || index}>
                <Link to={`/propiedad/${item._id}`} className="position-relative d-block propiedades-zoom">
                  <img
                    src={URL + '/' + item.media?.photos[0]?.path}
                    className="object-fit-cover w-100 border-radius-1"
                    style={{ aspectRatio: '4 / 4' }}
                    alt=""
                    loading="lazy"
                  />
                  <div style={{ padding: '5%' }} className='position-absolute top-0 w-100 h-100 d-flex flex-column justify-content-between'>
                      <div className='d-flex gap-2 flex-wrap'>
                        {item.featured?.isActive ? (
                          <div className='d-flex gap-2 align-items-center rounded-4' style={{ backgroundColor: '#000000c7', color: 'white', width: 'fit-content', padding: '3px 10px', fontSize: '14px' }}>
                            <img src={diamond} style={{ width: '14px' }} alt="" /><FormattedMessage id="home.text31" />
                          </div>
                        ) : null}
                        {item.exclusive ? (
                          <div className='d-flex gap-2 align-items-center rounded-4' style={{ backgroundColor: '#000000c7', color: 'white', width: 'fit-content', padding: '3px 10px', fontSize: '14px' }}>
                            <FormattedMessage id="home.text7" />
                          </div>
                        ) : null}
                      </div>
                      <div className='d-flex justify-content-end align-items-center gap-2'>
                        <div className='rounded-4' style={{ backgroundColor: '#000000c7', color: 'white', padding: '3px 10px', fontSize: '12px' }}><FormattedMessage id="home.text8" />: { item.visitCounter } </div>
                        <div className={`favorite-icon ${isFavorite(item._id) ? 'like' : 'unlike'}` } style={{ cursor: 'pointer' }} onClick={(e) => { e.preventDefault(); if (isAuthenticated() && !canFavorite) return; const iconElement = e.currentTarget.querySelector('i'); iconElement.style.transform = 'scale(1.3)'; setTimeout(() => { iconElement.style.transform = 'scale(1)'; toggleFav(item._id); }, 200); }}>
                          <i className="fa-solid fa-heart"></i>
                        </div>
                      </div>
                  </div>
                </Link>
                <Link to={`/propiedad/${item._id}`} className="text-body">
                  <div className='mt-3 d-flex flex-column flex-grow-1'>
                    <div className='text-truncate' style={{ fontSize: 'clamp(34px, 6vw, 44px)', fontFamily: 'AppleGaramond' }}>{ item.market?.title }</div>
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
                    <div><FormattedMessage id="home.text9" />: { item.market?.type }</div>
                    { (item.layout?.bedrooms > 0 || item.layout?.bathrooms > 0 || item.layout?.parkingSpots > 0 || item.dimensions?.landM2 > 0 || item?.dimensions?.landV2 > 0) && 
                      <div className='d-flex gap-4 my-3' style={{ fontSize: '16px' }}>
                        {item.layout?.bedrooms > 0 && (
                          (item?.market?.type?.toLowerCase() === 'oficina' || item?.market?.type?.toLowerCase() === 'local comercial') && item?.layout?.totalRooms > 0 ? (
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
            ))}
          </div>
          {/* Botón "Seguir explorando" que redirige a la vista de propiedades normal */}
          <div className="d-flex justify-content-center" style={{ marginBottom: 'clamp(3rem, 6vw, 6rem)' }}>
            <Link
              to="/propiedades"
              state={{ hiddenIds: visiblePropiedades.map(p => p._id) }}
              className="link-more-black d-flex align-items-center gap-2"
              style={{ background: 'none', cursor: 'pointer', textDecoration: 'none', color: 'inherit' }}
            >
              {t('Seguir explorando', 'Keep exploring')} <i className="fa-solid fa-angle-right"></i>
            </Link>
          </div>
        </div>
      ) : (
        <div style={{ marginTop: '8rem', marginBottom: '8rem' }} className="text-center">
            <div className="fs-2 text-muted">{t('No hay propiedades disponibles', 'No properties available')}</div>
        </div>
      )}
    </Container>
    </>
  );
}

export default UltimasPropiedades;
