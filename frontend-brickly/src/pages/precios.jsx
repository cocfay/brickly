import React, { useEffect } from 'react';
import { FormattedMessage } from 'react-intl';
import AOS from 'aos';
import 'aos/dist/aos.css';

import { Container, Row, Col } from 'react-bootstrap';
import '../assets/css/precios.css';
import { getFullUser } from '../services/authService';
import PlanPricingCards from '../components/PlanPricingCards';

function Precios() {
  // Plan actualmente activo del usuario (si tiene sesión iniciada y su
  // suscripción está ACTIVE). Se recalcula en cada render porque
  // getFullUser() lee de sessionStorage/cookie.
  const currentUser = getFullUser();
  const currentPlan = currentUser?.subscriptionStatus === 'ACTIVE'
    ? currentUser?.subscriptionPlan
    : null;

  useEffect(() => {
    AOS.init({
      duration: 1000,
      once: true,
      offset: 100,
    });
  }, []);

  return (
    <Container>

        <div className="mt-4" style={{ fontSize: 'clamp(30px, 3vw, 50px)', marginBottom: 'clamp(2.8rem, 4vw, 4rem)' }}>
          <FormattedMessage id='price.text1' />
        </div>

        <PlanPricingCards currentPlan={currentPlan} />

        <div style={{ marginTop: 'clamp(5rem, 10vw, 9rem)', marginBottom: 'clamp(5rem, 10vw, 9rem)'}}>
        <div style={{ fontSize: 'clamp(30px, 3vw, 50px)', marginBottom: 'clamp(3rem, 6vw, 7rem)' }}><FormattedMessage id='price.text25' /></div>
        <Row className='gy-4 gy-lg-5 overflow-hidden'>
          <Col md={6} className='fw-bold fs-4' data-aos="fade-right"><FormattedMessage id='price.text26' /></Col>
          <Col md={6} data-aos="fade-left"><FormattedMessage id='price.text27' /></Col>
          <Col xs={12}><hr /></Col>
          <Col md={6} className='fw-bold fs-4' data-aos="fade-right"><FormattedMessage id='price.text28' /></Col>
          <Col md={6} data-aos="fade-left"><FormattedMessage id='price.text29' /></Col>
          <Col xs={12}><hr /></Col>
          <Col md={6} className='fw-bold fs-4' data-aos="fade-right"><FormattedMessage id='price.text30' /></Col>
          <Col md={6} data-aos="fade-left"><FormattedMessage id='price.text31' /></Col>
          <Col xs={12}><hr /></Col>
          <Col md={6} className='fw-bold fs-4' data-aos="fade-right"><FormattedMessage id='price.text32' /></Col>
          <Col md={6} data-aos="fade-left"><FormattedMessage id='price.text33' /></Col>
          <Col xs={12}><hr /></Col>
          <Col md={6} className='fw-bold fs-4' data-aos="fade-right"><FormattedMessage id='price.text34' /></Col>
          <Col md={6} data-aos="fade-left"><FormattedMessage id='price.text35' /></Col>
        </Row>
      </div>
    </Container>
  );
}

export default Precios;