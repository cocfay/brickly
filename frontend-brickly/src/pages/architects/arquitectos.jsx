import { useEffect, useState, useMemo } from 'react';
import { Container, Row, Col, Card, Button } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { FormattedMessage, useIntl } from 'react-intl';
import { getArchitectsWithProjects } from '../../services/listUsers';
import { getLogoUrl } from '../../services/logoService';
import { getArchitectProfilePath } from '../../utils/profileRoutes';

import '../../assets/css/arquitectos.css'
import bannerPrimary from '../../assets/images/imagenes_de_fondo/banner_home_arq.webp'
import bannerSecond from '../../assets/images/imagenes_de_fondo/Banner_separador.webp'
import bannerThird from '../../assets/images/imagenes_de_fondo/banner_portafolio.webp'
import bannerPMovil from '../../assets/images/imagenes_de_fondo/banner_home_arq_movil.webp'
import bannerSMovil from '../../assets/images/imagenes_de_fondo/banner_separador_movil.webp'
import bannerTMovil from '../../assets/images/imagenes_de_fondo/banner_portafolio_mov.webp'
import casa1 from '../../assets/images/imagenes_de_casas/Casa1.webp'
import casa2 from '../../assets/images/imagenes_de_casas/Casa2.webp'
import casa3 from '../../assets/images/imagenes_de_casas/Casa3.webp'
import alejandro from '../../assets/images/iconos/3.png'
import regina from '../../assets/images/iconos/2.png'
import pablo from '../../assets/images/iconos/1.png'

