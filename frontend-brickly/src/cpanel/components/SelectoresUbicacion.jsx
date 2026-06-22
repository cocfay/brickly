import React, { useState, useEffect } from 'react';
import { Col, Form } from 'react-bootstrap';
import { 
  getDepartamentos, 
  getMunicipiosByDepartamento,
  getZonasByDepartamento 
} from './../data/guatemalaData';

const SelectoresUbicacion = ({ valores, onChange }) => {
  const [departamento, setDepartamento] = useState(valores?.department || '');
  const [municipio, setMunicipio] = useState(valores?.municipality || '');
  const [zona, setZona] = useState(valores?.zone || '');
  
  const [municipiosDisponibles, setMunicipiosDisponibles] = useState([]);
  const [zonasDisponibles, setZonasDisponibles] = useState([]);

  const departamentos = getDepartamentos();

  // Efecto para municipios
  useEffect(() => {
    if (departamento) {
      setMunicipiosDisponibles(getMunicipiosByDepartamento(departamento));
    } else {
      setMunicipiosDisponibles([]);
    }
  }, [departamento]);

  // Efecto para zonas
  useEffect(() => {
    if (municipio && departamento) {
      setZonasDisponibles(getZonasByDepartamento(departamento));
    } else {
      setZonasDisponibles([]);
    }
  }, [municipio, departamento]);

  // NOTA: Eliminamos el useEffect que sincronizaba con valores
  // Esto evita que se reinicien cuando el padre se actualiza

  const handleDepartamentoChange = (e) => {
    const nuevoDepto = e.target.value;
    setDepartamento(nuevoDepto);
    
    if (nuevoDepto === 'Ninguno') {
      // Si selecciona "Ninguno", auto-completar municipio y zona también como "Ninguno"
      setMunicipio('Ninguno');
      setZona('Ninguno');
      if (onChange) {
        onChange({
          department: 'Ninguno',
          municipality: 'Ninguno',
          zone: 'Ninguno'
        });
      }
    } else {
      setMunicipio('');
      setZona('');
      if (onChange) {
        onChange({
          department: nuevoDepto,
          municipality: '',
          zone: ''
        });
      }
    }
  };

  const handleMunicipioChange = (e) => {
    const nuevoMunicipio = e.target.value;
    setMunicipio(nuevoMunicipio);
    setZona('');
    
    if (onChange) {
      onChange({
        department: departamento,
        municipality: nuevoMunicipio,
        zone: ''
      });
    }
  };

  const handleZonaChange = (e) => {
    const nuevaZona = e.target.value;
    setZona(nuevaZona);
    
    if (onChange) {
      onChange({
        department: departamento,
        municipality: municipio,
        zone: nuevaZona
      });
    }
  };

  return (
    <>
      <Col xl={2} lg={6} md={6}>
        <Form.Group controlId="departamento">
          <Form.Label>Departamento *</Form.Label>
          <Form.Select 
            value={departamento}
            onChange={handleDepartamentoChange}
            name='department'
          >
            <option value="">Seleccione...</option>
            <option value="Ninguno">Ninguno</option>
            {departamentos.map((depto) => (
              <option key={depto} value={depto}>{depto}</option>
            ))}
          </Form.Select>
        </Form.Group>
      </Col>

      <Col xl={2} lg={6} md={6}>
        <Form.Group controlId="municipio">
          <Form.Label>Municipio *</Form.Label>
          <Form.Select 
            value={municipio}
            onChange={handleMunicipioChange}
            disabled={!departamento}
            name='municipality'
          >
            <option value="">Seleccione...</option>
            <option value="Ninguno">Ninguno</option>
            {municipiosDisponibles.map((mun) => (
              <option key={mun} value={mun}>{mun}</option>
            ))}
          </Form.Select>
        </Form.Group>
      </Col>

      <Col xl={2} lg={6} md={6}>
        <Form.Group controlId="zona">
          <Form.Label>Zona *</Form.Label>
          <Form.Select 
            value={zona}
            onChange={handleZonaChange}
            disabled={!municipio}
            name='zone'
          >
            <option value="">Seleccione...</option>
            <option value="Ninguno">Ninguno</option>
            {zonasDisponibles.map((z) => (
              <option key={z} value={z}>{z}</option>
            ))}
          </Form.Select>
        </Form.Group>
      </Col>
    </>
  );
};

export default SelectoresUbicacion;