import 'bootstrap/dist/css/bootstrap.min.css';
import 'alertifyjs/build/css/alertify.css';
import 'alertifyjs/build/css/themes/default.css';
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
// FontAwesome: importar base (font-face) + solo los estilos que se usan
import './assets/fontawesome/css/fontawesome.min.css';
import './assets/fontawesome/css/solid.min.css';
import './assets/fontawesome/css/regular.min.css';
import './assets/fontawesome/css/brands.min.css';
import './assets/fontawesome/css/duotone.min.css';

import React, { useState, Suspense, lazy } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import I18nProvider from './i18n/I18nProvider';
import { CurrencyProvider } from './context/CurrencyContext';

import Layout from './components/layout.jsx';
import ScrollToTop from './components/ScrollToTop';
import './index.css';

/* Lazy loaded pages - se cargan solo cuando se navega a ellas */
const Home = lazy(() => import('./pages/home.jsx'));
const Propiedades = lazy(() => import('./pages/properties/propiedades.jsx'));
const UltimasPropiedades = lazy(() => import('./pages/properties/ultimaspropiedades.jsx'));
const Propiedad = lazy(() => import('./pages/properties/propiedad.jsx'));
const Favoritos = lazy(() => import('./pages/favoritos.jsx'));
const Precios = lazy(() => import('./pages/precios.jsx'));
const Profile = lazy(() => import('./pages/profile.jsx'));
const Arquitectos = lazy(() => import('./pages/architects/arquitectos.jsx'));
const Profilearchitect = lazy(() => import('./pages/architects/profilearchitect.jsx'));
const Projectarchitect = lazy(() => import('./pages/architects/projectarchitect.jsx'));
const Project = lazy(() => import('./pages/projects/proyectos.jsx'));
const Apartament = lazy(() => import('./pages/projects/apartament.jsx'));
const Floor = lazy(() => import('./pages/projects/floor.jsx'));
const SearchAgent = lazy(() => import('./pages/agents/searchagent.jsx'));
const ProfileAgent = lazy(() => import('./pages/agents/profileagent.jsx'));
const ProfileAgency = lazy(() => import('./pages/agency/profileagency.jsx'));
const Associates = lazy(() => import('./pages/associates.jsx'));
const Term = lazy(() => import('./pages/TyC/term&cond.jsx'));
const Document = lazy(() => import('./pages/TyC/document.jsx'));
const Blog = lazy(() => import('./pages/blog.jsx'));
const About = lazy(() => import('./pages/about.jsx'));
const Login = lazy(() => import('./pages/login.jsx'));
const Register = lazy(() => import('./pages/register.jsx'));
const ForgotPassword = lazy(() => import('./pages/forgotPassword.jsx'));

/* cpanel - lazy loaded */
const LayoutCpanel = lazy(() => import('./cpanel/pages/cpanelLayout.jsx'));
const CpanelHome = lazy(() => import('./cpanel/pages/home.jsx'));
const CpPropiedades = lazy(() => import('./cpanel/pages/propiedades/index.jsx'));
const CpAddPropiedades = lazy(() => import('./cpanel/pages/propiedades/add.jsx'));
const CpEditPropiedades = lazy(() => import('./cpanel/pages/propiedades/edit.jsx'));
const CpViewPropiedades = lazy(() => import('./cpanel/pages/propiedades/view.jsx'));
const CpPlanesPropiedades = lazy(() => import('./cpanel/pages/propiedades/planes.jsx'));
const CpAgentes = lazy(() => import('./cpanel/pages/agentes/index.jsx'));
const CpAddAgentes = lazy(() => import('./cpanel/pages/agentes/add.jsx'));
const CpEditAgentes = lazy(() => import('./cpanel/pages/agentes/edit.jsx'));
const CpDestacarAgentes = lazy(() => import('./cpanel/pages/agentes/destacar.jsx'));
const CpConfig = lazy(() => import('./cpanel/pages/config.jsx'));
const CpUsers = lazy(() => import('./cpanel/pages/users/index.jsx'));
const CpAddUsers = lazy(() => import('./cpanel/pages/users/add.jsx'));
const CpEditUsers = lazy(() => import('./cpanel/pages/users/edit.jsx'));
const CpanelMetricas = lazy(() => import('./cpanel/pages/metricas/index.jsx'));
const CpanelIntegra = lazy(() => import('./cpanel/pages/integraciones/index.jsx'));
const CpProyectos = lazy(() => import('./cpanel/pages/proyectos/index.jsx'));
const CpAddProyectos = lazy(() => import('./cpanel/pages/proyectos/add.jsx'));
const CpEditProyectos = lazy(() => import('./cpanel/pages/proyectos/edit.jsx'));
const CpViewProyectos = lazy(() => import('./cpanel/pages/proyectos/view.jsx'));
const CpLeads = lazy(() => import('./cpanel/pages/leads/index.jsx'));
const CpFavoritosProyectos = lazy(() => import('./cpanel/pages/proyectos/favoritos.jsx'));
const CpSubsAgency = lazy(() => import('./cpanel/pages/agencia/subsAgency.jsx'));
const CpSubsArchitect = lazy(() => import('./cpanel/pages/arquitectos/subsArchitect.jsx'));
const CpAsociados = lazy(() => import('./cpanel/pages/asociados/index.jsx'));
const CpAyuda = lazy(() => import('./cpanel/pages/ayuda/index.jsx'));
const CpAddAsociados = lazy(() => import('./cpanel/pages/asociados/add.jsx'));
const CpEditAsociados = lazy(() => import('./cpanel/pages/asociados/edit.jsx'));
const CpDestacados = lazy(() => import('./cpanel/pages/destacados/index.jsx'));
const CpVerificacion = lazy(() => import('./cpanel/pages/verificacion/index.jsx'));

