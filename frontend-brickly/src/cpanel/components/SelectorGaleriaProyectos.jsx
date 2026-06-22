import { useState, useRef, useEffect, useCallback } from 'react';
import { Row, Col, Form, Button } from 'react-bootstrap';
import { getLogoUrl } from '../../services/logoService';

// Importaciones para el Drag & Drop
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// ============================================================================
// HELPER: Generar id único
// ============================================================================
let idCounter = 0;
const genId = () => `gal-${Date.now()}-${++idCounter}`;

// ============================================================================
// SUB-COMPONENTE: SortableImage (Miniatura arrastrable)
// ============================================================================
const SortableImage = ({ img, onRemove }) => {
  const [imgError, setImgError] = useState(false);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: img.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 100 : 1,
    opacity: isDragging ? 0.5 : 1,
    height: '150px',
    cursor: 'grab',
    position: 'relative',
    overflow: 'hidden'
  };

  return (
    <Col xs={6} sm={4} md={3} className="mb-3">
      <div
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        className="border rounded-3 shadow-sm overflow-hidden"
      >
        {/* Imagen con object-fit cover */}
        {imgError ? (
          <i className="fa-solid fa-image text-secondary" style={{ fontSize: '32px', opacity: 0.5 }}></i>
        ) : (
          <img
            src={img.preview}
            alt=""
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            onError={() => {
              console.error('Error cargando imagen de galería:', img.preview);
              setImgError(true);
            }}
          />
        )}

        {/* Botón de eliminar */}
        <Button
          variant="danger"
          size="sm"
          className="position-absolute top-0 end-0 m-1 rounded-circle d-flex align-items-center justify-content-center"
          style={{ width: '28px', height: '28px', padding: 0, zIndex: 20, boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
              e.stopPropagation();
              onRemove(img.id);
          }}
        >
          <i className="fa-solid fa-times"></i>
        </Button>
      </div>
    </Col>
  );
};