function Arquitectos() {
    const [arquitectos, setArquitectos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedCategoria, setSelectedCategoria] = useState(null);
    const intl = useIntl();
    const cardImages = [casa1, casa2, casa3, casa1, casa2, casa3];

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            const architects = await getArchitectsWithProjects();
            setArquitectos(architects);
            setLoading(false);
        };
        load();
    }, []);

    // Extraer categorías únicas de todos los arquitectos
    const categorias = useMemo(() => {
        const cats = new Set();
        arquitectos.forEach(arq => {
            if (Array.isArray(arq.agentInfo?.categoria)) {
                arq.agentInfo.categoria.forEach(c => cats.add(c));
            }
        });
        return Array.from(cats).sort();
    }, [arquitectos]);

    // Arquitectos filtrados por categoría seleccionada
    const arquitectosFiltrados = useMemo(() => {
        if (!selectedCategoria) return arquitectos;
        return arquitectos.filter(arq =>
            Array.isArray(arq.agentInfo?.categoria) &&
            arq.agentInfo.categoria.includes(selectedCategoria)
        );
    }, [arquitectos, selectedCategoria]);

    const getImageSrc = (path) => {
        if (!path || path === '') return null;
        return path.startsWith('http') ? path : getLogoUrl(path);
    };

    return (
        <>
            <div className="position-relative">
                <img src={bannerPrimary} alt="banner" className='w-100 object-fit-cover d-none d-xl-block' style={{ height: '50vh' }} />
                <img src={bannerPMovil} alt="banner" className='w-100 object-fit-cover d-block d-xl-none' style={{ height: '50vh' }} />
                <div className="position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center ">
                    <Container className='text-white'>
                        <div className='fw-light' style={{ fontSize: 'clamp(16px, 3vw, 24px)' }}><FormattedMessage id='architects.text1' /></div>
                        <div className='mt-3 mt-lg-0' style={{ fontSize: 'clamp(46px, 6.5vw, 110px)', fontFamily: 'AppleGaramond' }}><FormattedMessage id='architects.text2' /></div>
                        <div className='fw-light' style={{ fontSize: 'clamp(16px, 3vw, 28px)' }}><FormattedMessage id='architects.text3' /></div>
                    </Container>
                </div>
            </div>
        
            <div>
                <Container style={{ marginTop: 'clamp(2rem, 3vw, 4rem)', marginBottom: 'clamp(2rem, 5vw, 5rem)' }}>
                    <div style={{ fontSize: 'clamp(36px, 5vw, 80px)', fontFamily: 'AppleGaramond' }}>
                        <FormattedMessage id='architects.text4' />
                    </div>
                </Container>

                <div className="container-fluid p-0 mt-4">
                    <Row className='g-0 align-items-center'>
                    <Col md={6} className='bleed-left-content pe-lg-4 order-1 col-lg-6'>
                            <div className='text-body'>
                                <div className="d-flex align-items-center gap-2">
                                    <img src={alejandro} alt="imagen" className='rounded-circle' style={{ width: '95px' }} />
                                    <div>
                                        <div className='text-body' style={{ fontSize: 'clamp(24px, 3.5vw, 40px)'}}>Alejandro Monzón</div>
                                        <div className='text-muted' style={{ fontSize: 'clamp(14px, 3.5vw, 24px)'}}>MONZÓN + ASOCIADOS</div>
                                    </div>
                                </div>
                                <div className='mt-3 mt-lg-5 fst-italic lh-sm text-muted' style={{ fontSize: 'clamp(16px, 3.5vw, 24px)' }}>
                                    "La arquitectura debe dialogar con el paisaje sin competir con él. Buscamos que cada línea, cada sombra, responda a la topografía y la luz de su entorno. No imponemos formas; las encontramos."
                                </div>
                                <div className='d-flex mt-4 gap-3 mb-5 flex-wrap'>
                                    <div className='border py-1 px-3 rounded-1' style={{ fontSize: 'clamp(16px, 3vw, 18px)', color: '#5D5B5A', backgroundColor: '#FAFAFA' }}>MODERNO</div>
                                    <div className='border py-1 px-3 rounded-1' style={{ fontSize: 'clamp(16px, 3vw, 18px)', color: '#5D5B5A', backgroundColor: '#FAFAFA' }}>MINIMALISTA</div>
                                    <div className='border py-1 px-3 rounded-1' style={{ fontSize: 'clamp(16px, 3vw, 18px)', color: '#5D5B5A', backgroundColor: '#FAFAFA' }}>GEOMÉTRICO</div>
                                </div>
                                <div className="text-dark d-flex align-items-center" style={{ fontSize: 'clamp(18px, 3.5vw, 28px)' }}><FormattedMessage id='architects.text5' /> <i className="fa-solid fa-angle-right ms-2" style={{ fontSize: 'clamp(16px, 3vw, 18px)' }}></i></div>
                            </div>
                        </Col>    
                        <Col md={6} className='order-2 col-lg-6'>
                            <div className='d-block text-body position-relative vintage'>
                                <img src={casa1} alt="banner" className='w-100 object-fit-cover' />
                                <div className="position-absolute start-0 bottom-0 w-100">
                                    <div className='bg-dark text-white py-1 px-3 d-flex gap-3 align-items-baseline' style={{ fontSize: 'clamp(14px, 3vw, 20px)' }}>Residencia Montecristo <span>-</span> <span style={{ fontSize: 'clamp(12px, 3vw, 16px)' }}>Zona 16 Guatemala</span></div>
                                </div>
                            </div>
                        </Col>
                        <Col md={6} className='order-4 order-md-3'>
                            <div className='d-block text-body position-relative vintage'>
                                <img src={casa2} alt="banner" className='w-100 object-fit-cover' />
                                <div className="position-absolute start-0 bottom-0 w-100">
                                    <div className='bg-dark text-white py-1 px-3 d-flex gap-3 align-items-baseline' style={{ fontSize: 'clamp(14px, 3vw, 20px)' }}>Casa Palo Verde <span>-</span> <span style={{ fontSize: 'clamp(12px, 3vw, 16px)' }}>Zona 15 Guatemala</span></div>
                                </div>
                            </div>
                        </Col>    
                        <Col md={6} className='order-3 order-md-4 bleed-right-content ps-lg-4 mt-4 mt-md-0'>
                            <div className='text-body'>
                                <div className="d-flex align-items-center gap-2">
                                    <img src={regina} alt="imagen" className='rounded-circle' style={{ width: '95px' }} />
                                    <div>
                                        <div className='text-body' style={{ fontSize: 'clamp(24px, 3.5vw, 40px)'}}>Regina Cofiño</div>
                                        <div className='text-muted' style={{ fontSize: 'clamp(14px, 3.5vw, 24px)'}}>COFIÑO ESTUDIO</div>
                                    </div>
                                </div>
                                <div className='mt-3 mt-lg-5 fst-italic lh-sm text-muted' style={{ fontSize: 'clamp(16px, 3.5vw, 24px)' }}>
                                    "Diseñamos para que el interior y el exterior se desvanezcan. La piedra, la madera y el agua no son materiales decorativos: son la estructura misma de la experiencia de habitar".
                                </div>
                                <div className='d-flex mt-4 gap-3 mb-5 flex-wrap'>
                                    <div className='border py-1 px-3 rounded-1' style={{ fontSize: 'clamp(16px, 3vw, 18px)', color: '#5D5B5A', backgroundColor: '#FAFAFA' }}>ÓRGANICO</div>
                                    <div className='border py-1 px-3 rounded-1' style={{ fontSize: 'clamp(16px, 3vw, 18px)', color: '#5D5B5A', backgroundColor: '#FAFAFA' }}>SOSTENIBLE</div>
                                    <div className='border py-1 px-3 rounded-1' style={{ fontSize: 'clamp(16px, 3vw, 18px)', color: '#5D5B5A', backgroundColor: '#FAFAFA' }}>TROPICAL</div>
                                </div>
                                <div className="text-dark d-flex align-items-center" style={{ fontSize: 'clamp(18px, 3.5vw, 28px)' }}><FormattedMessage id='architects.text5' /> <i className="fa-solid fa-angle-right ms-2" style={{ fontSize: 'clamp(16px, 3vw, 18px)' }}></i></div>
                            </div>
                        </Col>
                        <Col md={6} className='bleed-left-content pe-lg-4 order-5 mt-4 mt-md-0'>
                            <div className='text-body'>
                                <div className="d-flex align-items-center gap-2">
                                    <img src={pablo} alt="imagen" className='rounded-circle' style={{ width: '95px' }} />
                                    <div>
                                        <div className='text-body' style={{ fontSize: 'clamp(24px, 3.5vw, 40px)'}}>Pablo de la Roca</div>
                                        <div className='text-muted' style={{ fontSize: 'clamp(14px, 3.5vw, 24px)'}}>DE LA ROCA ARQUITECTURA</div>
                                    </div>
                                </div>
                                <div className='mt-3 mt-lg-5 fst-italic lh-sm text-muted' style={{ fontSize: 'clamp(16px, 3.5vw, 24px)' }}>
                                    "Creemos en la belleza de lo esencial. Volúmenes puros, materiales honestos, luz contenida. Una casa no debe gritar; debe invitar al silencio y a la contemplación."
                                </div>
                                <div className='d-flex mt-4 gap-3 mb-5 flex-wrap'>
                                    <div className='border py-1 px-3 rounded-1' style={{ fontSize: 'clamp(16px, 3vw, 18px)', color: '#5D5B5A', backgroundColor: '#FAFAFA' }}>BRUTALISTA</div>
                                    <div className='border py-1 px-3 rounded-1' style={{ fontSize: 'clamp(16px, 3vw, 18px)', color: '#5D5B5A', backgroundColor: '#FAFAFA' }}>MINIMALISTA</div>
                                    <div className='border py-1 px-3 rounded-1' style={{ fontSize: 'clamp(16px, 3vw, 18px)', color: '#5D5B5A', backgroundColor: '#FAFAFA' }}>ATEMPORAL</div>
                                </div>
                                <div className="text-dark d-flex align-items-center" style={{ fontSize: 'clamp(18px, 3.5vw, 28px)' }}><FormattedMessage id='architects.text5' /> <i className="fa-solid fa-angle-right ms-2" style={{ fontSize: 'clamp(16px, 3vw, 18px)' }}></i></div>
                            </div>
                        </Col>    
                        <Col md={6} className='order-last col-lg-6'>
                            <div className='d-block text-body position-relative vintage'>
                                <img src={casa3} alt="banner" className='w-100 object-fit-cover' />
                                <div className="position-absolute start-0 bottom-0 w-100">
                                    <div className='bg-dark text-white py-1 px-3 d-flex gap-3 align-items-baseline' style={{ fontSize: 'clamp(14px, 3vw, 20px)' }}>Residencia Piedra <span>-</span> <span style={{ fontSize: 'clamp(12px, 3vw, 16px)' }}>Zona 14 Guatemala</span></div>
                                </div>
                            </div>
                        </Col>  
                    </Row>
                </div>
            </div>

            <div className='position-relative' style={{ marginTop: 'clamp(6rem, 10vw, 10rem)', marginBottom: 'clamp(1rem, 3vw, 4rem)' }}>
                <img src={bannerSecond} alt="banner" className='w-100 object-fit-cover d-none d-lg-block' />
                <img src={bannerSMovil} alt="banner" className='w-100 object-fit-cover d-block d-lg-none' style={{ height: '50vh' }} />
                <div className="position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center">
                    <Container className='text-white d-flex flex-column align-items-center'>
                        <div className='fst-italic text-center' style={{ fontSize: 'clamp(28px, 4vw, 65px)' }}><FormattedMessage id='architects.text6' /></div>
                        <div className='fw-light ms-auto mt-4' style={{ fontSize: 'clamp(16px, 3vw, 28px)' }}>Santiago Calatrava</div>
                    </Container>
                </div>
            </div>

            <div>
                <Container style={{ marginTop: 'clamp(4rem, 5vw, 5rem)', marginBottom: 'clamp(2rem, 5vw, 5rem)' }}>
                    <div style={{ fontSize: 'clamp(36px, 5vw, 80px)', fontFamily: 'AppleGaramond' }}><FormattedMessage id='architects.text7' />
                    </div>
                    <div style={{ fontSize: 'clamp(16px, 3vw, 24px)' }}><FormattedMessage id='architects.text8' /></div>
                </Container>

                <Row className='g-0' style={{ backgroundColor: '#FAFAFA' }}>
                    {/* Primera columna */}
                    <Col lg={6} className="d-flex flex-column-reverse flex-md-column col-divider">
                        <div className="position-relative vintage">
                            <img src={casa1} alt="banner" className='w-100 object-fit-cover' />
                            <div className="position-absolute start-0 bottom-0 w-100" >
                                <div className='bg-dark text-white py-1 px-3'>
                                    <div className='d-flex gap-3 align-items-baseline' style={{ fontSize: 'clamp(14px, 3vw, 20px)' }}>
                                        Residencia Montecristo <span>-</span> <span style={{ fontSize: 'clamp(12px, 3vw, 16px)' }}>Zona 16 Guatemala</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className='bleed-left-content mt-3 mt-lg-5 d-flex flex-column flex-grow-1 pb-4 pe-4'>
                            <div className="d-flex align-items-center gap-2">
                                <img src={alejandro} alt="imagen" className='rounded-circle' style={{ width: '95px' }} />
                                <div>
                                    <div style={{ fontSize: 'clamp(24px, 3.5vw, 40px)'}}>Alejandro Monzón</div>
                                    <div className='text-muted' style={{ fontSize: 'clamp(14px, 3.5vw, 24px)'}}>MONZÓN + ASOCIADOS</div>
                                </div>
                            </div>
                            
                            <div className='mt-3 mt-lg-5 fst-italic lh-sm text-muted' style={{ fontSize: 'clamp(16px, 3.5vw, 24px)', textAlign: 'justify' }}>"La arquitectura debe dialogar con el paisaje sin competir con él. Buscamos que cada línea, cada sombra, responda a la topografía y la luz de su entorno. No imponemos formas; las encontramos."</div>
                            
                            <div className="flex-grow-1"></div>
                            
                            <div className='d-flex mt-4 gap-3 mb-5 flex-wrap'>
                                <div className='border py-1 px-3 rounded-1' style={{ fontSize: 'clamp(16px, 3vw, 18px)', color: '#5D5B5A', backgroundColor: '#FAFAFA' }}>MODERNO</div>
                                <div className='border py-1 px-3 rounded-1' style={{ fontSize: 'clamp(16px, 3vw, 18px)', color: '#5D5B5A', backgroundColor: '#FAFAFA' }}>MINIMALISTA</div>
                                <div className='border py-1 px-3 rounded-1' style={{ fontSize: 'clamp(16px, 3vw, 18px)', color: '#5D5B5A', backgroundColor: '#FAFAFA' }}>GEOMÉTRICO</div>
                            </div>
                            
                            <div className="text-dark d-flex align-items-center justify-content-center" style={{ fontSize: 'clamp(18px, 3.5vw, 28px)' }} >
                                <FormattedMessage id='architects.text5' /> <i className="fa-solid fa-angle-right ms-2 " style={{ fontSize: 'clamp(16px, 3vw, 18px)' }}></i>
                            </div>
                        </div>
                    </Col>

                    {/* Segunda columna */}
                    <Col lg={6} className="d-flex flex-column-reverse flex-md-column">
                        <div className="position-relative vintage">
                            <img src={casa3} alt="banner" className='w-100 object-fit-cover' />
                            <div className="position-absolute start-0 bottom-0 w-100">
                                <div className='bg-dark text-white py-1 px-3'>
                                    <div className='d-flex gap-3 align-items-baseline' style={{ fontSize: 'clamp(14px, 3vw, 20px)' }}>
                                        Residencia Piedra <span>-</span> <span style={{ fontSize: 'clamp(12px, 3vw, 16px)' }}>Zona 14 Guatemala</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className='bleed-right-content mt-4 mt-lg-5 d-flex flex-column flex-grow-1 pb-4 ps-4 '>
                            <div className="d-flex align-items-center gap-2">
                                <img src={pablo} alt="imagen" className='rounded-circle' style={{ width: '95px' }} />
                                <div>
                                    <div style={{ fontSize: 'clamp(24px, 3.5vw, 40px)'}}>Pablo de la Roca</div>
                                    <div className='text-muted' style={{ fontSize: 'clamp(14px, 3.5vw, 24px)'}}>DE LA ROCA ARQUITECTURA</div>
                                </div>
                            </div>
                            
                            <div className='mt-3 mt-lg-5 fst-italic lh-sm text-muted' style={{ fontSize: 'clamp(16px, 3.5vw, 24px)', textAlign: 'justify' }}>
                            "Creemos en la belleza de lo esencial. Volúmenes puros, materiales honestos, luz contenida. Una casa no debe gritar; debe invitar al silencio y a la contemplación."
                            </div>
                            
                            <div className="flex-grow-1"></div>
                            
                            <div className='d-flex mt-4 gap-3 mb-5 flex-wrap'>
                                <div className='border py-1 px-3 rounded-1' style={{ fontSize: 'clamp(16px, 3vw, 18px)', color: '#5D5B5A', backgroundColor: '#FAFAFA' }}>BRUTALISTA</div>
                                <div className='border py-1 px-3 rounded-1' style={{ fontSize: 'clamp(16px, 3vw, 18px)', color: '#5D5B5A', backgroundColor: '#FAFAFA' }}>MINIMALISTA</div>
                                <div className='border py-1 px-3 rounded-1' style={{ fontSize: 'clamp(16px, 3vw, 18px)', color: '#5D5B5A', backgroundColor: '#FAFAFA' }}>ATEMPORAL</div>
                            </div>
                            
                            <div className="text-dark d-flex align-items-center justify-content-center" style={{ fontSize: 'clamp(18px, 3.5vw, 28px)' }} >
                            <FormattedMessage id='architects.text5' /> <i className="fa-solid fa-angle-right ms-2" style={{ fontSize: 'clamp(16px, 3vw, 18px)' }}></i>
                            </div>
                        </div>
                    </Col>
                </Row>
            </div>

            <div>
                <Container style={{ marginTop: 'clamp(4rem, 5vw, 5rem)', marginBottom: 'clamp(2rem, 5vw, 5rem)' }}>
                    <div style={{ fontSize: 'clamp(36px, 5vw, 80px)', fontFamily: 'AppleGaramond' }}><FormattedMessage id='architects.text9' /></div>
                    <div style={{ fontSize: 'clamp(16px, 3vw, 24px)' }}><FormattedMessage id='architects.text10' /></div>

                    <div className="d-flex gap-3 align-items-center justify-content-center justify-content-md-start flex-wrap mt-5">
                        {categorias.map(cat => (
                            <div
                                key={cat}
                                onClick={() => setSelectedCategoria(selectedCategoria === cat ? null : cat)}
                                className='border py-1 px-3 rounded-1'
                                style={{
                                    fontSize: 'clamp(16px, 3vw, 18px)',
                                    color: selectedCategoria === cat ? '#fff' : '#5D5B5A',
                                    backgroundColor: selectedCategoria === cat ? '#000' : '#FAFAFA',
                                    width: 'fit-content',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease'
                                }}
                            >
                                {intl.formatMessage({ id: `categoria.${cat}` })}
                            </div>
                        ))}
                    </div>

                    {/* Cards de arquitectos - datos dinámicos desde API */}
                    {loading ? (
                        <div className="text-center py-5">
                            <div className="spinner-border text-primary" />
                            <p className="mt-3">Cargando arquitectos...</p>
                        </div>
                    ) : (
                        <Row className='gy-5 gx-5 justify-content-start mt-0 mt-lg-5'>
                            {arquitectosFiltrados.length > 0 ? (
                                arquitectosFiltrados.slice(0, 6).map((arq, idx) => (
                                    <Col key={arq._id || idx} xl={4} md={6}>
                                        <Link to={getArchitectProfilePath(arq)}>
                                            <Card className='rounded-1'>
                                                <Card.Img 
                                                    variant="top" 
                                                    src={getImageSrc(arq.agentInfo?.favoriteProject)} 
                                                    className='object-fit-cover' 
                                                    style={{ height: '380px' }} 
                                                />
                                                <Card.Body className='mt-3 pb-4'>
                                                    <Card.Title className='d-flex align-items-center flex-column gap-1'>
                                                        <div style={{ fontSize: 'clamp(24px, 3.5vw, 34px)'}}>
                                                            {arq.name || 'Arquitecto'}
                                                        </div>
                                                        <div className='text-muted text-uppercase' style={{ fontSize: 'clamp(14px, 3.5vw, 20px)'}}>
                                                            {arq.agentInfo?.signTitle || ''}
                                                        </div>
                                                    </Card.Title>
                                                    {arq.agentInfo?.shortDescription && (
                                                        <Card.Text className='text-center mt-3 fst-italic text-muted' style={{ fontFamily: 'system-ui' }}>
                                                            {arq.agentInfo.shortDescription}
                                                        </Card.Text>
                                                    )}
                                                    <div className="d-flex justify-content-center mt-5">
                                                        <Button className='bg-dark border-0 rounded-1 px-4'>
                                                            <FormattedMessage id='architects.text11' />
                                                        </Button>
                                                    </div>
                                                </Card.Body>
                                            </Card>
                                        </Link>
                                    </Col>
                                ))
                            ) : (
                                <Col xs={12}>
                                    <p className="text-center text-muted">No hay arquitectos disponibles</p>
                                </Col>
                            )}
                        </Row>
                    )}

                    <div className="text-dark d-flex align-items-center justify-content-center mt-5" style={{ fontSize: 'clamp(18px, 3.5vw, 24px)' }} >
                        <FormattedMessage id='architects.text12' /> <i className="fa-solid fa-angle-right ms-2" style={{ fontSize: 'clamp(16px, 3vw, 18px)' }}></i>
                    </div>

                </Container>
            </div>
            
            <div className='position-relative' style={{ marginTop: 'clamp(2rem, 7vw, 7rem)' }}>
                <img src={bannerThird} className='w-100 d-none d-lg-block' alt="bannerThird" />
                <img src={bannerTMovil} alt="banner" className='w-100 object-fit-cover d-block d-lg-none' />
                <div className="position-absolute top-0 start-0 w-100 h-100">
                    <Container className='d-flex flex-column mt-5'>
                        <div className='' style={{ fontSize: 'clamp(48px, 4.8vw, 80px)', fontFamily: 'AppleGaramond' }}><FormattedMessage id='architects.text13' /></div>
                        <div className='' style={{ fontSize: 'clamp(18px, 4vw, 34px)', width: 'min(900px, 100%)' }}><FormattedMessage id='architects.text14' /></div>
                        <div className='mt-5'>
                            <Link to="/precios" className='bg-black px-4 border-0 rounded-0 text-white py-2' style={{ fontSize: 'clamp(16px, 4vw, 24px)' }}><FormattedMessage id='architects.text15' /></Link>
                        </div>
                    </Container>
                </div>
            </div>
        </>
    );
}

export default Arquitectos;
