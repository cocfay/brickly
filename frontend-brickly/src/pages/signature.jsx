import { Link } from 'react-router-dom';
import SEO from '../components/SEO';

import heroImage from '../assets/images/signature/home-signatures.png';
import heroImageMobile from '../assets/images/signature/home-signature-movil.png';
import buildingImage from '../assets/images/signature/edificios.png';
import alliesImage from '../assets/images/signature/aliados-desktop.png';
import alliesImageMobile from '../assets/images/signature/aliados-movil.png';
import processImage from '../assets/images/signature/fondo-estrategia.png';
import processImageMobile from '../assets/images/signature/fondo-estrategia-movil.png';
import teamImage from '../assets/images/signature/equipo-de-ventas.png';
import teamImageMobile from '../assets/images/signature/equipo-de-ventas-movil.png';
import contactImage from '../assets/images/signature/contacto.png';
import contactImageMobile from '../assets/images/signature/contacto-movil.png';
import estrategiaComercialIcon from '../assets/images/signature/estrategia-comercial.png';
import redInmobiliariasIcon from '../assets/images/signature/red-de-inmobiliarias.png';
import direccionVentasIcon from '../assets/images/signature/direccion-de-ventas.png';
import resultadosIcon from '../assets/images/signature/resultados-1.png';

import '../assets/css/signature.css';

const WHATSAPP_NUMBER = '50237649719';

const getWhatsappUrl = (message) =>
  `https://wa.me/${WHATSAPP_NUMBER}?text=` + encodeURIComponent(message);

const heroWhatsappUrl = getWhatsappUrl(
  'Hola, quiero información sobre Brickly Signature.'
);

const contactWhatsappUrl = getWhatsappUrl(
  'Hola, quiero agendar una conversación con Brickly Signature.'
);

const introFeatures = [
  { image: estrategiaComercialIcon, label: 'Estrategia comercial' },
  { image: redInmobiliariasIcon, label: 'Red de inmobiliarias' },
  { image: direccionVentasIcon, label: 'Dirección de venta' },
  { image: resultadosIcon, label: 'Seguimiento y resultados' },
];

const processSteps = [
  {
    number: '01',
    title: 'Análisis',
    paragraphs: [
      'Entendemos tu proyecto y su potencial comercial.',
      'Conectamos tu proyecto con una red de profesionales que pueden apoyar su promoción y comercialización en diferentes mercados.',
    ],
  },
  {
    number: '02',
    title: 'Ejecución',
    paragraphs: [
      'Formamos y dirigimos equipos de ventas exclusivos.',
      'Lideramos toda la operación comercial, coordinamos al equipo de ventas y supervisamos cada acción para alcanzar resultados.',
    ],
  },
  {
    number: '03',
    title: 'Gestión',
    paragraphs: [
      'Supervisamos cada oportunidad para optimizar el desempeño.',
      'Supervisamos prospectos, visitas y oportunidades de venta para optimizar el desempeño comercial.',
    ],
  },
  {
    number: '04',
    title: 'Resultados',
    paragraphs: [
      'Orientamos cada esfuerzo hacia resultados medibles.',
      'Medimos el desempeño comercial y fortalecemos las acciones para lograr ventas y crecimiento sostenible.',
    ],
  },
];

const benefits = [
  {
    number: '01',
    icon: 'fa-sharp fa-thin fa-people-group',
    title: 'Cero carga\noperativa',
    description:
      'Nos encargamos de contratar, capacitar y administrar todo tu equipo comercial.',
  },
  {
    number: '02',
    icon: 'fa-shield-halved',
    title: 'Representación\nen exclusiva',
    description:
      'Un equipo dedicado exclusivamente a tu proyecto, con discreción y profesionalismo.',
  },
  {
    number: '03',
    icon: 'fa-chart-line',
    title: 'Lideramos tu área\nde ventas',
    description:
      'Dirigimos la estrategia, los procesos y el equipo comercial de principio a fin.',
  },
  {
    number: '04',
    icon: 'fa-database',
    title: 'Infraestructura comercial\ninmediata',
    description:
      'Accede a nuestra red de agencias, base de datos y marketing especializado.',
  },
  {
    number: '05',
    icon: 'fa-file-lines',
    title: 'Un único\ninterlocutor',
    description:
      'Recibe reportes ejecutivos, seguimiento y transparencia en cada resultado.',
  },
];

