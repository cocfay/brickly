import { Helmet } from 'react-helmet-async';
import { useLocation } from 'react-router-dom';
import { META_BY_PATH, normalizeMetaPath } from '../utils/metaSitemap';

const SITE_NAME = 'Brickly Homes';
const SITE_URL = 'https://www.bricklyhomes.com';
const DEFAULT_DESCRIPTION = 'Brickly Homes - El marketplace inmobiliario de Guatemala. Encuentra propiedades en venta y alquiler: casas, apartamentos, terrenos, oficinas y más. Conecta con agentes, agencias y proyectos inmobiliarios.';
const DEFAULT_IMAGE = '/favicon.png';

export default function SEO({
  title,
  description = DEFAULT_DESCRIPTION,
  image = DEFAULT_IMAGE,
  url = SITE_URL,
  type = 'website',
  noindex = false,
}) {
  // Meta title/description provistos por el Excel del sitemap (tienen prioridad
  // para las URLs listadas allí). El título del Excel ya incluye la marca.
  const location = useLocation();
  const override = META_BY_PATH[normalizeMetaPath(location?.pathname)];

  const fullTitle = override?.title || (title ? `${title} | ${SITE_NAME}` : SITE_NAME);
  const finalDescription = override?.description || description;

  return (
    <Helmet>
      {/* Title */}
      <title>{fullTitle}</title>
      <meta property="og:title" content={fullTitle} />
      <meta name="twitter:title" content={fullTitle} />

      {/* Description */}
      <meta name="description" content={finalDescription} />
      <meta property="og:description" content={finalDescription} />
      <meta name="twitter:description" content={finalDescription} />

      {/* Robots */}
      {noindex && <meta name="robots" content="noindex, follow" />}

      {/* URL */}
      <meta property="og:url" content={url} />
      <link rel="canonical" href={url} />

      {/* Image */}
      <meta property="og:image" content={image} />
      <meta name="twitter:image" content={image} />

      {/* Type */}
      <meta property="og:type" content={type} />
      <meta name="twitter:card" content="summary_large_image" />

      {/* Site name */}
      <meta property="og:site_name" content={SITE_NAME} />

      {/* Language */}
      <meta property="og:locale" content="es_GT" />
    </Helmet>
  );
}
