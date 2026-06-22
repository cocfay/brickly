import { createContext, useContext, useState } from 'react';

export const CurrencyContext = createContext();

export function CurrencyProvider({ children }) {
  const [currency, setCurrency] = useState(
    () => localStorage.getItem('selectedCurrency') || 'USD' //GTQ
  );

  const changeCurrency = (c) => {
    setCurrency(c);
    localStorage.setItem('selectedCurrency', c);
  };

  return (
    <CurrencyContext.Provider value={{ currency, changeCurrency }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export const useCurrency = () => useContext(CurrencyContext);
