import { Container } from 'react-bootstrap';
import SEO from '../components/SEO';

function About() {
  return (
    <>
      <SEO
        title="Sobre Nosotros"
        description="Conoce Brickly Homes, la plataforma inmobiliaria líder en Guatemala. Nuestra misión es conectar a compradores e inquilinos con las mejores propiedades del país."
        url="https://www.bricklyhomes.com/about"
      />
      <Container>
        <h1>📖 Acerca de</h1>
        <p>Esta es la segunda página funcionando.</p>
      </Container>
    </>
  );
}

export default About;