import { useState } from 'react';
import { Container } from 'react-bootstrap';
import SEO from '../components/SEO';

import heroImage from '../assets/images/premier/home_premier.png';
import heroImageMobile from '../assets/images/premier/home_premier_movil.png';
import whyBackground from '../assets/images/premier/fondo.png';
import whyBackgroundMobile from '../assets/images/premier/fondo-movil.png';
import solutionsImage from '../assets/images/premier/sevicios.png';
import solutionsImageMobile from '../assets/images/premier/sevicios_movil.png';
import contactImage from '../assets/images/premier/contacto-premier.png';
import contactImageMobile from '../assets/images/premier/contacto-premier-movil.png';
import oficinasImage from '../assets/images/premier/oficinas.png';
import viviendasImage from '../assets/images/premier/viviendas.png';
import plantasImage from '../assets/images/premier/plantas-industriales.png';
import espaciosImage from '../assets/images/premier/espacios-comerciales.png';
import statBuilding from '../assets/images/premier/100000-m2.png';
import statSpaces from '../assets/images/premier/espacios.png';
import statDecisions from '../assets/images/premier/decisiones.png';
import statGrowth from '../assets/images/premier/sostenible.png';

import '../assets/css/premier.css';

const WHATSAPP_NUMBER = '50237649719';

const getWhatsappUrl = (message) =>
  `https://wa.me/${WHATSAPP_NUMBER}?text=` + encodeURIComponent(message);

const stats = [
  {
    image: statBuilding,
    prefix: 'Más de',
    value: '100,000 m²',
    label: 'Asesoramos en Build-to-Suit.',
  },
  { image: statSpaces, label: 'Espacios más eficientes' },
  { image: statDecisions, label: 'Decisiones mejor informadas' },
  { image: statGrowth, label: 'Crecimiento sostenible' },
];

const reasons = [
  {
    icon: 'fa-user-tie',
    title: 'Experiencia en el\nmercado',
    text: 'Amplio conocimiento del sector inmobiliario y una sólida red de aliados para cada proyecto.',
  },
  {
    icon: 'fa-compass-drafting',
    title: 'Soluciones a la\nmedida',
    text: 'Encontramos y desarrollamos espacios inmobiliarios ajustados a las necesidades operativas de tu empresa.',
  },
  {
    icon: 'fa-handshake-angle',
    title: 'Acompañamiento\nintegral',
    text: 'Te asesoramos en cada etapa del proceso, desde la planificación hasta la selección de la solución ideal.',
  },
  {
    icon: 'fa-lightbulb',
    title: 'Visión\nempresarial',
    text: 'Comprendemos tus objetivos y diseñamos soluciones que impulsan el crecimiento de tu negocio.',
  },
];

const solutions = [
  {
    title: 'Build-to-Suit',
    text: 'Desarrollamos soluciones inmobiliarias a la medida, conectando a las empresas con desarrolladores y constructores para crear espacios adaptados a sus necesidades operativas y comerciales.',
  },
  {
    title: 'Espacios industriales y logísticos',
    text: 'Identificamos y desarrollamos espacios eficientes para operaciones industriales, almacenaje y distribución.',
  },
  {
    title: 'Espacios corporativos y comerciales',
    text: 'Encontramos oficinas y espacios comerciales alineados con la operación y la imagen de tu empresa.',
  },
  {
    title: 'Búsqueda y evaluación de ubicaciones',
    text: 'Analizamos ubicaciones estratégicas para maximizar la conectividad, la operación y el valor de tu proyecto.',
  },
  {
    title: 'Asesoría para desarrollos a la medida',
    text: 'Acompañamos el desarrollo de soluciones inmobiliarias diseñadas específicamente para tus objetivos.',
  },
];

const steps = [
  {
    number: '01',
    icon: 'fa-clipboard-list',
    title: 'Entendemos tu necesidad',
    text: 'Analizamos tus objetivos operativos, ubicación, tamaño y requerimientos específicos.',
  },
  {
    number: '02',
    icon: 'fa-magnifying-glass',
    title: 'Evaluamos opciones',
    text: 'Identificamos inmuebles o desarrollamos opciones Build-to-Suit con socios estratégicos.',
  },
  {
    number: '03',
    icon: 'fa-handshake',
    title: 'Estructuramos y negociamos',
    text: 'Te acompañamos en la evaluación, negociación y aspectos técnicos y legales; implementamos y damos seguimiento.',
  },
  {
    number: '04',
    icon: 'fa-gears',
    title: 'Implementamos y revisamos',
    text: 'Coordinamos la ejecución hasta la entrega y acompañamos la implementación.',
  },
];

const projectTypes = [
  { title: 'Oficinas corporativas', image: oficinasImage },
  { title: 'Vivienda y apartamentos', image: viviendasImage },
  { title: 'Plantas industriales', image: plantasImage },
  { title: 'Espacios comerciales', image: espaciosImage },
];

