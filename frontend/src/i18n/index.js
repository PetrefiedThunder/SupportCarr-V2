import en from './locales/en.json';
import es from './locales/es.json';

const translations = {
  en,
  es,
};

let currentLocale = localStorage.getItem('locale') || 'en';

export const setLocale = (locale) => {
  if (translations[locale]) {
    currentLocale = locale;
    localStorage.setItem('locale', locale);
    document.documentElement.lang = locale;
  }
};

export const getCurrentLocale = () => currentLocale;

export const t = (key, params = {}) => {
  const keys = key.split('.');
  let value = translations[currentLocale];

  for (const k of keys) {
    if (value && typeof value === 'object') {
      value = value[k];
    } else {
      value = key; // Fallback to key if not found
      break;
    }
  }

  // Replace parameters
  if (typeof value === 'string' && Object.keys(params).length > 0) {
    Object.keys(params).forEach((param) => {
      value = value.replace(`{${param}}`, params[param]);
    });
  }

  return value || key;
};

export const getAvailableLocales = () => Object.keys(translations);

export default { t, setLocale, getCurrentLocale, getAvailableLocales };
