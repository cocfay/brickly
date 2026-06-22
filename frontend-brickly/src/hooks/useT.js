import { useContext } from 'react';
import { I18nContext } from '../i18n/I18nProvider';

export const useT = () => {
  const { locale } = useContext(I18nContext);
  const t = (es, en) => locale === 'es' ? es : en;
  return t;
};
