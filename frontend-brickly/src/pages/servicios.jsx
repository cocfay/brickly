import { Container } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import SEO from '../components/SEO';

import heroBg from '../assets/images/servicios/home.png';
import heroBgMobile from '../assets/images/servicios/home_movil.png';
import ctaBg from '../assets/images/servicios/contacto.png';
import ctaBgMobile from '../assets/images/servicios/contacto_movil.png';
import signatureImg from '../assets/images/servicios/signature.png';
import premierImg from '../assets/images/servicios/premier.png';
import marketingImg from '../assets/images/servicios/marketing.png';
import estrategicaIcon from '../assets/images/servicios/estrategica.png';
import experienciaIcon from '../assets/images/servicios/experiencia.png';
import redAliadosIcon from '../assets/images/servicios/red-de-aliados.png';
import resultadosIcon from '../assets/images/servicios/resultados.png';

import '../assets/css/servicios.css';

const WHATSAPP_NUMBER = '50237649719';

const getWhatsappUrl = (message) =>
  `https://wa.me/${WHATSAPP_NUMBER}?text=` + encodeURIComponent(message);

const features = [
  {
    image: estrategicaIcon,
    label: ['Visión', 'estratégica'],
  },
  {
    image: experienciaIcon,
    label: ['Experiencia', 'en el sector'],
  },
  {
    image: redAliadosIcon,
    label: ['Red de aliados', 'inmobiliarios'],
  },
  {
    image: resultadosIcon,
    label: ['Resultados', 'comprobados'],
  },
];

const services = [
  {
    id: 'signature',
    modifier: 'signature',
    image: signatureImg,
    title: ['BRICKLY', 'SIGNATURE'],
    description: 'Ventas externas, dirección comercial y promoción de proyectos',
    path: '/servicios/signature',
    whatsappMessage: 'Hola, quiero información sobre el servicio Brickly Signature.',
  },
  {
    id: 'premier',
    modifier: 'premier',
    image: premierImg,
    title: ['BRICKLY', 'PREMIER'],
    description: 'Consultoría inmobiliaria corporativa y soluciones Build-to-Suit',
    path: '/servicios/premier',
    whatsappMessage: 'Hola, quiero información sobre el servicio Brickly Premier.',
  },
  {
    id: 'marketing',
    modifier: 'marketing',
    image: marketingImg,
    title: ['BRICKLY', 'MARKETING'],
    description: 'Campañas digitales, contenido audiovisual y generación de demanda',
    path: '/servicios/marketing',
    whatsappMessage: 'Hola, quiero información sobre el servicio Brickly Marketing.',
  },
];

const heroWhatsappUrl = getWhatsappUrl(
  'Hola, quiero información sobre los servicios ejecutivos de Brickly.'
);

const ctaWhatsappUrl = getWhatsappUrl(
  'Hola, necesito ayuda para encontrar el servicio ideal para mi proyecto.'
);

const WhatsappButton = ({ url, icon, children, className = '' }) => (
  <a
    className={`servicios-btn ${className}`.trim()}
    href={url}
    target="_blank"
    rel="noreferrer"
  >
    <span className="servicios-btn__icon" aria-hidden="true">
      <i className={`fa-brands ${icon}`}></i>
    </span>
    <span className="servicios-btn__label">{children}</span>
    <i className="fa-solid fa-arrow-right servicios-btn__arrow" aria-hidden="true"></i>
  </a>
);

