import { useState, useEffect, useContext } from 'react';
import { FormattedMessage } from 'react-intl';

import flagES from '../assets/images/flagsIcons/es.svg';
import flagEN from '../assets/images/flagsIcons/us.svg';

import { I18nContext } from '../i18n/I18nProvider';

function SelectLanguage() {
    const [open, setOpen] = useState(false);
    //const [selected, setSelected] = useState('es');
    const { locale, changeLocale } = useContext(I18nContext);

    // Cargar idioma guardado al iniciar
    useEffect(() => {
        const saved = localStorage.getItem('selectedLang');
        if (saved) changeLocale(saved);
    }, []);

    const handleSelect = (lang) => {
        changeLocale(lang);
        //setSelected(lang);
        setOpen(false);
        localStorage.setItem('selectedLang', lang);
    };
    return (
        <div className="select-container">
            <div className="select">
                <div className="selected-option" onClick={() => setOpen(!open)}>
                <div className="select-value d-flex align-items-center justify-content-start gap-3">
                    <img src={locale === 'es' ? flagES : flagEN} style={{ width: '26px', height: '26px' }} alt="flag" />
                </div>
                <div className="arrow-down">
                    <i className="fa-solid fa-chevron-down"></i>
                </div>
                </div>
                
                {open && (
                <div className="options">
                    <div className="option d-flex align-items-center justify-content-start gap-3 text-white" onClick={() => handleSelect('en')}>
                    <img src={flagEN} style={{ width: '26px', height: '26px' }} alt="flag" /> 
                    {/* English */}
                    <FormattedMessage id='app.language.english' />
                    </div>
                    <div className="option d-flex align-items-center justify-content-start gap-3 text-white" onClick={() => handleSelect('es')}>
                    <img src={flagES} style={{ width: '26px', height: '26px' }} alt="flag" /> 
                    {/* Spanish */}
                    <FormattedMessage id='app.language.spanish' />
                    </div>
                </div>
                )}
            </div>
        </div>
    )
}

export default SelectLanguage;