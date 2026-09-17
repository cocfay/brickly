import { useMemo, useEffect, useState } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { API_URL } from '../../services/authService';
import { parseSeoSlugs } from '../../utils/seoLanding';
import Propiedades from './propiedades';

export default function SeoLanding() {
  const { tipoOp, ubicacion } = useParams();
  const parsed = useMemo(
    () => parseSeoSlugs(tipoOp, ubicacion),
    [tipoOp, ubicacion]
  );

  const [count, setCount] = useState(null);

  useEffect(() => {
    if (!parsed) return;
    let cancelled = false;
    fetch(`${API_URL}/properties/seo-combos`)
      .then((r) => r.json())
      .then((list) => {
        if (cancelled) return;
        if (!Array.isArray(list)) return;
        const combo = list.find(
          (x) =>
            x.type === parsed.type &&
            x.mode === parsed.mode &&
            x.locationType === parsed.locationType &&
            x.location === parsed.location
        );
        setCount(combo ? combo.count : 0);
      })
      .catch(() => {
        if (!cancelled) setCount(0);
      });
    return () => {
      cancelled = true;
    };
  }, [parsed]);

  if (!parsed) return <Navigate to="/propiedades" replace />;

  return <Propiedades seo={{ ...parsed, count }} />;
}