const contactFeatures = [
  { icon: 'fa-comments', label: ['Acompañamiento', 'personalizado'] },
  { icon: 'fa-bullseye', label: ['Estrategia comercial', 'a tu medida'] },
  { icon: 'fa-user-group', label: ['Respaldo de una red', 'de aliados expertos'] },
];

function Signature() {
  return (
    <div className="signature-page">
      <SEO
        title="Brickly Signature"
        description="Brickly Signature forma, lidera y dirige un equipo de ventas exclusivo para tu proyecto, gestionando toda la operación comercial con estrategias enfocadas en resultados."
        url="https://www.bricklyhomes.com/servicios/signature"
      />

      <section className="sig-hero">
        <picture className="sig-media">
          <source media="(max-width: 991.98px)" srcSet={heroImageMobile} />
          <img
            src={heroImage}
            alt=""
            className="sig-media__img"
            fetchPriority="high"
          />
        </picture>

        <div className="sig-container sig-hero__content" data-aos="fade-up">
          <p className="sig-eyebrow sig-eyebrow--light">
            Hagamos crecer tu proyecto
          </p>
          <h1 className="sig-hero__title">Hablemos de oportunidades</h1>
          <p className="sig-hero__text">
            Brickly Signature forma, lidera y dirige un equipo de ventas
            exclusivo para tu proyecto, gestionando toda la operación comercial
            con estrategias enfocadas en resultados.
          </p>
          <a
            className="sig-btn sig-btn--light"
            href={heroWhatsappUrl}
            target="_blank"
            rel="noreferrer"
          >
            <span className="sig-btn__icon" aria-hidden="true">
              <i className="fa-brands fa-whatsapp"></i>
            </span>
            <span className="sig-btn__label">
              Hablemos de tu proyecto por WhatsApp
            </span>
            <i className="fa-solid fa-arrow-right sig-btn__arrow" aria-hidden="true"></i>
          </a>
        </div>
      </section>

      <section className="sig-intro">
        <div className="sig-container sig-intro__inner">
          <div className="sig-intro__copy" data-aos="fade-right">
            <h2 className="sig-intro__title">Brickly Signature</h2>
            <p className="sig-intro__subtitle">
              Una solución integral completa para tu proyecto
            </p>
            <p className="sig-intro__text">
              Combinamos experiencia, tecnología y una red de aliados para
              impulsar proyectos inmobiliarios. Formamos y dirigimos tu equipo
              de ventas, gestionando toda la estrategia comercial.
            </p>

            <div className="sig-feature-grid">
              {introFeatures.map((feature, index) => (
                <div
                  className="sig-feature"
                  key={feature.label}
                  data-aos="fade-up"
                  data-aos-delay={index * 90}
                >
                  <img
                    src={feature.image}
                    alt=""
                    className="sig-feature__icon"
                    aria-hidden="true"
                  />
                  <p className="sig-feature__label">{feature.label}</p>
                </div>
              ))}
              <span className="sig-feature-grid__target" aria-hidden="true">
                <i className="fa-solid fa-bullseye"></i>
              </span>
            </div>
          </div>

          <div className="sig-intro__media" data-aos="fade-left">
            <img
              src={buildingImage}
              alt="Edificio residencial iluminado al atardecer"
              className="sig-intro__image"
              loading="lazy"
            />
          </div>
        </div>
      </section>

      <section className="sig-red" id="red">
        <picture className="sig-media sig-red__media">
          <source media="(max-width: 991.98px)" srcSet={alliesImageMobile} />
          <img
            src={alliesImage}
            alt=""
            className="sig-media__img"
            loading="lazy"
          />
        </picture>

        <div className="sig-red__content" data-aos="fade-right">
          <p className="sig-eyebrow sig-eyebrow--light">
            Red que genera resultados
          </p>
          <h2 className="sig-red__title">
            Más de 50
            <br />
            inmobiliarias aliadas
          </h2>
          <p className="sig-red__text">
            Conectamos tu proyecto con una red de profesionales que pueden
            apoyar su promoción y comercialización en diferentes mercados.
          </p>
          <Link className="sig-btn sig-btn--light sig-btn--sm" to="/asociados">
            <span className="sig-btn__label">Conoce nuestra red</span>
            <i className="fa-solid fa-arrow-right sig-btn__arrow" aria-hidden="true"></i>
          </Link>
        </div>
      </section>

      <section
        className="sig-process"
        style={{
          '--sig-process-image': `url(${processImage})`,
          '--sig-process-image-mobile': `url(${processImageMobile})`,
        }}
      >
        <div className="sig-container">
          <p className="sig-eyebrow">Nuestro proceso</p>
          <h2 className="sig-process__title" data-aos="fade-up">De la estrategia al cierre</h2>

          <div className="sig-steps">
            {processSteps.map((step, index) => (
              <article
                className="sig-step"
                key={step.title}
                data-aos="fade-up"
                data-aos-delay={index * 90}
              >
                <div className="sig-step__head">
                  <span className="sig-step__number">{step.number}</span>
                  {index < processSteps.length - 1 && (
                    <span className="sig-step__arrow" aria-hidden="true"></span>
                  )}
                </div>
                <h3 className="sig-step__title">{step.title}</h3>
                {step.paragraphs.map((paragraph) => (
                  <p className="sig-step__text" key={paragraph}>
                    {paragraph}
                  </p>
                ))}
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="sig-team">
        <picture className="sig-media sig-team__media">
          <source media="(max-width: 991.98px)" srcSet={teamImageMobile} />
          <img
            src={teamImage}
            alt=""
            className="sig-media__img"
            loading="lazy"
          />
        </picture>

        <div className="sig-container sig-team__content" data-aos="fade-up">
          <p className="sig-eyebrow">Brickly Signature</p>
          <h2 className="sig-team__title">
            El área comercial de
            <br />
            tu proyecto en manos
            <br />
            expertas
          </h2>
          <p className="sig-team__lead">
            El servicio de ventas en exclusiva para desarrolladoras:
          </p>
          <p className="sig-team__quote">
            Asumimos el liderazgo comercial de tu proyecto,{' '}
            <br className="sig-team__quote-break" />
            formando y dirigiendo un equipo de ventas exclusivo,{' '}
            <br className="sig-team__quote-break" />
            enfocado en generar resultados.
          </p>

          <div className="sig-team__card">
            {benefits.map((benefit, index) => (
              <article
                className="sig-benefit"
                key={benefit.title}
                data-aos="fade-up"
                data-aos-delay={index * 80}
              >
                <i
                  className={`fa-solid ${benefit.icon} sig-benefit__icon`}
                  aria-hidden="true"
                ></i>
                <span className="sig-benefit__number">{benefit.number}</span>
                <h3 className="sig-benefit__title">{benefit.title}</h3>
                <p className="sig-benefit__text">{benefit.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="sig-contact">
        <picture className="sig-media sig-contact__media">
          <source media="(max-width: 991.98px)" srcSet={contactImageMobile} />
          <img
            src={contactImage}
            alt=""
            className="sig-media__img"
            loading="lazy"
          />
        </picture>

        <div className="sig-container sig-contact__content" data-aos="fade-up">
          <p className="sig-eyebrow">Impulsemos tu proyecto</p>
          <h2 className="sig-contact__title">Conversemos</h2>
          <p className="sig-contact__text">
            Estamos listos para conocer tu proyecto, entender tus objetivos
            <br className="sig-contact__text-break" />{' '}
            y evaluar juntos la mejor estrategia comercial.
          </p>

          <div className="sig-contact__actions">
            <a
              className="sig-contact__primary"
              href={contactWhatsappUrl}
              target="_blank"
              rel="noreferrer"
            >
              <span className="sig-contact__primary-icon" aria-hidden="true">
                <i className="fa-brands fa-whatsapp"></i>
              </span>
              <span className="sig-contact__primary-label">
                Agendar conversación con
                <br />
                Brickly Signature
              </span>
              <i
                className="fa-solid fa-arrow-right sig-contact__primary-arrow"
                aria-hidden="true"
              ></i>
            </a>

            <a
              className="sig-contact__whatsapp"
              href={contactWhatsappUrl}
              target="_blank"
              rel="noreferrer"
            >
              <span className="sig-contact__whatsapp-label">
                WhatsApp directo
              </span>
              <strong className="sig-contact__whatsapp-number">
                +502 3764-9719
              </strong>
            </a>
          </div>

          <div className="sig-contact__features">
            {contactFeatures.map((feature) => (
              <div className="sig-contact__feature" key={feature.label.join(' ')}>
                <i
                  className={`fa-solid ${feature.icon} sig-contact__feature-icon`}
                  aria-hidden="true"
                ></i>
                <p className="sig-contact__feature-label">
                  {feature.label[0]}
                  <br />
                  {feature.label[1]}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

export default Signature;
