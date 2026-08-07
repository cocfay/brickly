import { useState, useRef } from 'react';
import { Row, Col, Form, Button, Badge, Card, Collapse } from 'react-bootstrap';
import SelectorAmenidades from '../../components/SelectorAmenidades';
import { AMENIDADES_MODELO } from '../../data/amenites';

// ─── Configuración por tipo de modelo ────────────────────────────────────────

const DISTRIBUCION_APARTAMENTO = [
  { key: 'totalAmbientes', label: 'Total de ambientes *', col: 4 },
  { key: 'dormitorios', label: 'Dormitorios *', col: 4 },
  { key: 'banosCompletos', label: 'Baños completos *', col: 4 },
  { key: 'mediosBanos', label: 'Medios baños', col: 4 },
  { key: 'habitacionServicio', label: 'Habitación de servicio', col: 4, select: ['Con baño propio', 'Solo habitación', 'No tiene'] },
  { key: 'pergolaDeck', label: 'Pérgola / Deck social', col: 4, select: ['Si', 'No'] },
  { key: 'parqueo', label: 'Parqueo / Driveway', col: 4 },
  { key: 'amueblado', label: 'Amueblado / No amueblado', col: 4, select: ['Si', 'No'] },
  { key: 'areaLavanderia', label: 'Área de lavandería', col: 4, select: ['Techada', 'Al aire libre', 'Closet de lavandería (Torre)'] },
  { key: 'estudioOficina', label: 'Estudio / Oficina', col: 4, select: ['Si', 'No'] },
  { key: 'salaFamiliar', label: 'Sala familiar', col: 4, select: ['Independiente de la sala principal', 'Sala/Comedor integrados', 'Sala de visitas', 'Solo sala Principal'] },
];

const DISTRIBUCION_BODEGA = [
  { key: 'totalAmbientes', label: 'Total de ambientes *', col: 4 },
  { key: 'oficina', label: 'Oficina', col: 4, select: ['Si', 'No'] },
  { key: 'banosCompletos', label: 'Baños completos *', col: 4 },
  { key: 'mediosBanos', label: 'Medios baños', col: 4 },
  { key: 'habitacionServicio', label: 'Habitación de servicio', col: 4, select: ['Con baño propio', 'Solo habitación', 'No tiene'] },
  { key: 'areaDescarga', label: 'Área de descarga', col: 4, select: ['Si', 'No'] },
  { key: 'helipuerto', label: 'Helipuerto', col: 4, select: ['Si', 'No'] },
  { key: 'mezzanine', label: 'Mezzanine', col: 4, select: ['Si', 'No'] },
];

const GASTOS_FIJOS = [
  { key: 'tipoEstufa', label: 'Tipo de estufa', col: 4, select: ['Gas Propano (Tambo)', 'Gas Centralizado (Contador)', 'Eléctrica 220v', 'Inducción'] },
  { key: 'servicioAgua', label: 'Servicio de agua', col: 4, select: ['Público', 'Pozo propio del condominio', 'Empresa privada'] },
  { key: 'mantenimientoUSD', label: 'Mantenimiento $', col: 4, type: 'priceUSD' },
  { key: 'mantenimientoQ', label: 'Mantenimiento Q', col: 4, type: 'priceQ' },
];