function Servicios() {
  return (
    <div className="servicios-page">
      <SEO
        title="Servicios ejecutivos"
        description="Estrategia comercial, asesoría especializada y marketing digital para empresas, desarrolladores y profesionales del sector inmobiliario."
        url="https://www.bricklyhomes.com/servicios"
      />

      <section className="servicios-hero">
        <picture>
          <source media="(max-width: 991.98px)" srcSet={heroBgMobile} />
          <img
            src={heroBg}
            alt=""
            className="servicios-hero__bg"
            fetchPriority="high"
          />
        </picture>
        <div className="servicios-hero__shade" aria-hidden="true"></div>

        <Container className="servicios-hero__content" data-aos="fade-up">
          <p className="servicios-eyebrow">Servicios ejecutivos</p>

          <h1 className="servicios-hero__title">
            Soluciones
            <br />
            inmobiliarias
            <br />
            <span className="servicios-hero__title-accent">estratégicas</span>
          </h1>

          <p className="servicios-hero__text">
            Estrategia comercial, asesoría especializada y marketing digital
            para empresas, desarrolladores y profesionales del sector
            inmobiliario.
          </p>

          <WhatsappButton url={heroWhatsappUrl} icon="fa-whatsapp">
            Hablemos de tu proyecto por WhatsApp
          </WhatsappButton>
        </Container>

        <Container className="servicios-hero__features-wrap">
          <div className="servicios-features">
            {features.map((feature, index) => (
              <div
                className="servicios-feature"
                key={feature.label.join(' ')}
                data-aos="fade-up"
                data-aos-delay={index * 100}
              >
                <img
                  src={feature.image}
                  alt=""
                  className="servicios-feature__icon"
                  aria-hidden="true"
                />
                <p className="servicios-feature__label">
                  {feature.label[0]}
                  <br />
                  {feature.label[1]}
                </p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      <section className="servicios-solutions" id="soluciones">
        <Container>
          <div className="servicios-solutions__head" data-aos="fade-up">
            <div>
              <p className="servicios-eyebrow servicios-eyebrow--lines mb-3">
                Tres soluciones
                <br />
                Un mismo objetivo
              </p>
              <h2 className="servicios-solutions__title">
                Impulsar el crecimiento de tus proyectos
              </h2>
            </div>

            <p className="servicios-solutions__intro">
              Acompañamos a empresas, desarrolladoras y profesionales
              inmobiliarios con soluciones especializadas en ventas, asesoría y
              marketing digital.
            </p>
          </div>

          <div className="servicios-cards">
            {services.map((service, index) => {
              const cardContent = (
                <>
                  <img
                    src={service.image}
                    alt=""
                    className="servicios-card__bg"
                    loading="lazy"
                  />
                  <span className="servicios-card__shade" aria-hidden="true"></span>

                  <div className="servicios-card__content">
                    <h3 className="servicios-card__title">
                      {service.title[0]}
                      <br />
                      {service.title[1]}
                    </h3>
                    <p className="servicios-card__description">
                      {service.description}
                    </p>
                    <span className="servicios-card__arrow" aria-hidden="true">
                      <i className="fa-solid fa-arrow-right"></i>
                    </span>
                  </div>
                </>
              );

              if (service.path) {
                return (
                  <Link
                    key={service.id}
                    className={`servicios-card servicios-card--${service.modifier}`}
                    to={service.path}
                    aria-label={`Conocer más sobre ${service.title.join(' ')}`}
                    data-aos="fade-up"
                    data-aos-delay={index * 100}
                  >
                    {cardContent}
                  </Link>
                );
              }

              return (
                <a
                  key={service.id}
                  className={`servicios-card servicios-card--${service.modifier}`}
                  href={getWhatsappUrl(service.whatsappMessage)}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`Conocer más sobre ${service.title.join(' ')}`}
                  data-aos="fade-up"
                  data-aos-delay={index * 100}
                >
                  {cardContent}
                </a>
              );
            })}
          </div>
        </Container>
      </section>

      <section className="servicios-cta-mobile">
        <img
          src={ctaBgMobile}
          alt=""
          className="servicios-cta-mobile__bg"
          loading="lazy"
        />
        <div className="servicios-cta-mobile__shade" aria-hidden="true"></div>

        <Container className="servicios-cta-mobile__content" data-aos="fade-up">
          <p className="servicios-eyebrow">Consultoría y dirección comercial</p>
          <h2 className="servicios-cta-mobile__title">
            Optimizamos tu
            <br />
            objetivo y te ayudamos
            <br />
            a encontrar
            <br />
            <span className="servicios-hero__title-accent">
              la mejor solución
            </span>
          </h2>
          <a
            className="servicios-btn servicios-btn--mobile-cta"
            href={ctaWhatsappUrl}
            target="_blank"
            rel="noreferrer"
          >
            <span>Escríbenos por Whatsapp</span>
            <i className="fa-solid fa-arrow-right-long" aria-hidden="true"></i>
          </a>
        </Container>
      </section>

      <section className="servicios-cta servicios-cta--desktop">
        <img src={ctaBg} alt="" className="servicios-cta__bg" loading="lazy" />
        <div className="servicios-cta__shade" aria-hidden="true"></div>

        <Container className="servicios-cta__content" data-aos="fade-up">
          <p className="servicios-cta__question">
            ¿No estás seguro de qué servicio necesitas?
          </p>
          <h2 className="servicios-cta__title">
            Cuéntanos tu objetivo y te ayudamos a encontrar la mejor solución
          </h2>
          <WhatsappButton
            url={ctaWhatsappUrl}
            icon="fa-whatsapp"
            className="servicios-btn--sm"
          >
            Escríbenos por WhatsApp
          </WhatsappButton>
        </Container>
      </section>
    </div>
  );
}

export default Servicios;
