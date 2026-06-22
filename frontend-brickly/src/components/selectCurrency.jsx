import { useState } from 'react';
import { useCurrency } from '../context/CurrencyContext';

function SelectCurrency() {
  const { currency, changeCurrency } = useCurrency();
  const [open, setOpen] = useState(false);

  const handleSelect = (c) => {
    changeCurrency(c);
    setOpen(false);
  };

  return (
    <div className="select-container">
      <div className="select">
        <div className="selected-option" onClick={() => setOpen(!open)}>
          <div className="select-value d-flex align-items-center justify-content-start gap-2 text-white" style={{ fontSize: '13px', fontWeight: '500' }}>
            {currency }
          </div>
          <div className="arrow-down">
            <i className="fa-solid fa-chevron-down"></i>
          </div>
        </div>

        {open && (
          <div className="options">
            <div className="option d-flex align-items-center gap-2 text-white" onClick={() => handleSelect('GTQ')}>
              <span style={{ fontWeight: '600' }}>Q</span> GTQ
            </div>
            <div className="option d-flex align-items-center gap-2 text-white" onClick={() => handleSelect('USD')}>
              <span style={{ fontWeight: '600' }}>$</span> USD
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default SelectCurrency;