const INCLUYE = [
  { key: 'iusi', label: 'IUSI', col: 4, select: ['Trimestral', 'Anual', 'Incluido'] },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

const genUid = () => `model-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

const nuevoModelo = (tipo = 'Apartamento') => ({
  uid: genUid(),
  tipo,
  nombre: '',
  precioDesdeQ: '',
  tasa: '',
  precioDesdeUSD: '',
  descripcion: '',
  areas: { areaConstruccionM2: '', espacioAlmacenamiento: '' },
  estructura: { alturaCielo: '' },
  distribucion: {
    totalAmbientes: '',
    dormitorios: '',
    banosCompletos: '',
    mediosBanos: '',
    habitacionServicio: '',
    pergolaDeck: '',
    parqueo: '',
    amueblado: '',
    areaLavanderia: '',
    estudioOficina: '',
    salaFamiliar: '',
    oficina: '',
    areaDescarga: '',
    helipuerto: '',
    mezzanine: '',
  },
  gastosFijos: { tipoEstufa: '', servicioAgua: '', mantenimientoUSD: '', mantenimientoQ: '' },
  incluye: { iusi: '' },
  amenities: {},
  fotos: [],
  tour360: '',
});

export const modelosValidos = (modelos) => {
  return (modelos || []).every((m) => {
    if (!m.nombre || !m.precioDesdeQ || !m.tasa || !m.precioDesdeUSD || !m.descripcion) return false;
    if (!m.distribucion?.totalAmbientes || !m.distribucion?.banosCompletos) return false;
    if (m.tipo === 'Apartamento' && !m.distribucion?.dormitorios) return false;
    return true;
  });
};

export const modelosFaltantes = (modelos) => {
  const faltantes = [];
  (modelos || []).forEach((m, idx) => {
    const ref = `Modelo ${idx + 1}`;
    if (!m.nombre) faltantes.push(`Nombre (${ref})`);
    if (!m.precioDesdeQ) faltantes.push(`Precio Q (${ref})`);
    if (!m.tasa) faltantes.push(`Tasa ($) (${ref})`);
    if (!m.precioDesdeUSD) faltantes.push(`Precio $ (${ref})`);
    if (!m.descripcion) faltantes.push(`Descripción (${ref})`);
    if (!m.distribucion?.totalAmbientes) faltantes.push(`Total de ambientes (${ref})`);
    if (!m.distribucion?.banosCompletos) faltantes.push(`Baños completos (${ref})`);
    if (m.tipo === 'Apartamento' && !m.distribucion?.dormitorios) faltantes.push(`Dormitorios (${ref})`);
  });
  return faltantes;
};

const formatGTQ = (val) => {
  const num = String(val).replace(/[^0-9]/g, '');
  if (!num) return '';
  return 'Q ' + num.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

const formatUSD = (val) => {
  const num = String(val).replace(/[^0-9]/g, '');
  if (!num) return '';
  return '$ ' + num.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

// ─── Sub-componente: selector de fotos del modelo ────────────────────────────

function FotosModelo({ fotos = [], onChange }) {
  const [isOver, setIsOver] = useState(false);
  const inputRef = useRef(null);

  const handleFiles = (files) => {
    if (!files || files.length === 0) return;
    const arrayFiles = Array.from(files);
    const nuevas = arrayFiles.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
      path: null,
      uploading: false,
    }));
    onChange([...fotos, ...nuevas]);
  };

  const handleRemove = (index) => {
    const img = fotos[index];
    if (img?.preview?.startsWith('blob:')) URL.revokeObjectURL(img.preview);
    onChange(fotos.filter((_, i) => i !== index));
  };

  return (
    <div>
      <div
        className={`border-2 rounded-4 d-flex flex-column align-items-center justify-content-center p-4 position-relative`}
        style={{
          minHeight: '140px',
          cursor: 'pointer',
          borderStyle: 'dashed',
          borderColor: isOver ? '#0d6efd' : '#adb5bd',
          backgroundColor: isOver ? 'rgba(13, 110, 253, 0.05)' : '#f8f9fa',
        }}
        onDragOver={(e) => { e.preventDefault(); setIsOver(true); }}
        onDragLeave={() => setIsOver(false)}
        onDrop={(e) => { e.preventDefault(); setIsOver(false); handleFiles(e.dataTransfer.files); }}
        onClick={() => inputRef.current?.click()}
      >
        <i className={`fa-solid fa-cloud-arrow-up fs-2 mb-2 ${isOver ? 'text-primary' : 'text-secondary'}`}></i>
        <span className="text-muted small text-center">
          {`Arrastra o haz clic para agregar fotos (${fotos.length} cargadas)`}
        </span>
        <input
          type="file"
          multiple
          ref={inputRef}
          accept="image/*"
          style={{ display: 'none' }}
          onChange={(e) => { handleFiles(e.target.files); e.target.value = ''; }}
        />
      </div>

      {fotos.length > 0 && (
        <div className="d-flex flex-wrap gap-2 mt-2">
          {fotos.map((img, index) => (
            <div key={index} className="position-relative" style={{ width: '90px', height: '90px' }}>
              <img
                src={img.preview}
                alt=""
                style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px' }}
              />
              <button
                type="button"
                className="btn btn-danger btn-sm position-absolute top-0 end-0 m-1 rounded-circle d-flex align-items-center justify-content-center"
                style={{ width: '24px', height: '24px', padding: 0 }}
                onClick={() => handleRemove(index)}
              >
                <i className="fa-solid fa-times" style={{ fontSize: '11px' }}></i>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Sub-componente: formulario de un modelo ─────────────────────────────────

function Campo({ label, children }) {
  return (
    <Col xl={3} lg={6} md={6}>
      <Form.Group className="mb-3">
        <Form.Label>{label}</Form.Label>
        {children}
      </Form.Group>
    </Col>
  );
}

function ModeloForm({ modelo, index, tipoModelo, onChange, onRemove }) {
  const [open, setOpen] = useState(index === 0);

  const set = (patch) => onChange({ ...modelo, ...patch });

  const setSub = (sub, key, value) =>
    set({ [sub]: { ...(modelo[sub] || {}), [key]: value } });

  const handlePrecio = (campo, value) => {
    const precioQ = parseFloat(campo === 'precioDesdeQ' ? value : modelo.precioDesdeQ);
    const precioUSD = parseFloat(campo === 'precioDesdeUSD' ? value : modelo.precioDesdeUSD);
    const tasa = parseFloat(campo === 'tasa' ? value : (modelo.tasa || 7.8));

    const nuevo = { ...modelo, [campo]: value };

    if ((campo === 'precioDesdeQ' || campo === 'tasa') && !isNaN(precioQ) && !isNaN(tasa) && tasa > 0) {
      nuevo.precioDesdeUSD = Math.round(precioQ / tasa);
    } else if (campo === 'precioDesdeUSD' && !isNaN(precioUSD) && !isNaN(tasa) && tasa > 0) {
      nuevo.precioDesdeQ = Math.round(precioUSD * tasa);
    }

    onChange(nuevo);
  };

  const renderCampoConfig = (campoConfig) => {
    const value = modelo.distribucion?.[campoConfig.key] || '';
    if (campoConfig.select) {
      return (
        <Form.Select value={value} onChange={(e) => setSub('distribucion', campoConfig.key, e.target.value)}>
          <option value="">Seleccione...</option>
          {campoConfig.select.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </Form.Select>
      );
    }
    return (
      <Form.Control
        type="number"
        min={0}
        value={value}
        onChange={(e) => setSub('distribucion', campoConfig.key, e.target.value)}
        onWheel={(e) => e.target.blur()}
      />
    );
  };

  const renderGasto = (campoConfig) => {
    const value = modelo.gastosFijos?.[campoConfig.key] || '';
    if (campoConfig.select) {
      return (
        <Form.Select value={value} onChange={(e) => setSub('gastosFijos', campoConfig.key, e.target.value)}>
          <option value="">Seleccione...</option>
          {campoConfig.select.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </Form.Select>
      );
    }
    if (campoConfig.type === 'priceUSD' || campoConfig.type === 'priceQ') {
      const isGTQ = campoConfig.type === 'priceQ';
      return (
        <Form.Control
          type="text"
          value={isGTQ ? formatGTQ(value) : formatUSD(value)}
          onChange={(e) => {
            const raw = e.target.value.replace(/[^0-9]/g, '');
            setSub('gastosFijos', campoConfig.key, raw);
          }}
          placeholder={isGTQ ? 'Q 0' : '$ 0'}
        />
      );
    }
    return (
      <Form.Control type="text" value={value} onChange={(e) => setSub('gastosFijos', campoConfig.key, e.target.value)} />
    );
  };

  const renderIncluye = (campoConfig) => {
    const value = modelo.incluye?.[campoConfig.key] || '';
    return (
      <Form.Select value={value} onChange={(e) => setSub('incluye', campoConfig.key, e.target.value)}>
        <option value="">Seleccione...</option>
        {campoConfig.select.map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </Form.Select>
    );
  };

  const distribucion = tipoModelo === 'Bodega' ? DISTRIBUCION_BODEGA : DISTRIBUCION_APARTAMENTO;

  return (
    <Card className="mb-4 shadow-sm rounded-4">
      <Card.Header className="d-flex justify-content-between align-items-center bg-white">
        <Button variant="link" className="text-body text-decoration-none p-0" onClick={() => setOpen(!open)}>
          <i className={`fa-solid fa-chevron-${open ? 'down' : 'right'} me-2`}></i>
          <strong>{modelo.nombre || `Modelo ${index + 1}`}</strong>
          <Badge bg="secondary" className="ms-2">{tipoModelo}</Badge>
        </Button>
        <Button variant="danger" size="sm" className="rounded-circle" onClick={onRemove} title="Eliminar modelo">
          <i className="fa-solid fa-trash"></i>
        </Button>
      </Card.Header>
      <Collapse in={open}>
        <Card.Body>
          {/* Datos del modelo */}
          <h6 className="fw-bold mb-3"><i className="fa-solid fa-tag me-2"></i>Datos del modelo</h6>
          <Row>
            <Col xl={4} lg={6} md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Nombre del modelo *</Form.Label>
                <Form.Control
                  type="text"
                  value={modelo.nombre}
                  onChange={(e) => set({ nombre: e.target.value })}
                  placeholder="Ej: Modelo Horizonte"
                />
              </Form.Group>
            </Col>
            <Col xl={2} lg={6} md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Precio desde Q *</Form.Label>
                <Form.Control
                  type="text"
                  value={formatGTQ(modelo.precioDesdeQ)}
                  onChange={(e) => handlePrecio('precioDesdeQ', e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="Q 0"
                />
              </Form.Group>
            </Col>
            <Col xl={2} lg={6} md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Tasa $ *</Form.Label>
                <Form.Control
                  type="number"
                  step="0.01"
                  value={modelo.tasa}
                  onChange={(e) => handlePrecio('tasa', e.target.value)}
                  placeholder="7.5"
                />
              </Form.Group>
            </Col>
            <Col xl={2} lg={6} md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Precio desde $ *</Form.Label>
                <Form.Control
                  type="text"
                  value={formatUSD(modelo.precioDesdeUSD)}
                  onChange={(e) => handlePrecio('precioDesdeUSD', e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="$ 0"
                />
              </Form.Group>
            </Col>
            <Col xs={12}>
              <Form.Group className="mb-3">
                <Form.Label>Descripción del modelo *</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  value={modelo.descripcion}
                  onChange={(e) => set({ descripcion: e.target.value })}
                  placeholder="Describe el modelo..."
                />
              </Form.Group>
            </Col>
          </Row>

          {/* Áreas y dimensiones */}
          <h6 className="fw-bold mt-4 mb-3"><i className="fa-solid fa-chart-area me-2"></i>Áreas y dimensiones</h6>
          <Row>
            <Campo label="Área de construcción (m²)">
              <Form.Control
                type="number"
                min={0}
                value={modelo.areas?.areaConstruccionM2 || ''}
                onChange={(e) => setSub('areas', 'areaConstruccionM2', e.target.value)}
                onWheel={(e) => e.target.blur()}
              />
            </Campo>
            <Campo label="Espacio de almacenamiento">
              <Form.Control
                type="text"
                value={modelo.areas?.espacioAlmacenamiento || ''}
                onChange={(e) => setSub('areas', 'espacioAlmacenamiento', e.target.value)}
                placeholder="Ej: 5 m²"
              />
            </Campo>
          </Row>

          {/* Estructura y obra gris */}
          <h6 className="fw-bold mt-4 mb-3"><i className="fa-solid fa-trowel-bricks me-2"></i>Estructura y obra gris</h6>
          <Row>
            <Campo label="Altura del cielo">
              <Form.Control
                type="text"
                value={modelo.estructura?.alturaCielo || ''}
                onChange={(e) => setSub('estructura', 'alturaCielo', e.target.value)}
                placeholder="Ej: 3.20 m"
              />
            </Campo>
          </Row>

          {/* Distribución de ambientes */}
          <h6 className="fw-bold mt-4 mb-3"><i className="fa-solid fa-tree-city me-2"></i>Distribución de ambientes</h6>
          <Row>
            {distribucion.map((campoConfig) => (
              <Campo key={campoConfig.key} label={campoConfig.label}>
                {renderCampoConfig(campoConfig)}
              </Campo>
            ))}
          </Row>

          {/* Gastos fijos */}
          <h6 className="fw-bold mt-4 mb-3"><i className="fa-solid fa-book me-2"></i>Gastos fijos</h6>
          <Row>
            {GASTOS_FIJOS.map((campoConfig) => (
              <Campo key={campoConfig.key} label={campoConfig.label}>
                {renderGasto(campoConfig)}
              </Campo>
            ))}
          </Row>

          {/* Incluye */}
          <h6 className="fw-bold mt-4 mb-3"><i className="fa-solid fa-circle-check me-2"></i>Incluye</h6>
          <Row>
            {INCLUYE.map((campoConfig) => (
              <Campo key={campoConfig.key} label={campoConfig.label}>
                {renderIncluye(campoConfig)}
              </Campo>
            ))}
          </Row>

          {/* Amenidades del modelo */}
          <h6 className="fw-bold mt-4 mb-3"><i className="fa-solid fa-umbrella-beach me-2"></i>Amenidades del modelo</h6>
          <Row>
            <Col xs={12}>
              <SelectorAmenidades
                value={modelo.amenities || {}}
                list={AMENIDADES_MODELO}
                onChange={(amenities) => set({ amenities })}
              />
            </Col>
          </Row>

          {/* Multimedia */}
          <h6 className="fw-bold mt-4 mb-3"><i className="fa-solid fa-images me-2"></i>Multimedia</h6>
          <Row>
            <Col xs={12} md={7}>
              <Form.Group className="mb-3">
                <Form.Label>Fotos del modelo</Form.Label>
                <FotosModelo
                  fotos={modelo.fotos}
                  onChange={(fotos) => set({ fotos })}
                />
              </Form.Group>
            </Col>
            <Col xs={12} md={5}>
              <Form.Group className="mb-3">
                <Form.Label>Tour 360</Form.Label>
                <Form.Control
                  type="url"
                  value={modelo.tour360 || ''}
                  onChange={(e) => set({ tour360: e.target.value })}
                  placeholder="https://..."
                />
              </Form.Group>
            </Col>
          </Row>
        </Card.Body>
      </Collapse>
    </Card>
  );
}

// ─── Componente principal: lista de modelos ──────────────────────────────────

function ModelosProyecto({ value = [], onChange, tipoProyecto = '' }) {
  const tipoModelo = tipoProyecto === 'Bodegas' ? 'Bodega' : 'Apartamento';
  const addModelo = () => onChange([...value, nuevoModelo(tipoModelo)]);

  const updateModelo = (uid, modeloActualizado) =>
    onChange(value.map((m) => (m.uid === uid ? modeloActualizado : m)));

  const removeModelo = (uid) => onChange(value.filter((m) => m.uid !== uid));

  return (
    <div>
      {value.map((modelo, index) => (
        <ModeloForm
          key={modelo.uid}
          modelo={modelo}
          index={index}
          tipoModelo={tipoModelo}
          onChange={(actualizado) => updateModelo(modelo.uid, actualizado)}
          onRemove={() => removeModelo(modelo.uid)}
        />
      ))}

      <Button
        variant="outline-dark"
        className="rounded-5 px-4"
        onClick={addModelo}
      >
        <i className="fa-solid fa-plus me-2"></i>Agregar modelo
      </Button>
    </div>
  );
}

export default ModelosProyecto;
