import { useState, useEffect, useContext } from 'react';
import { Container, Nav } from 'react-bootstrap';
import { NavLink, Link } from 'react-router-dom';
import logoW from '../../assets/images/logos/logo_blanco.png';
import logoB from '../../assets/images/logos/logo_negro.png';
import SearchBar from '../searchbar';
import Boxlogin from '../boxLogin';
import SideMenu from '../sideMenu';

//import { getCurrentUser, logout, isAuthenticated, processGoogleToken, API_URL } from '../../services/authService';
import { FormattedMessage } from 'react-intl';

function HomeMenu() {

  const [isSticky, setIsSticky] = useState(false);

  // Efecto para el scroll sticky
  useEffect(() => {
    const handleScroll = () => {
      setIsSticky(window.scrollY > 100);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
  const currentLogo = isSticky ? logoB : logoW;

  const upTopPage = () =>{
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    })
  }

  return (
    <div className="home-container">
      
      {/* MENÚ PRINCIPAL - Se comporta diferente según isSticky */}
      <div className={`menu-fixed ${isSticky ? 'menu-sticky' : 'menu-overlay'}`}>
        <Container>
          {/* VERSIÓN DESKTOP */}
          <div className='d-none d-lg-flex justify-content-between align-items-center py-lg-2 py-xl-4'>

            <img src={currentLogo} alt="Logo" className="img-fluid" style={{ maxWidth: 'clamp(120px, 10vw, 200px)', cursor: 'pointer' }} onClick={upTopPage} />
            
            <Nav className='d-flex gap-lg-0 gap-xl-2 align-items-center' style={{ fontSize: 'clamp(10px, 1vw, 14px)' }}>
              <Nav.Link as={NavLink} to="propiedades"><FormattedMessage id='link.text1' /></Nav.Link>
              {/* <Nav.Link as={NavLink} to="arquitectos"><FormattedMessage id='link.text2' /></Nav.Link> */}
              {/* <Nav.Link as={NavLink} to="/proyectos"><FormattedMessage id='link.text3' /></Nav.Link> */}
              <Nav.Link as={NavLink} to="/agentes"><FormattedMessage id='link.text4' /></Nav.Link>
              <Nav.Link as={NavLink} to="/asociados"><FormattedMessage id='link.text5' /></Nav.Link>
              <Nav.Link as={NavLink} to="precios"><FormattedMessage id='link.text6' /></Nav.Link>
              <Nav.Link as={NavLink} to="/blog" target="_blank" rel="noreferrer">BLOG</Nav.Link>
              
              <Boxlogin />
            </Nav>
          </div>
          
          {/* VERSIÓN MÓVIL */}
          <div className="d-flex d-lg-none justify-content-between align-items-center py-3">
            <img src={currentLogo} alt="Logo" className="img-fluid" style={{ maxWidth: '120px' }} onClick={upTopPage} />
            <SideMenu />
          </div>
        </Container>
      </div>

      {/* BANNER CON IMAGEN DE FONDO */}
      <div className="banner">
        {/* VERSIÓN DESKTOP DEL CONTENIDO DEL BANNER */}
        <Container className='d-none d-xl-block'>
          <div style={{ marginTop: 'clamp(2rem, 25vh, 20rem)' }}>
            <div style={{ fontSize: '28px' }} className='mb-3 text-white fw-light'>
              <FormattedMessage id='bannerhome.text1' />
            </div>
            <div style={{ fontSize: '90px', fontFamily: 'AppleGaramond', whiteSpace: 'pre-line' }} className='lh-1 text-white'>
              <FormattedMessage id='bannerhome.text2' />
            </div>
          </div>
          <div style={{ marginTop: 'clamp(2rem, 10vw, 6rem)' }}>
            <div style={{ fontSize: '24px' }} className='lh-1 text-white d-flex align-items-center gap-2 fw-light'>
              <i className="fa-solid fa-magnifying-glass"></i> <FormattedMessage id='bannerhome.text3' />
            </div>
            <SearchBar />
          </div>
        </Container>

        {/* VERSIÓN MÓVIL DEL CONTENIDO DEL BANNER */}
        <Container className='d-block d-xl-none'>
          <div style={{ marginTop: 'clamp(9rem, 6vw, 30rem)' }}>
            <div style={{ fontSize: 'clamp(18px, 5vw, 34px)' }} className='mb-3 text-white'>
              <FormattedMessage id='bannerhome.text1' />
            </div>
            <div style={{ fontSize: 'clamp(40px, 8.5vw, 70px)', fontFamily: 'AppleGaramond' }} className='lh-1 text-white'>
              <FormattedMessage id='bannerhome.text2' />
            </div>
          </div>
          <div style={{ marginTop: 'clamp(3rem, 10vw, 4rem)' }}>
            <div style={{ fontSize: '16px' }} className='lh-1 text-white d-flex align-items-center gap-2 fw-light'>
              <i className="fa-solid fa-magnifying-glass"></i> <FormattedMessage id='bannerhome.text3' />
            </div>
            <SearchBar />
          </div>
        </Container>
      </div>

    </div>
  );
}

export default HomeMenu;