// ============================================================================
// COMPONENTE PRINCIPAL: SelectorGaleriaProyectos
// ============================================================================
function SelectorGaleriaProyectos({ value = [], onChange }) {
  const [imagenes, setImagenes] = useState([]);
  const [isOver, setIsOver] = useState(false);
  const fileInputRef = useRef(null);
  const onChangeRef = useRef(onChange);
  const prevValueRef = useRef(null);

  // Mantener la referencia actualizada sin causar re-renders
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Sincronizar value → imagenes solo cuando value cambie DESDE AFUERA
  // (no cuando el propio componente lo haya actualizado vía enviarCambios)
  useEffect(() => {
    // Si es el mismo array de antes, no hacer nada (evitar loop)
    if (value === prevValueRef.current) return;
    prevValueRef.current = value;

    if (!value || value.length === 0) {
      setImagenes([]);
      return;
    }

    // Formatear imágenes existentes con id persistente
    const formatted = value.map((p) => {
      // Si ya es un objeto con id propio del componente, preservarlo
      if (typeof p === 'object' && p._localId) {
        return p;
      }
      const path = typeof p === 'string' ? p : (p?.path || p?.url || p?.src || '');
      const previewUrl = path ? getLogoUrl(path) : (typeof p === 'object' && p.preview ? p.preview : null);
      return {
        ...(typeof p === 'string' ? {} : p),
        id: p?.id || genId(),
        _localId: true,
        path: path,
        preview: previewUrl,
        file: p?.file || null,
        uploading: p?.uploading || false
      };
    });
    setImagenes(formatted);
  }, [value]);

  // (Las acciones locales: handleRemove, handleFiles, handleDragEnd ya notifican
  //  al padre directamente dentro de sus updaters de setImagenes.
  //  No se necesita un efecto adicional para evitar loops.)

  // Manejar selección/drop de archivos
  const handleFiles = async (files) => {
    if (!files || files.length === 0) return;

    const arrayFiles = Array.from(files);

    // Verificar límite de 5 imágenes
    const currentCount = imagenes.length;
    const availableSlots = 5 - currentCount;
    if (availableSlots <= 0) {
      alert('Máximo 5 imágenes permitidas.');
      return;
    }

    const filesToProcess = arrayFiles.slice(0, availableSlots);

    // Crear previews locales inmediatamente (se subirán al PHP al hacer submit)
    const nuevasImagenes = filesToProcess.map(file => ({
      id: genId(),
      _localId: true,
      file,
      preview: URL.createObjectURL(file),
      path: null,
      uploading: false
    }));

    setImagenes(prev => {
      const updated = [...prev, ...nuevasImagenes];
      // Notificar al padre inmediatamente
      const rutas = updated.map(img => ({
        id: img.id,
        _localId: true,
        path: img.path || null,
        file: img.file || null,
        preview: img.preview,
        uploading: img.uploading || false
      }));
      onChangeRef.current(rutas);
      return updated;
    });
  };

  // Drag over / Drag leave / Drop
  const handleDragOver = (e) => { e.preventDefault(); setIsOver(true); };
  const handleDragLeave = () => setIsOver(false);
  const handleDrop = (e) => {
    e.preventDefault();
    setIsOver(false);
    handleFiles(e.dataTransfer.files);
  };

  // Drag end (reordenar)
  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (active.id !== over.id) {
      setImagenes((items) => {
        const oldIndex = items.findIndex(i => i.id === active.id);
        const newIndex = items.findIndex(i => i.id === over.id);
        const nuevoOrden = arrayMove(items, oldIndex, newIndex);
        // Notificar al padre inmediatamente
        const rutas = nuevoOrden.map(img => ({
          id: img.id,
          _localId: true,
          path: img.path || null,
          file: img.file || null,
          preview: img.preview,
          uploading: img.uploading || false
        }));
        onChangeRef.current(rutas);
        return nuevoOrden;
      });
    }
  };

  // Eliminar imagen
  const handleRemove = (id) => {
    setImagenes(prev => {
      const filtradas = prev.filter(img => img.id !== id);
      const imgAEliminar = prev.find(img => img.id === id);
      if (imgAEliminar?.preview?.startsWith('blob:')) {
        URL.revokeObjectURL(imgAEliminar.preview);
      }
      // Notificar al padre inmediatamente con estado actualizado
      const rutas = filtradas.map(img => ({
        id: img.id,
        _localId: true,
        path: img.path || null,
        file: img.file || null,
        preview: img.preview,
        uploading: img.uploading || false
      }));
      onChangeRef.current(rutas);
      return filtradas;
    });
  };

  // Limpieza al desmontar
  useEffect(() => {
    return () => {
      imagenes.forEach(img => {
        if (img?.preview?.startsWith('blob:')) {
          URL.revokeObjectURL(img.preview);
        }
      });
    };
  }, []);

  const totalCount = imagenes.length;

  return (
    <div className="galeria-proyectos-section">
      {/* Zona de Carga */}
      <Form.Group className="mb-4">
        <Form.Label className="fw-bold fs-5 mb-3">Galería de imágenes</Form.Label>
        <div 
          className={`border-2 rounded-4 d-flex flex-column align-items-center justify-content-center p-5 position-relative transition-all ${totalCount >= 5 ? 'opacity-50' : ''}`}
          style={{ 
            minHeight: '180px', 
            cursor: totalCount >= 5 ? 'not-allowed' : 'pointer',
            borderStyle: 'dashed',
            borderColor: isOver ? '#0d6efd' : '#adb5bd',
            backgroundColor: isOver ? 'rgba(13, 110, 253, 0.05)' : '#f8f9fa'
          }}
          onDragOver={totalCount < 5 ? handleDragOver : undefined}
          onDragLeave={handleDragLeave}
          onDrop={totalCount < 5 ? handleDrop : undefined}
          onClick={() => totalCount < 5 && fileInputRef.current?.click()}
        >
          <i className={`fa-solid fa-cloud-arrow-up fs-1 mb-3 ${isOver ? 'text-primary' : 'text-secondary'}`}></i>
          <h6 className="mb-2 text-dark text-center">Arrastra y suelta tus fotos aquí</h6>
          <p className="text-muted text-center small mb-0">
            {totalCount >= 5
              ? 'Límite de 5 imágenes alcanzado'
              : `Mínimo 3 imágenes - Máximo 5 (${totalCount}/5 usadas)`
            }
          </p>
          <input 
            type="file" 
            multiple 
            ref={fileInputRef} 
            accept="image/*" 
            disabled={totalCount >= 5}
            onChange={(e) => {
              handleFiles(e.target.files);
              e.target.value = '';
            }}
            style={{ display: 'none' }}
          />
        </div>
      </Form.Group>

      {/* Galería con Reordenamiento */}
      {imagenes.length > 0 && (
        <Form.Group className="mb-4 border p-3 rounded-4 bg-white shadow-sm">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <Form.Label className="fw-bold mb-0">
              Imágenes agregadas <span className="text-muted fw-normal ms-1 fs-6">(Arrastra para reordenar)</span>
            </Form.Label>
            <span className="badge bg-secondary rounded-pill px-3 py-2">
              {totalCount} {totalCount === 1 ? 'imagen' : 'imágenes'}
            </span>
          </div>
          
          <DndContext 
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={imagenes} strategy={rectSortingStrategy}>
              <Row className="g-2 ms-0 me-0">
                {imagenes.map(img => (
                  <SortableImage 
                    key={img.id} 
                    img={img} 
                    onRemove={handleRemove}
                  />
                ))}
              </Row>
            </SortableContext>
          </DndContext>

          {/* Validación visual */}
          {totalCount > 0 && totalCount < 3 && (
            <div className="mt-3 text-warning small d-flex align-items-center">
              <i className="fa-solid fa-triangle-exclamation me-2"></i>
              Se requieren al menos 3 imágenes para la galería.
            </div>
          )}
        </Form.Group>
      )}
    </div>
  );
}

export default SelectorGaleriaProyectos;