const contactFeatures = [
  { icon: 'fa-user-tie', label: 'Asesoría especializada' },
  { icon: 'fa-layer-group', label: 'Opciones estratégicas' },
  { icon: 'fa-handshake', label: 'Acompañamiento en todo el proceso' },
  { icon: 'fa-chart-line', label: 'Resultados concretos' },
];

const heroWhatsappUrl = getWhatsappUrl(
  'Hola, quiero información sobre Brickly Premier.'
);

const evaluationWhatsappUrl = getWhatsappUrl(
  'Hola, quiero solicitar una evaluación para mi proyecto con Brickly Premier.'
);

const projectWhatsappUrl = getWhatsappUrl(
  'Hola, quiero conocer más sobre las soluciones de Brickly Premier para mi proyecto.'
);

function Premier() {
  const [openSolution, setOpenSolution] = useState(0);

  return (
    <div className="premier-page">
      <SEO
        title="Brickly Premier"
        description="Brickly Premier ofrece asesoría inmobiliaria corporativa y soluciones Build-to-Suit para empresas, desarrolladoras y constructoras."
        url="https://www.bricklyhomes.com/servicios/premier"
      />

      <section className="premier-hero">
        <picture className="premier-hero__media" aria-hidden="true">
          <source media="(max-width: 991.98px)" srcSet={heroImageMobile} />
          <img
            src={heroImage}
            alt=""
            className="premier-hero__image"
            fetchPriority="high"
          />
        </picture>

        <Container className="premier-hero__content" data-aos="fade-up">
          <p className="premier-eyebrow">Asesoría corporativa</p>
          <h1 className="premier-hero__title">
            <span>Brickly Premier</span>
            Asesoría inmobiliaria
          </h1>
          <p className="premier-hero__lead">
            Acompañamos a empresas en la evaluación y selección de soluciones
            inmobiliarias, conectándolas con desarrolladoras y constructoras
            según sus necesidades estratégicas y operativas.
          </p>
          <a
            className="premier-btn premier-btn--gold"
            href={heroWhatsappUrl}
            target="_blank"
            rel="noreferrer"
          >
            <span className="premier-btn__icon" aria-hidden="true">
              <i className="fa-brands fa-whatsapp"></i>
            </span>
            <span>Hablemos de tu proyecto por WhatsApp</span>
            <i className="fa-solid fa-arrow-right premier-btn__arrow" aria-hidden="true"></i>
          </a>
        </Container>
      </section>

      <section className="premier-stats">
        <Container>
          <div className="premier-stats__grid py-5">
            {stats.map((stat, index) => (
              <article
                className="premier-stat"
                key={stat.value || stat.label}
                data-aos="fade-up"
                data-aos-delay={index * 100}
              >
                <img
                  src={stat.image}
                  alt=""
                  className="premier-stat__icon"
                  aria-hidden="true"
                />
                <div>
                  {stat.prefix && (
                    <span className="premier-stat__prefix">{stat.prefix}</span>
                  )}
                  {stat.value && <p className="premier-stat__value">{stat.value}</p>}
                  {stat.label && <p className="premier-stat__label">{stat.label}</p>}
                </div>
              </article>
            ))}
          </div>
        </Container>
      </section>

      <section className="premier-why">
        <picture className="premier-why__background" aria-hidden="true">
          <source media="(max-width: 991.98px)" srcSet={whyBackgroundMobile} />
          <img src={whyBackground} alt="" loading="lazy" />
        </picture>

        <Container className="premier-why__content">
          <div className="premier-why__head" data-aos="fade-up">
            <div>
              <h2 className="premier-section-title">
                ¿Por qué elegir Brickly Premier?
              </h2>
              <p className="premier-why__intro">
                Te conectamos con las mejores desarrolladoras y constructoras
                para estructurar soluciones inmobiliarias que se adapten a tu
                empresa.
              </p>
            </div>
            <a
              className="premier-btn premier-btn--gold premier-btn--small"
              href={evaluationWhatsappUrl}
              target="_blank"
              rel="noreferrer"
            >
              <span>Solicita una evaluación</span>
              <i className="fa-solid fa-arrow-right premier-btn__arrow" aria-hidden="true"></i>
            </a>
          </div>

          <div className="premier-reasons">
            {reasons.map((reason, index) => (
              <article
                className="premier-reason"
                key={reason.title}
                data-aos="fade-up"
                data-aos-delay={index * 100}
              >
                <i
                  className={`fa-solid ${reason.icon} premier-reason__icon`}
                  aria-hidden="true"
                ></i>
                <h3 className="premier-reason__title">{reason.title}</h3>
                <p className="premier-reason__text">{reason.text}</p>
              </article>
            ))}
          </div>
        </Container>
      </section>

      <section className="premier-solutions">
        <div className="premier-solutions__background" aria-hidden="true">
          <img src={solutionsImage} alt="" loading="lazy" />
        </div>
        <img
          className="premier-solutions__mobile-photo"
          src={solutionsImageMobile}
          alt=""
          loading="lazy"
        />

        <Container className="premier-solutions__content">
          <div className="premier-solutions__panel" data-aos="fade-left">
            <h2>Nuestras soluciones</h2>

            <div className="premier-accordion">
              {solutions.map((solution, index) => {
                const isOpen = openSolution === index;
                return (
                  <article
                    className={`premier-accordion__item${isOpen ? ' is-open' : ''}`}
                    key={solution.title}
                  >
                    <button
                      type="button"
                      className="premier-accordion__trigger"
                      aria-expanded={isOpen}
                      onClick={() => setOpenSolution(isOpen ? -1 : index)}
                    >
                      <span>{solution.title}</span>
                      <i
                        className={`fa-solid ${isOpen ? 'fa-minus' : 'fa-plus'} premier-accordion__icon`}
                        aria-hidden="true"
                      ></i>
                    </button>
                    {isOpen && (
                      <p className="premier-accordion__body">{solution.text}</p>
                    )}
                  </article>
                );
              })}
            </div>
          </div>
        </Container>
      </section>

      <section className="premier-process">
        <Container>
          <h2 className="premier-section-title text-center" data-aos="fade-up">Así impulsamos tu proyecto</h2>

          <div className="premier-steps">
            {steps.map((step, index) => (
              <article
                className="premier-step"
                key={step.number}
                data-aos="fade-up"
                data-aos-delay={index * 90}
              >
                <span className="premier-step__number">{step.number}</span>
                <span className="premier-step__divider" aria-hidden="true"></span>
                <div className="premier-step__body">
                  <i className={`fa-solid ${step.icon} premier-step__icon`} aria-hidden="true"></i>
                  <h3>{step.title}</h3>
                  <p>{step.text}</p>
                </div>
              </article>
            ))}
          </div>
        </Container>
      </section>

      <section className="premier-types">
        <Container>
          <h2 className="premier-section-title" data-aos="fade-up">Tipos de proyectos</h2>

          <div className="premier-type-grid">
            {projectTypes.map((type, index) => (
              <a
                className="premier-type"
                href={projectWhatsappUrl}
                target="_blank"
                rel="noreferrer"
                key={type.title}
                aria-label={`Conocer más sobre ${type.title}`}
                data-aos="fade-up"
                data-aos-delay={index * 90}
              >
                <img src={type.image} alt="" loading="lazy" />
                <div className="premier-type__footer">
                  <h3>{type.title}</h3>
                  <span className="premier-type__arrow" aria-hidden="true">
                    <i className="fa-solid fa-arrow-right"></i>
                  </span>
                </div>
              </a>
            ))}
          </div>
        </Container>
      </section>

      <section className="premier-cta">
        <div className="premier-cta__background" aria-hidden="true">
          <img src={contactImage} alt="" loading="lazy" />
        </div>
        <img
          className="premier-cta__mobile-photo"
          src={contactImageMobile}
          alt=""
          loading="lazy"
        />

        <Container className="premier-cta__content">
          <div className="premier-cta__inner" data-aos="fade-up">
            <p className="premier-eyebrow">Hagamos realidad</p>
            <h2 className="premier-cta__title">
              <span>Tu proyecto</span>
              inmobiliario
            </h2>
            <p className="premier-cta__text">
              Cuéntanos tus objetivos y te acompañamos con soluciones adaptadas
              a tus necesidades.
            </p>

            <div className="premier-cta__actions">
              <a
                className="premier-btn premier-btn--gold"
                href={projectWhatsappUrl}
                target="_blank"
                rel="noreferrer"
              >
                <span className="premier-btn__icon" aria-hidden="true">
                  <i className="fa-brands fa-whatsapp"></i>
                </span>
                <span>Hablemos de tu proyecto por WhatsApp</span>
                <i className="fa-solid fa-arrow-right premier-btn__arrow" aria-hidden="true"></i>
              </a>

              <a
                className="premier-phone"
                href={`https://wa.me/${WHATSAPP_NUMBER}`}
                target="_blank"
                rel="noreferrer"
              >
                <span>WhatsApp directo</span>
                <strong>+502 3764-9719</strong>
              </a>
            </div>

            <div className="premier-contact-features">
              {contactFeatures.map((feature) => (
                <div className="premier-contact-feature" key={feature.label}>
                  <i
                    className={`fa-solid ${feature.icon} premier-contact-feature__icon`}
                    aria-hidden="true"
                  ></i>
                  <span>{feature.label}</span>
                </div>
              ))}
            </div>
          </div>
        </Container>
      </section>
    </div>
  );
}

export default Premier;
