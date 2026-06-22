import { useState, useRef, useEffect } from 'react';
import { Row, Col, Form, Button, Spinner } from 'react-bootstrap';
// Importa tu función paralela desde tus servicios
import { uploadMultipleTempFilesParallel } from '../services/propiedades';
import { API_URL } from '../../services/authService';

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
// SUB-COMPONENTE: SortableImage (Miniatura arrastrable)
// ============================================================================
const SortableImage = ({ img, index, onRemove }) => {
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
    cursor: img.uploading ? 'wait' : 'grab',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundImage: `url(${img.preview})`,
    position: 'relative',
    overflow: 'hidden'
  };

  return (
    <Col xs={6} sm={4} md={3} lg={2} ref={setNodeRef} style={style} {...attributes} {...listeners} className="border rounded-3 p-0 m-1 shadow-sm">
      {/* Etiqueta de Principal solo para el primero */}
      {index === 0 && (
        <div className="position-absolute top-0 start-0 bg-primary text-white px-2 py-1 small fw-bold rounded-bottom-end" style={{ zIndex: 10 }}>
          Principal
        </div>
      )}
      
      {/* Overlay de carga */}
      {img.uploading && (
        <div className="position-absolute top-0 start-0 w-100 h-100 d-flex flex-column align-items-center justify-content-center bg-white bg-opacity-75" style={{ zIndex: 5 }}>
          <Spinner animation="border" size="sm" variant="primary" className="mb-1" />
          <span className="small text-primary fw-bold">Subiendo...</span>
        </div>
      )}

      {/* Botón de eliminar (oculto mientras carga) */}
      {!img.uploading && (
        <Button
          variant="danger"
          size="sm"
          className="position-absolute top-0 end-0 m-1 rounded-circle d-flex align-items-center justify-content-center"
          style={{ width: '28px', height: '28px', padding: 0, zIndex: 20, boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}
          onPointerDown={(e) => e.stopPropagation()} // Evita que DnD intercepte el clic
          onClick={(e) => {
              e.stopPropagation();
              onRemove(img.id);
          }}
        >
          <i className="fa-solid fa-times"></i>
        </Button>
      )}
    </Col>
  );
};

