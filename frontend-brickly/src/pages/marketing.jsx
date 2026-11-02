import SEO from '../components/SEO';

import heroImage from '../assets/images/marketing/banner-home.png';
import heroImageMobile from '../assets/images/marketing/banner-movil.png';
import serviceDigital from '../assets/images/marketing/servicio-marketing-digital.png';
import serviceSeo from '../assets/images/marketing/servicio-posicionamiento.png';
import serviceCampaigns from '../assets/images/marketing/servicio-gestion.png';
import serviceVideo from '../assets/images/marketing/servicio-video.png';
import contentPhoto from '../assets/images/marketing/post-ind-vista-verde.png';
import contentVideo from '../assets/images/marketing/post-ind-gamma-sur.png';
import contentCampaign from '../assets/images/marketing/post-fb-ind-portales.png';
import contentDrone from '../assets/images/marketing/post-individual-fb.png';
import contentReels from '../assets/images/marketing/post-fb-individual.png';
import contactImage from '../assets/images/marketing/contacto.png';
import contactImageMobile from '../assets/images/marketing/contacto-movil.png';

import '../assets/css/marketing.css';

const WHATSAPP_NUMBER = '50237649719';

const getWhatsappUrl = (message) =>
  `https://wa.me/${WHATSAPP_NUMBER}?text=` + encodeURIComponent(message);

const heroWhatsappUrl = getWhatsappUrl(
  'Hola, quiero información sobre los servicios de marketing digital de Brickly.'
);

const evaluationWhatsappUrl = getWhatsappUrl(
  'Hola, quiero solicitar una evaluación de marketing para mi proyecto.'
);

const contactWhatsappUrl = getWhatsappUrl(
  'Hola, quiero hablar sobre el marketing de mi proyecto inmobiliario.'
);

const stats = [
  { icon: 'fa-chart-column', value: '4M+', label: 'Inspecciones generadas' },
  {
    icon: 'fa-camera',
    value: '450+',
    label: 'Proyectos con producción audiovisual',
  },
  { icon: 'fa-building', value: '50+', label: 'Inmobiliarias en nuestra red' },
  { icon: 'fa-users', value: '30,000+', label: 'Usuarios activos mensuales' },
];

const services = [
  {
    number: '01',
    kicker: 'Marketing en redes',
    title: 'Estrategias de contenido que generan confianza',
    text: 'Contenido visual y estratégico para conectar con compradores y reforzar el valor de tus proyectos.',
    bullets: [
      'Plan de contenido',
      'Gestión de redes sociales',
      'Diseño gráfico especializado',
    ],
    image: serviceDigital,
    side: 'left',
  },
  {
    number: '02',
    kicker: 'Google Search',
    title: 'Posicionamiento que te hace visible',
    text: 'Aparece en los primeros resultados cuando tus clientes buscan propiedades como las tuyas.',
    bullets: [
      'Optimización SEO',
      'Fichas de Google Business',
      'Contenido optimizado',
    ],
    image: serviceSeo,
    side: 'right',
  },
  {
    number: '03',
    kicker: 'Campañas digitales',
    title: 'Convierte la atención en oportunidades',
    text: 'Campañas en Facebook, Instagram, Google y WhatsApp para atraer prospectos calificados.',
    bullets: [
      'Anuncios segmentados',
      'Generación de leads',
      'Integración con WhatsApp',
    ],
    image: serviceCampaigns,
    side: 'left',
  },
  {
    number: '04',
    kicker: 'Video y fotografía',
    title: 'Imágenes que capturan el valor de cada propiedad.',
    text: 'Fotografía, video, tomas con dron y producción audiovisual profesional para mostrar lo mejor de cada propiedad.',
    bullets: [
      'Fotografía profesional',
      'Video para redes y pauta',
      'Tomas aéreas con dron',
    ],
    image: serviceVideo,
    side: 'right',
  },
];

const contentCards = [
  { image: contentPhoto, label: 'Fotografía', icon: 'fa-camera' },
  { image: contentVideo, label: 'Video', icon: 'fa-video' },
  { image: contentCampaign, label: 'Campañas', icon: 'fa-bullhorn' },
  { image: contentDrone, label: 'Dron', icon: 'fa-drone' },
  { image: contentReels, label: 'Reels', icon: 'fa-photo-film' },
];