// Componente de carga mientras se descarga el chunk
function PageLoader() {
  return (
    <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
      <div className="text-center">
        <div className="spinner-border text-dark" role="status">
          <span className="visually-hidden">Cargando...</span>
        </div>
      </div>
    </div>
  );
}

const App = () => {

  // Cargar idioma guardado o usar español por defecto
  const [locale, setLocale] = useState(() => {
    const saved = localStorage.getItem('selectedLang');
    return saved || 'es';
  });

  return (
    <HelmetProvider>
    <I18nProvider locale={locale} onLocaleChange={setLocale}>
      <CurrencyProvider>
      <BrowserRouter basename={import.meta.env.VITE_BASE_PATH || '/'}>
        <ScrollToTop />
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Rutas Públicas */}
            <Route path="/" element={<Layout />}>
              <Route index element={<Home />} />
              <Route path="home" element={<Home />} />
              <Route path="propiedades" element={<Propiedades />} />
              <Route path="propiedades/:slug" element={<Propiedad />} />
              <Route path="ultimas-propiedades" element={<UltimasPropiedades />} />
              <Route path="propiedad/:id" element={<Propiedad />} />
              <Route path="arquitectos" element={<Arquitectos />} />
              <Route path="arquitectos/perfil/:id" element={<Profilearchitect />} />
              <Route path="arquitectos/proyecto/:id" element={<Projectarchitect />} />
              <Route path="arquitectos/:slug" element={<Profilearchitect />} />
              <Route path="proyectos" element={<Project />} />
              <Route path="proyectos/apartamento/:id" element={<Apartament />} />
              <Route path="proyectos/apartamento/piso" element={<Floor />} />
              <Route path="favoritos" element={<Favoritos />} />
              <Route path="precios" element={<Precios />} />
              <Route path="agentes" element={<SearchAgent />} />
              <Route path="agentes/perfil/:id" element={<ProfileAgent />} />
              <Route path="agencias/perfil/:id" element={<ProfileAgency />} />
              <Route path="agentes/:agencySlug/:slug" element={<ProfileAgent />} />
              <Route path="agentes/:slug" element={<ProfileAgent />} />
              <Route path="agencias/:slug" element={<ProfileAgency />} />
              <Route path="asociados" element={<Associates />} />
              <Route path="terms" element={<Term />} />
              <Route path="terms/details" element={<Document />} />
              <Route path="blog" element={<Blog />} />
              <Route path="about" element={<About />} />
              <Route path="login" element={<Login />} />
              <Route path="registro" element={<Register />} />
              <Route path="recuperar-contrasena" element={<ForgotPassword />} />
              <Route path="perfil" element={<Profile />} />
            </Route>

            {/* Rutas del CPanel */}
            <Route path="/cpanel" element={<LayoutCpanel />}>
              <Route index element={<CpanelHome />} />
              <Route path="home" element={<CpanelHome />} />
              <Route path="destacados" element={<CpDestacados />} />
              <Route path="config" element={<CpConfig />} />
              <Route path="propiedades" element={<CpPropiedades />} />
              <Route path="propiedades/add" element={<CpAddPropiedades />} />
              <Route path="propiedades/edit/:id" element={<CpEditPropiedades />} />
              <Route path="propiedades/view/:id" element={<CpViewPropiedades />} />
              <Route path="propiedades/planes" element={<CpPlanesPropiedades />} />
              <Route path="agentes" element={<CpAgentes />} />
              <Route path="agentes/add" element={<CpAddAgentes />} />
              <Route path="agentes/edit/:id" element={<CpEditAgentes />} />
              <Route path="agentes/planes" element={<CpDestacarAgentes />} />
              <Route path="leads" element={<CpLeads />} />
              <Route path="users" element={<CpUsers />} />
              <Route path="users/add" element={<CpAddUsers />} />
              <Route path="users/edit/:id" element={<CpEditUsers />} />
              <Route path="metricas" element={<CpanelMetricas />} />
              <Route path="integraciones" element={<CpanelIntegra />} />
              <Route path="proyectos" element={<CpProyectos />} />
              <Route path="proyectos/add" element={<CpAddProyectos />} />
              <Route path="proyectos/edit/:id" element={<CpEditProyectos />} />
              <Route path="proyectos/view/:id" element={<CpViewProyectos />} />
              <Route path="proyectos/favoritos" element={<CpFavoritosProyectos />} />
              <Route path="agencia/suscripcion" element={<CpSubsAgency />} />
              <Route path="arquitectos/suscripcion" element={<CpSubsArchitect />} />
              <Route path="asociados" element={<CpAsociados />} />
              <Route path="asociados/add" element={<CpAddAsociados />} />
              <Route path="asociados/edit/:id" element={<CpEditAsociados />} />
              <Route path="verificacion" element={<CpVerificacion />} />
              <Route path="ayuda" element={<CpAyuda />} />
            </Route>

          </Routes>
        </Suspense>
      </BrowserRouter>
      </CurrencyProvider>
    </I18nProvider>
    </HelmetProvider>
  );
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