// ============================================================================
// COMPONENTE PRINCIPAL: SelectorMultimedia
// ============================================================================
function SelectorMultimedia({ value = {}, onChange }) {
  const [imagenes, setImagenes] = useState([]);
  const [link360, setLink360] = useState('');
  const [isOver, setIsOver] = useState(false);
  const fileInputRef = useRef(null);

  // Sensores para arrastrar con mouse o teclado
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // 1. Cargar datos iniciales si existen
  useEffect(() => {
    if (value.photos && value.photos.length > 0) {
      // Ordenamos para asegurar que la isMain esté de primera al inicio
      const ordenadas = [...value.photos].sort((a, b) => (b.isMain ? 1 : 0) - (a.isMain ? 1 : 0));
      
      const formatted = ordenadas.map(p => {
        const rawPath = p.preview || p.path;
        // Si la ruta es relativa (no empieza con http ni blob), anteponer API_URL
        const preview = (rawPath && !rawPath.startsWith('http') && !rawPath.startsWith('blob:'))
          ? `${API_URL}/${rawPath.replace(/^\//, '')}`
          : rawPath;
        return {
          ...p,
          id: typeof p.path === 'object' ? p.path.files?.image?.[0]?.usepath : (p.path || Math.random().toString()),
          preview,
          uploading: false
        };
      });
      setImagenes(formatted);
    }
    
    if (value.link360) {
      setLink360(value.link360);
    }
  }, [value]);

  // 2. Notificar cambios al formulario padre
  const enviarCambios = (nuevasImgs, link) => {
    const fotosLimpias = nuevasImgs
      .filter(img => !img.uploading && img.path) // Ignorar las que siguen cargando
      .map((img, index) => {
        // Si la imagen ya tiene path (subida al servidor), usar la URL real como preview
        const preview = img.path && !img.path.startsWith('http') && !img.path.startsWith('blob:')
          ? `${API_URL}/${img.path.replace(/^\//, '')}`
          : img.preview;
        
        return {
          path: typeof img.path === 'object' ? img.path.files?.image?.[0]?.usepath : img.path,
          thumbnail: img.thumbnail || '',
          isMain: index === 0, // La posición 0 siempre es la principal
          preview
        };
      });

    onChange({
      description: "Imagenes de la propiedad",
      photos: fotosLimpias,
      videos: [],
      link360: link || ''
    });
  };

  // 3. Manejar selección/drop de archivos y subida en paralelo
  const handleFiles = async (files) => {
    if (!files || files.length === 0) return;
    const arrayFiles = Array.from(files);
    
    // Crear esqueletos visuales (placeholders) inmediatamente
    const nuevosPlaceholders = arrayFiles.map(file => ({
      id: Math.random().toString(36).substr(2, 9), // ID temporal
      file,
      preview: URL.createObjectURL(file),
      uploading: true,
      path: null
    }));

    // Actualizar estado para mostrar los "Subiendo..."
    setImagenes(prev => [...prev, ...nuevosPlaceholders]);

    // Ejecutar subida paralela
    const res = await uploadMultipleTempFilesParallel(arrayFiles, 'image');

    if (res.success && res.paths) {
      setImagenes(prev => {
        const estadoActualizado = [...prev];
        
        // Asignamos las rutas devueltas a los placeholders correspondientes
        nuevosPlaceholders.forEach((placeholder, index) => {
          const imgIndex = estadoActualizado.findIndex(img => img.id === placeholder.id);
          if (imgIndex !== -1 && res.paths[index]) {
            estadoActualizado[imgIndex] = {
              ...estadoActualizado[imgIndex],
              uploading: false,
              path: res.paths[index],
              // Actualizar preview a la URL real del servidor para evitar que se pierda si el blob es revocado
              preview: `${API_URL}/${res.paths[index].replace(/^\//, '')}`
            };
          }
        });
        
        enviarCambios(estadoActualizado, link360);
        return estadoActualizado;
      });
    } else {
      // Si falla, quitamos las imágenes que se quedaron cargando
      setImagenes(prev => prev.filter(img => !nuevosPlaceholders.find(p => p.id === img.id)));
      console.error('Error al subir imágenes:', res.error);
      alert('Hubo un error al subir algunas imágenes. Por favor, intente de nuevo.');
    }
  };

  // 4. Funciones de Drag & Drop
  const handleDragOver = (e) => { e.preventDefault(); setIsOver(true); };
  const handleDragLeave = () => setIsOver(false);
  const handleDrop = (e) => {
    e.preventDefault();
    setIsOver(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (active.id !== over.id) {
      setImagenes((items) => {
        const oldIndex = items.findIndex(i => i.id === active.id);
        const newIndex = items.findIndex(i => i.id === over.id);
        const nuevoOrden = arrayMove(items, oldIndex, newIndex);
        
        // Al reordenar, actualizamos al padre para que guarde quién es la nueva "Principal"
        enviarCambios(nuevoOrden, link360);
        return nuevoOrden;
      });
    }
  };

  const handleRemove = (id) => {
    setImagenes(prev => {
      const filtradas = prev.filter(img => img.id !== id);
      // Limpiar memoria de la preview
      const imgAEliminar = prev.find(img => img.id === id);
      if (imgAEliminar?.preview?.startsWith('blob:')) {
        URL.revokeObjectURL(imgAEliminar.preview);
      }
      enviarCambios(filtradas, link360);
      return filtradas;
    });
  };

  // Limpieza al desmontar componente
  useEffect(() => {
    return () => {
      imagenes.forEach(img => {
        if (img?.preview?.startsWith('blob:')) {
          URL.revokeObjectURL(img.preview);
        }
      });
    };
  }, []);

  return (
    <div className="multimedia-section">
      {/* Zona de Carga Principal */}
      <Form.Group className="mb-4">
        <Form.Label className="fw-bold fs-5 mb-3">Subir Multimedia</Form.Label>
        <div 
          className={`border-2 rounded-4 d-flex flex-column align-items-center justify-content-center p-5 position-relative transition-all`}
          style={{ 
            minHeight: '220px', 
            cursor: 'pointer',
            borderStyle: 'dashed',
            borderColor: isOver ? '#0d6efd' : '#adb5bd',
            backgroundColor: isOver ? 'rgba(13, 110, 253, 0.05)' : '#f8f9fa'
          }}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <i className={`fa-solid fa-cloud-arrow-up fs-1 mb-3 ${isOver ? 'text-primary' : 'text-secondary'}`}></i>
          <h5 className="mb-2 text-dark text-center">Arrastra y suelta tus fotos aquí</h5>
          <p className="text-muted text-center mb-0 px-3">
            Soporta selección múltiple.<br/>
            La primera imagen de la lista será la foto principal de la propiedad.
          </p>
          <input 
            type="file" 
            multiple 
            ref={fileInputRef} 
            accept="image/*" 
            onChange={(e) => {
              handleFiles(e.target.files);
              e.target.value = ''; // Resetear el input para permitir subir el mismo archivo dos veces si se eliminó
            }}
            style={{ display: 'none' }}
          />
        </div>
      </Form.Group>

      {/* Galería con Reordenamiento (SOLO visible si hay imágenes) */}
      {imagenes.length > 0 && (
        <Form.Group className="mb-4 border p-3 rounded-4 bg-white shadow-sm">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <Form.Label className="fw-bold mb-0">
              Imágenes agregadas <span className="text-muted fw-normal ms-1 fs-6">(Arrastra para reordenar)</span>
            </Form.Label>
            <span className="badge bg-secondary rounded-pill px-3 py-2">
              {imagenes.length} {imagenes.length === 1 ? 'imagen' : 'imágenes'}
            </span>
          </div>
          
          <DndContext 
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={imagenes} strategy={rectSortingStrategy}>
              <Row className="g-2 ms-0 me-0">
                {imagenes.map((img, index) => (
                  <SortableImage 
                    key={img.id} 
                    img={img} 
                    index={index} 
                    onRemove={handleRemove}
                  />
                ))}
              </Row>
            </SortableContext>
          </DndContext>

          {/* Validaciones visuales sutiles */}
          {imagenes.filter(i => !i.uploading).length < 4 && (
            <div className="mt-3 text-warning small d-flex align-items-center">
              <i className="fa-solid fa-triangle-exclamation me-2"></i>
              Se recomiendan al menos 4 imágenes (1 principal y 3 secundarias) para un mejor anuncio.
            </div>
          )}
        </Form.Group>
      )}

      {/* Link Tour 360 */}
      <Form.Group className="mb-3">
        <Form.Label className="fw-bold">Link Tour 360 (Opcional)</Form.Label>
        <div className="input-group">
          <Form.Control 
            type="url"
            value={link360}
            onChange={(e) => {
              setLink360(e.target.value);
              enviarCambios(imagenes, e.target.value);
            }}
            placeholder="https://..."
          />
        </div>
      </Form.Group>
    </div>
  );
}

export default SelectorMultimedia;