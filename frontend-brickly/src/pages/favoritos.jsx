import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Container } from 'react-bootstrap';
import { FormattedMessage } from 'react-intl';

import alquiler from '../assets/images/iconos/alquiler.png';
import venta from '../assets/images/iconos/venta.png';
import space from '../assets/images/iconos/spaces.png';
import diamond from '../assets/images/iconos/diamond.png';
import noLike from '../assets/images/iconos/noLike.png';
import like from '../assets/images/iconos/Like.png';
import avatar from '../assets/images/iconos/avatar.png';

import { API_URL } from '../services/authService';
import { toggleFavorite, getFavorites } from '../services/favoritesService';
import { useCurrency } from '../context/CurrencyContext';
import { getDisplayPrice } from '../utils/priceUtils';
import { getPropertyPath } from '../utils/propertyRoutes';

import '../assets/css/favoritos.css';

function Favoritos() {
    //const { currency } = useCurrency();
    const URL = API_URL;

    const [favoritos, setFavoritos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filtro, setFiltro] = useState('Todos');

    const { currency: currencyMode } = useCurrency();

    const formatPrice = (value, currency) => {
      const num = parseFloat(value) || 0;
      if (currency === 'GTQ') {
        return 'Q ' + new Intl.NumberFormat('es-GT', { minimumFractionDigits: 0 }).format(num);
      }
      return '$ ' + new Intl.NumberFormat('en-US', { minimumFractionDigits: 0 }).format(num);
    };

    useEffect(() => {
        const load = async () => {
            try {
                const data = await getFavorites();
                setFavoritos(data);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    const handleToggle = async (propertyId) => {
        const result = await toggleFavorite(propertyId);
        if (result !== null && !result.favorite) {
            setFavoritos(prev => prev.filter(p => p._id !== propertyId));
        }
    };

    const filtrados = favoritos.filter(p =>
        filtro === 'Todos' ? true : p.market?.mode === filtro
    );

    const countVenta = favoritos.filter(p => p.market?.mode === 'Venta').length;
    const countAlquiler = favoritos.filter(p => p.market?.mode === 'Alquiler').length;

    const linkStyle = (mode) => ({
        cursor: 'pointer',
        color: 'inherit',
        textDecoration: filtro === mode ? 'underline' : 'none',
        textUnderlineOffset: '4px',
        fontWeight: filtro === mode ? '600' : '400',
    });

    return (
        <Container>
            <div className='mt-5'>
                <div style={{ fontSize: 'clamp(24px, 3vw, 50px)' }} className='mb-4'>
                    <FormattedMessage id='favorite.text1' />
                </div>
                <div className="d-flex align-items-center gap-4 gap-md-5 links">
                    <span style={linkStyle('Todos')} onClick={() => setFiltro('Todos')}>
                        <FormattedMessage id='favorite.text2' /> ({favoritos.length})
                    </span>
                    <span style={linkStyle('Alquiler')} className='d-flex align-items-center gap-2' onClick={() => setFiltro('Alquiler')}>
                        <img src={alquiler} alt="alquiler" style={{ width: '20px' }} />
                        <FormattedMessage id='favorite.text3' /> ({countAlquiler})
                    </span>
                    <span style={linkStyle('Venta')} className='d-flex align-items-center gap-2' onClick={() => setFiltro('Venta')}>
                        <img src={venta} alt="venta" style={{ width: '20px' }} />
                        <FormattedMessage id='favorite.text4' /> ({countVenta})
                    </span>
                </div>

                <div className="row gx-5 mt-5" style={{ marginBottom: 'clamp(5rem, 10vw, 9rem)' }}>
                    <div className="col-12">
                {loading ? (
                            <div className="text-center py-5">
                                <div className="d-flex flex-column gap-3" style={{ maxWidth: '400px', margin: '0 auto' }}>
                                    <div className="placeholder-glow d-flex gap-3">
                                        <div className="placeholder col-4 bg-secondary" style={{ aspectRatio: '4 / 4', borderRadius: '4px' }}></div>
                                        <div className="d-flex flex-column gap-2 flex-grow-1">
                                            <p className="placeholder col-12 rounded-1" style={{ height: '24px' }}></p>
                                            <p className="placeholder col-8 rounded-1" style={{ height: '16px' }}></p>
                                            <p className="placeholder col-6 rounded-1" style={{ height: '16px' }}></p>
                                            <p className="placeholder col-10 rounded-1" style={{ height: '16px' }}></p>
                                        </div>
                                    </div>
                                    <div className="placeholder-glow d-flex gap-3">
                                        <div className="placeholder col-4 bg-secondary" style={{ aspectRatio: '4 / 4', borderRadius: '4px' }}></div>
                                        <div className="d-flex flex-column gap-2 flex-grow-1">
                                            <p className="placeholder col-12 rounded-1" style={{ height: '24px' }}></p>
                                            <p className="placeholder col-8 rounded-1" style={{ height: '16px' }}></p>
                                            <p className="placeholder col-6 rounded-1" style={{ height: '16px' }}></p>
                                            <p className="placeholder col-10 rounded-1" style={{ height: '16px' }}></p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : filtrados.length === 0 ? (
                            <div className="py-5 text-muted">No hay propiedades favoritas</div>
                        ) : (
                            <div className="row gy-5">
                                {filtrados.map(item => (
                                    <div key={item._id} className="col-md-3">
                                        <div className="position-relative d-block">
                                            <Link to={getPropertyPath(item)} className="d-block propiedades-zoom">
                                                <img
                                                    src={URL + '/' + item.media?.photos?.[0]?.path}
                                                    className="object-fit-cover w-100 border-radius-1"
                                                    alt={item.market?.title}
                                                    style={{ aspectRatio: '4 / 4' }}
                                                    loading="lazy"
                                                />
                                                <div style={{ padding: '5%' }} className='position-absolute top-0 w-100 h-100 d-flex flex-column justify-content-between'>
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
                                                        <div className={`favorite-icon like`} style={{ cursor: 'pointer' }} onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleToggle(item._id); }}>
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
                                ))}
                            </div>
                        )}
                    </div>
                    {/* <div className="col-xl-5 mt-5 mt--0">
                        <div className='p-4 rounded-1' style={{ background: '#FAFAFA' }}>
                            <div className='mb-4 fs-4'><FormattedMessage id='favorite.text5' /></div>
                            {[1,2,3,4,5,6].map((_, i) => (
                                <div key={i}>
                                    <div className="d-flex align-items-center gap-3">
                                        <div><img src={avatar} alt="Avatar" style={{ width: '60px' }} /></div>
                                        <div className='w-100 overflow-hidden'>
                                            <div className='d-flex justify-content-between align-items-center'>
                                                <div>Camila Pezzarosi</div>
                                                <div className="d-flex align-items-center gap-2" style={{ fontSize: '15px' }}>04/02 <span>14:11</span></div>
                                            </div>
                                            <div className='text-truncate' style={{ fontSize: '16px' }}>
                                                El mantenimiento es mensual incluye
                                            </div>
                                        </div>
                                    </div>
                                    {i < 5 && <hr className='my-4' />}
                                </div>
                            ))}
                        </div>
                    </div> */}
                </div>
            </div>
        </Container>
    );
}

export default Favoritos;
