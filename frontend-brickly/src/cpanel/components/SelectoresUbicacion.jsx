import React, { useState } from 'react';
import { Col, Form } from 'react-bootstrap';
import {
  getDepartamentos,
  getAllMunicipios,
  getAllZonas,
} from './../data/guatemalaData';

const SelectoresUbicacion = ({ valores, onChange }) => {
  const [departamento, setDepartamento] = useState(valores?.department || '');
  const [municipio, setMunicipio] = useState(valores?.municipality || '');
  const [zona, setZona] = useState(valores?.zone || '');

  const municipiosDisponibles = getAllMunicipios();
  const zonasDisponibles = getAllZonas();

  const notificar = (nuevosValores) => {
    if (onChange) {
      onChange(nuevosValores);
    }
  };

  const handleDepartamentoChange = (e) => {
    const nuevoDepto = e.target.value;
    setDepartamento(nuevoDepto);
    notificar({
      department: nuevoDepto,
      municipality: municipio,
      zone: zona,
    });
  };

  const handleMunicipioChange = (e) => {
    const nuevoMunicipio = e.target.value;
    setMunicipio(nuevoMunicipio);
    notificar({
      department: departamento,
      municipality: nuevoMunicipio,
      zone: zona,
    });
  };

  const handleZonaChange = (e) => {
    const nuevaZona = e.target.value;
    setZona(nuevaZona);
    notificar({
      department: departamento,
      municipality: municipio,
      zone: nuevaZona,
    });
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
            {getDepartamentos().map((depto) => (
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