import { useState } from 'react';
import { Button, Row, Col } from 'react-bootstrap';
import { amenitiesList } from '../data/amenites';

function SelectorAmenidades({ value = {}, onChange, filter = null }) {
  const [selected, setSelected] = useState(value);

  // Función para generar key a partir del nombre
  const getKeyFromName = (name) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '') // Eliminar caracteres especiales
      .replace(/[áéíóú]/g, (char) => { // Reemplazar vocales acentuadas
        const map = { 'á': 'a', 'é': 'e', 'í': 'i', 'ó': 'o', 'ú': 'u' };
        return map[char] || char;
      });
  };

  const handleToggle = (amenidadName) => {
    const key = getKeyFromName(amenidadName);
    
    setSelected(prev => {
      const newSelected = {
        ...prev,
        [key]: !prev[key]
      };
      onChange(newSelected);
      return newSelected;
    });
  };

  const isSelected = (amenidadName) => {
    const key = getKeyFromName(amenidadName);
    return !!selected[key];
  };

  const visibleAmenities = filter
    ? amenitiesList.filter(name => filter.includes(getKeyFromName(name)))
    : amenitiesList;

  return (
    <Row className="g-2">
      {visibleAmenities.map((amenidadName, index) => (
        <Col key={index} xs="auto">
          <Button
            variant={isSelected(amenidadName) ? 'dark' : 'outline-secondary'}
            className="mb-2 text-center rounded-4"
            onClick={() => handleToggle(amenidadName)}
            style={{
              whiteSpace: 'nowrap',
              height: 'auto',
              padding: '8px 12px',
              fontSize: '14px'
            }}
          >
            {amenidadName}
          </Button>
        </Col>
      ))}
    </Row>
  );
}

export default SelectorAmenidades;