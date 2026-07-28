import React from 'react';

export default function DateRangeFilter({ from, to, onChange, onReset }) {
  const handleFromChange = (e) => {
    onChange({ from: e.target.value, to });
  };

  const handleToChange = (e) => {
    onChange({ from, to: e.target.value });
  };

  const hasFilter = from || to;

  return (
    <div className="d-flex align-items-center gap-2 flex-wrap">
      <div className="d-flex align-items-center gap-1">
        <label className="text-muted" style={{ fontSize: '12px', whiteSpace: 'nowrap' }}>Desde:</label>
        <input
          type="date"
          className="form-control form-control-sm border-light-subtle bg-light text-muted"
          style={{ width: 'auto', fontSize: '12px', borderRadius: '8px' }}
          value={from || ''}
          onChange={handleFromChange}
        />
      </div>
      <div className="d-flex align-items-center gap-1">
        <label className="text-muted" style={{ fontSize: '12px', whiteSpace: 'nowrap' }}>Hasta:</label>
        <input
          type="date"
          className="form-control form-control-sm border-light-subtle bg-light text-muted"
          style={{ width: 'auto', fontSize: '12px', borderRadius: '8px' }}
          value={to || ''}
          onChange={handleToChange}
        />
      </div>
      {hasFilter && (
        <button
          className="btn btn-sm btn-outline-secondary border-light-subtle text-muted"
          style={{ fontSize: '11px', borderRadius: '8px', padding: '2px 10px' }}
          onClick={onReset}
          title="Limpiar filtro"
        >
          <i className="fa-solid fa-xmark me-1"></i>Limpiar
        </button>
      )}
    </div>
  );
}
