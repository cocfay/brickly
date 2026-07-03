import React, { useState, useEffect } from 'react'; // Añade useState
import { Container, Nav} from 'react-bootstrap';
import { NavLink, Link } from 'react-router-dom';
import logo from '../../assets/images/logos/logo_negro.png';
import logoWhite from '../../assets/images/logos/logo_blanco.png';
import '../../assets/css/layout.css'
import Boxlogin from '../boxLogin';
import SideMenu from '../sideMenu';

import { FormattedMessage } from 'react-intl';

function SimpleMenu() {

  return (
    <div className="bg-white position-sticky menu-public top-0" style={{ padding: '.1px', zIndex: '1021' }}>
      <Container className='d-none d-lg-block py-lg-2 py-xl-4' /* style={{ paddingTop: '1.5rem' }} */>
        <div className='d-flex justify-content-between align-items-center'>
          <Link to="/" className="text-white">
            <img src={logo} alt="Logo" className="img-fluid" style={{ maxWidth: 'clamp(120px, 10vw, 200px)' }} />
          </Link>

          <Nav className='d-flex gap-lg-0 gap-xl-2 align-items-center' style={{ fontSize: 'clamp(10px, 1vw, 14px)' }}>
            <Nav.Link as={NavLink} to="propiedades" className='text-dark'><FormattedMessage id='link.text1' /></Nav.Link>
            {/* <Nav.Link as={NavLink} to="arquitectos" className='text-dark'><FormattedMessage id='link.text2' /></Nav.Link> */}
            {/* <Nav.Link as={NavLink} to="/proyectos" className='text-dark'><FormattedMessage id='link.text3' /></Nav.Link> */}
            <Nav.Link as={NavLink} to="/agentes" className='text-dark'><FormattedMessage id='link.text4' /></Nav.Link>
            <Nav.Link as={NavLink} to="/asociados" className='text-dark'><FormattedMessage id='link.text5' /></Nav.Link>
            <Nav.Link as={NavLink} to="precios" className='text-dark'><FormattedMessage id='link.text6' /></Nav.Link>
            <Nav.Link href="https://blog.bricklyhomes.com/" target="_blank" rel="noreferrer" className='text-dark'>BLOG</Nav.Link>

            <Boxlogin />
          </Nav>
        </div>
      </Container>

      {/* VERSIÓN MÓVIL */}
      <Container className='d-block d-lg-none py-3'>
        <div className="d-flex justify-content-between align-items-center">
          <Link to="/">
            <img src={logo} alt="Logo" className="img-fluid" style={{ maxWidth: '120px' }} />
          </Link>
          
          <SideMenu />
        </div>
      </Container>

      <Container>
        <hr className='my-0' />
      </Container>

    </div>

  );
}

export default SimpleMenu;