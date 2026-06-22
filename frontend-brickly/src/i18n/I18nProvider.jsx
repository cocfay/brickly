import React from 'react';
import { IntlProvider } from 'react-intl';
import { messages, defaultLocale } from './config';

export const I18nContext = React.createContext();

const I18nProvider = ({ children, locale, onLocaleChange }) => {
  return (
    <I18nContext.Provider value={{ locale, changeLocale: onLocaleChange }}>
      <IntlProvider locale={locale} defaultLocale={defaultLocale} messages={messages[locale]}>
        {children}
      </IntlProvider>
    </I18nContext.Provider>
  );
};

export default I18nProvider;