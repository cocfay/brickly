import { useParams } from 'react-router-dom';
import ProyectoForm from './ProyectoForm';

function Edit() {
  const { id } = useParams();
  return <ProyectoForm projectId={id} />;
}

export default Edit;
