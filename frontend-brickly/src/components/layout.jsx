import { useEffect, useState } from 'react';
import { Outlet, useLocation, Link } from 'react-router-dom';
import Container from 'react-bootstrap/Container';

import { FormattedMessage } from 'react-intl';
import MainMenu from './menus/homeMenu';
import SimpleMenu from './menus/simpleMenu';
import GoogleAnalytics from './GoogleAnalytics';
import { API_URL, getToken, handleAuthError } from '../services/authService';
import logo from '../assets/images/logos/logo_blanco.png';
import '../assets/css/site.css';

function Layout() {
  const location = useLocation();
  
  // Rutas que usan MainMenu (con banner)
  const showMainMenu = ['/', '/home'].includes(location.pathname);

  const whatsappUrl = `https://wa.me/50237649719?text=` + encodeURIComponent('¡Hola! Estoy interesado en los paquetes de Brickly Homes. Quiero conocer opciones y contratar el ideal.')

  const [subEmail, setSubEmail]     = useState('');
  const [subLoading, setSubLoading] = useState(false);
  const [subToast, setSubToast]     = useState(false);
  const [subError, setSubError]     = useState('');
  const subscriptionInputId = 'footer-subscription-email';

  useEffect(() => {
    let cancelled = false;

    const validateSession = async () => {
      const token = getToken();
      if (!token || cancelled) return;

      try {
        const res = await fetch(`${API_URL}/users/me`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (res.status === 401 && !cancelled) {
          handleAuthError();
        }
      } catch {
        // Errores de red/servidor no deben cerrar sesión automáticamente.
      }
    };

    validateSession();
    const intervalId = setInterval(validateSession, 5 * 60 * 1000);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, []);

  const handleSubscribe = async (e) => {
    e.preventDefault();
    if (!subEmail.trim()) return;
    setSubError('');
    setSubLoading(true);
    try {
      const res = await fetch(`${API_URL}/contact/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: subEmail.trim() }),
      });
      if (!res.ok) throw new Error();
      setSubEmail('');
      setSubToast(true);
      setTimeout(() => setSubToast(false), 4000);
    } catch (error) {
      setSubError(error.message || 'Este correo ya está suscrito');
      setTimeout(() => setSubError(''), 4000);
    } finally {
      setSubLoading(false);
    }
  };

  return (
    <>
      <GoogleAnalytics />
      {showMainMenu ? <MainMenu /> : <SimpleMenu />}
      
      <main className="main mb-5" role="main">
        <Outlet />
      </main>

      <footer className='bg-dark text-white py-5'>
        <Container>
            <div className="row justify-content-between flex-column flex-xl-row gap-5 gap-xl-0">
              <div className='col-xl-3'><Link to="/"><img src={logo} alt="Logo" style={{ width: '200px' }} /></Link></div>
              <div className='col-xl-6 d-flex flex-column gap-1 gap-xl-5 text-white mt-xl-3' style={{ fontSize: '14px' }}>
                <div className="d-flex justify-content-between align-items-start flex-column flex-xl-row gap-2">
                  <Link to="/propiedades" className='text-decoration-none text-white'><FormattedMessage id='link.text1' /></Link>
                  {/* <Link to="/arquitectos" className='text-decoration-none text-white'><FormattedMessage id='link.text2' /></Link> */}
                  {/* <Link to="/proyectos" className='text-decoration-none text-white'><FormattedMessage id='link.text3' /></Link> */}
                  <Link to="/agentes" className='text-decoration-none text-white'><FormattedMessage id='link.text4' /></Link>
                  <Link to="/asociados" className='text-decoration-none text-white'><FormattedMessage id='link.text5' /></Link>
                  <Link to="/precios" className='text-decoration-none text-white'><FormattedMessage id='link.text6' /></Link>
                  <a href="https://blog.bricklyhomes.com/" target="_blank" rel="noreferrer" className='text-decoration-none text-white'>BLOG</a>
                </div>
                  <div>
                  <div className='mb-2 mt-4 mt-xl-0'><FormattedMessage id='footer.text1' /></div>
                  <form onSubmit={handleSubscribe} className='d-flex gap-2 align-items-center'>
                    <label htmlFor={subscriptionInputId} className="visually-hidden">Correo electrónico para suscribirse</label>
                    <input
                      id={subscriptionInputId}
                      type="email"
                      value={subEmail}
                      onChange={e => setSubEmail(e.target.value)}
                      className='h-100 border border-0 rounded-0 px-3 w-100'
                      placeholder='E-mail'
                      aria-describedby={subError ? 'footer-subscription-error' : undefined}
                      style={{ minHeight: '39.10px', backgroundColor: '#1a1a1a', color: 'white' }}
                      required
                    />
                    <button type="submit" className='rounded-0 px-2 px-lg-5 bg-black text-white' disabled={subLoading} aria-label="Suscribirse al boletín">
                      {subLoading
                        ? <span className="spinner-border spinner-border-sm" aria-hidden="true" />
                        : <FormattedMessage id='footer.text2' />
                      }
                    </button>
                  </form>
                  {subError && <div id="footer-subscription-error" style={{ fontSize: '12px', color: '#ff6b6b', marginTop: '6px' }}>{subError}</div>}
                </div>
              </div>
              <div className='col-xl-3 d-flex flex-column align-items-xl-end' style={{ fontSize: '12px' }}>
                <div className="d-flex align-items-center gap-3 mb-3 mt-xl-3">
                  <a href="https://www.facebook.com/profile.php?id=61588999228778" target='_blank' rel="noreferrer" className='text-decoration-none text-white' title='Facebook' aria-label="Abrir Facebook de Brickly Homes"><i className="fa-brands fa-facebook fs-5" aria-hidden="true"></i></a>
                  <a href={whatsappUrl} target='_blank' rel="noreferrer" className='text-decoration-none text-white' title='Whatsapp' aria-label="Abrir WhatsApp de Brickly Homes"><i className="fa-brands fa-whatsapp fs-5" aria-hidden="true"></i></a>
                  <a href="https://www.instagram.com/bricklyoficial/" target='_blank' rel="noreferrer" className='text-decoration-none text-white' title='Instagram' aria-label="Abrir Instagram de Brickly Homes"><i className="fa-brands fa-instagram fs-5" aria-hidden="true"></i></a>
                  <a href="https://www.linkedin.com/company/bricklygt/" target='_blank' rel="noreferrer" className='text-decoration-none text-white' title='Linkedin' aria-label="Abrir LinkedIn de Brickly Homes"><i className="fa-brands fa-linkedin fs-5" aria-hidden="true"></i></a>
                  <a href="https://www.tiktok.com/@bricklyhomes?_r=1&_t=ZP-95NIrCBiYAQ" target='_blank' rel="noreferrer" className='text-decoration-none text-white' title='Tiktok' aria-label="Abrir TikTok de Brickly Homes"><i className="fa-brands fa-tiktok fs-5" aria-hidden="true"></i></a>
                </div>
                <div className='d-flex flex-column align-items-xl-end' style={{ fontSize: '14px' }}>
                    <div className='mb-2'><FormattedMessage id='footer.text3' /></div>
                    <a href='mailto:info@bricklyhomes.com' className='mb-2 text-white user-select-none'>info@bricklyhomes.com</a>
                    <a href={whatsappUrl} className='text-white' target='_blank' rel="noreferrer" aria-label="Contactar por WhatsApp al número más 502 3764 9719">+502 3764-9719</a>
                </div>
              </div>
            </div>
            <hr className="my-5" />
            <div className="d-flex flex-column-reverse flex-xl-row justify-content-center justify-content-xl-between align-items-center gap-3 gap-lg-0" style={{ fontSize: '12px' }}>
              <div><FormattedMessage id='footer.text4' /></div>
              <div className='d-flex gap-xl-5 flex-column flex-xl-row align-items-center'>
                  <Link to="/terms" className='text-decoration-none text-white'><FormattedMessage id='footer.text7' /></Link>
                  {/* <a href="#" className='text-decoration-none text-white'><FormattedMessage id='footer.text6' /></a> */}
              </div>
            </div>
        </Container>
      </footer>

      {/* Toast de suscripción */}
      {subToast && (
        <div
          style={{
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
            animation: 'fadeInUp 0.3s ease',
          }}
        >
          <i className="fa-regular fa-circle-check" style={{ color: '#4caf50', fontSize: '18px' }}></i>
          Gracias por suscribirte.
        </div>
      )}
    </>
  );
}

export default Layout;