const processSteps = [
  {
    icon: 'fa-headset',
    title: 'Escuchamos',
    text: 'Conocemos tu proyecto y objetivos.',
  },
  {
    icon: 'fa-compass-drafting',
    title: 'Estrategia',
    text: 'Definimos el plan y los canales.',
  },
  {
    icon: 'fa-cloud-arrow-up',
    title: 'Publicación',
    text: 'Ejecutamos campañas digitales.',
  },
  {
    icon: 'fa-chart-line',
    title: 'Resultados',
    text: 'Medimos, optimizamos y escalamos.',
  },
];

const ctaFeatures = [
  {
    icon: 'fa-bullseye-arrow',
    title: 'Estrategias',
    text: 'enfocadas en resultados',
  },
  {
    icon: 'fa-chart-column',
    title: 'Mayor visibilidad',
    text: 'para tus proyectos',
  },
  {
    icon: 'fa-bullhorn',
    title: 'Campañas que',
    text: 'generan oportunidades',
  },
  {
    icon: 'fa-users',
    title: 'Acompañamiento',
    text: 'especializado',
  },
];

function Marketing() {
  return (
    <div className="marketing-page">
      <SEO
        title="Brickly Marketing"
        description="Marketing digital inmobiliario: contenido, redes sociales, posicionamiento en Google, campañas digitales, fotografía, video y tomas con dron para proyectos inmobiliarios."
        url="https://www.bricklyhomes.com/servicios/marketing"
      />

      <section className="mkt-hero">
        <picture className="mkt-hero__media" aria-hidden="true">
          <source media="(max-width: 991.98px)" srcSet={heroImageMobile} />
          <img src={heroImage} alt="" className="mkt-hero__image" fetchPriority="high" />
        </picture>

        <div className="mkt-container mkt-hero__content" data-aos="fade-up">
          <h1 className="mkt-hero__title">
            <span className="mkt-hero__brand">Brickly</span>
            <span className="mkt-hero__word">Marketing</span>
          </h1>
          <p className="mkt-hero__text">
            Contenido que resalta el valor
            <br className="mkt-hero__text-break" /> de tus proyectos.
          </p>
          <a
            className="mkt-btn mkt-btn--blue"
            href={heroWhatsappUrl}
            target="_blank"
            rel="noreferrer"
          >
            <span className="mkt-btn__icon" aria-hidden="true">
              <i className="fa-brands fa-whatsapp"></i>
            </span>
            <span className="mkt-btn__label">Hablemos de tu proyecto por WhatsApp</span>
            <i className="fa-solid fa-arrow-right mkt-btn__arrow" aria-hidden="true"></i>
          </a>
        </div>
      </section>

      <section className="mkt-stats">
        <div className="mkt-container mkt-stats__grid">
          {stats.map((stat, index) => (
            <article
              className="mkt-stat"
              key={stat.label}
              data-aos="fade-up"
              data-aos-delay={index * 100}
            >
              <i className={`fa-solid ${stat.icon} mkt-stat__icon`} aria-hidden="true"></i>
              <p className="mkt-stat__value">{stat.value}</p>
              <p className="mkt-stat__label">{stat.label}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mkt-services">
        <div className="mkt-container">
          <div className="mkt-section-head" data-aos="fade-up">
            <div>
              <p className="mkt-eyebrow">Nuestros servicios</p>
              <h2 className="mkt-section-title">Marketing digital inmobiliario</h2>
            </div>
            <a
              className="mkt-btn mkt-btn--blue mkt-btn--small"
              href={evaluationWhatsappUrl}
              target="_blank"
              rel="noreferrer"
            >
              <span className="mkt-btn__label">Solicita una evaluación</span>
              <i className="fa-solid fa-arrow-right mkt-btn__arrow" aria-hidden="true"></i>
            </a>
          </div>

          <div className="mkt-services__list">
            {services.map((service) => {
              const media = (
                <div className="mkt-service__media" key={`${service.number}-media`}>
                  <img src={service.image} alt={service.kicker} loading="lazy" />
                </div>
              );

              const body = (
                <div className="mkt-service__body" key={`${service.number}-body`}>
                  <div className="mkt-service__head">
                    <span className="mkt-service__number">{service.number}</span>
                    <span className="mkt-service__kicker">{service.kicker}</span>
                  </div>
                  <h3 className="mkt-service__title">{service.title}</h3>
                  <p className="mkt-service__text">{service.text}</p>
                  <div className="mkt-service__list">
                    {service.bullets.map((bullet) => (
                      <span className="mkt-service__item" key={bullet}>
                        <i className="fa-solid fa-circle-check" aria-hidden="true"></i>
                        {bullet}
                      </span>
                    ))}
                  </div>
                </div>
              );

              return (
                <article
                  className={`mkt-service${service.side === 'right' ? ' mkt-service--reverse' : ''}`}
                  key={service.number}
                  data-aos="fade-up"
                >
                  {service.side === 'right' ? (
                    <>
                      {body}
                      {media}
                    </>
                  ) : (
                    <>
                      {media}
                      {body}
                    </>
                  )}
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="mkt-content">
        <div className="mkt-container">
          <h2 className="mkt-section-title" data-aos="fade-up">
            Contenido que vende
          </h2>
          <p className="mkt-content__lead" data-aos="fade-up" data-aos-delay="100">
            Fotografías, videos, reels, tomas con dron y <strong>campañas digitales reales</strong> de proyectos inmobiliarios.
          </p>

          <div className="mkt-content__grid">
            {contentCards.map((card, index) => (
              <article
                className="mkt-content-card"
                key={card.label}
                data-aos="fade-up"
                data-aos-delay={index * 80}
              >
                <img src={card.image} alt={card.label} loading="lazy" />
                <span className="mkt-content-card__label">
                  <i className={`fa-solid ${card.icon}`} aria-hidden="true"></i>
                  {card.label}
                </span>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mkt-process">
        <div className="mkt-container mkt-process__inner">
          <div className="mkt-process__copy" data-aos="fade-right">
            <p className="mkt-eyebrow">Cómo trabajamos</p>
            <h2 className="mkt-process__title">
              De la idea
              <br />
              a los resultados
            </h2>
            <p className="mkt-process__text">
              Un proceso integral para que tu proyecto inmobiliario destaque y
              genere oportunidades reales de venta.
            </p>
          </div>

          <div className="mkt-process__grid">
            {processSteps.map((step, index) => (
              <article
                className="mkt-step"
                key={step.title}
                data-aos="fade-up"
                data-aos-delay={index * 100}
              >
                <span className="mkt-step__icon" aria-hidden="true">
                  <i className={`fa-solid ${step.icon}`}></i>
                </span>
                <div>
                  <h3 className="mkt-step__title">{step.title}</h3>
                  <p className="mkt-step__text">{step.text}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mkt-cta">
        <picture className="mkt-cta__media" aria-hidden="true">
          <source media="(max-width: 991.98px)" srcSet={contactImageMobile} />
          <img src={contactImage} alt="" loading="lazy" />
        </picture>

        <div className="mkt-container mkt-cta__inner" data-aos="fade-up">
          <p className="mkt-eyebrow">¿Por qué elegirnos?</p>
          <h2 className="mkt-cta__title">
            Tu proyecto merece ser visto.
            <br />
            Nosotros hacemos que
            <br className="mkt-cta__title-break" />{' '}
            destaque.
          </h2>

          <div className="mkt-cta__features">
            {ctaFeatures.map((feature) => (
              <article className="mkt-cta-feature" key={feature.title}>
                <span className="mkt-cta-feature__icon" aria-hidden="true">
                  <i className={`fa-solid ${feature.icon}`}></i>
                </span>
                <p>
                  <strong>{feature.title}</strong>
                  <br />
                  {feature.text}
                </p>
              </article>
            ))}
          </div>

          <div className="mkt-cta__actions">
            <a
              className="mkt-btn mkt-btn--blue mkt-btn--cta"
              href={contactWhatsappUrl}
              target="_blank"
              rel="noreferrer"
            >
              <span className="mkt-btn__icon" aria-hidden="true">
                <i className="fa-brands fa-whatsapp"></i>
              </span>
              <span className="mkt-btn__divider" aria-hidden="true"></span>
              <span className="mkt-btn__label">Hablemos de tu proyecto por WhatsApp</span>
              <i className="fa-solid fa-arrow-right-long mkt-btn__arrow" aria-hidden="true"></i>
            </a>

            <a
              className="mkt-phone"
              href={`https://wa.me/${WHATSAPP_NUMBER}`}
              target="_blank"
              rel="noreferrer"
            >
              <span>WhatsApp directo</span>
              <strong>+502 3764-9719</strong>
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}

export default Marketing;
