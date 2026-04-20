import { useCallback, useEffect, useState } from 'react';

export const DEFAULT_INTERFACE_LANGUAGE = 'Français';
export const DEFAULT_TIMEZONE = 'GST +4 — Dubaï / UTC+1 — Kinshasa';

const LANGUAGE_STORAGE_KEY = 'agta-global-language';
const TIMEZONE_STORAGE_KEY = 'agta-global-timezone';
const APP_PREFERENCES_EVENT = 'agta:app-preferences-changed';

export const INTERFACE_LANGUAGE_OPTIONS = [
  {
    id: 'fr',
    label: 'Français',
    nativeLabel: 'Français',
    completion: 100,
    region: 'Région MENA + Afrique francophone',
    hint: 'Traduction complète et terminologie AGTA native',
    locale: 'fr-FR',
    langTag: 'fr',
  },
  {
    id: 'en',
    label: 'English',
    nativeLabel: 'English',
    completion: 100,
    region: 'International',
    hint: 'Best for collaboration with global clubs and scouts',
    locale: 'en-GB',
    langTag: 'en',
  },
  {
    id: 'es',
    label: 'Español',
    nativeLabel: 'Español',
    completion: 96,
    region: 'España + Latinoamérica',
    hint: 'Ideal para operaciones en mercados hispanohablantes',
    locale: 'es-ES',
    langTag: 'es',
  },
  {
    id: 'ar',
    label: 'العربية',
    nativeLabel: 'العربية',
    completion: 95,
    region: 'MENA',
    hint: 'واجهة محسّنة للمنطقة العربية',
    locale: 'ar-AE',
    langTag: 'ar',
  },
  {
    id: 'zh',
    label: '中文',
    nativeLabel: '中文',
    completion: 92,
    region: '中国 + 东亚',
    hint: '适合亚洲市场合作场景',
    locale: 'zh-CN',
    langTag: 'zh',
  },
  {
    id: 'hi',
    label: 'हिन्दी',
    nativeLabel: 'हिन्दी',
    completion: 90,
    region: 'भारत',
    hint: 'भारतीय संचालन और साझेदारी के लिए',
    locale: 'hi-IN',
    langTag: 'hi',
  },
  {
    id: 'pt',
    label: 'Português',
    nativeLabel: 'Português',
    completion: 94,
    region: 'Lusophone markets',
    hint: 'Interface avancée, quelques libellés secondaires en cours',
    locale: 'pt-PT',
    langTag: 'pt',
  },
  {
    id: 'bn',
    label: 'বাংলা',
    nativeLabel: 'বাংলা',
    completion: 88,
    region: 'বাংলাদেশ + দক্ষিণ এশিয়া',
    hint: 'দক্ষিণ এশিয়ার সম্প্রসারণের জন্য',
    locale: 'bn-BD',
    langTag: 'bn',
  },
  {
    id: 'ru',
    label: 'Русский',
    nativeLabel: 'Русский',
    completion: 90,
    region: 'Europe de l Est + Eurasie',
    hint: 'Support pour partenaires russophones',
    locale: 'ru-RU',
    langTag: 'ru',
  },
] as const;

type TranslationKey =
  | 'settings.section.account'
  | 'settings.row.password'
  | 'settings.row.mfa'
  | 'settings.row.language'
  | 'settings.row.timezone'
  | 'settings.languageModal.title'
  | 'settings.languageModal.description'
  | 'settings.languageModal.activeLabel'
  | 'actions.cancel'
  | 'actions.apply'
  | 'actions.close';

const TRANSLATIONS: Record<string, Record<TranslationKey, string>> = {
  fr: {
    'settings.section.account': 'Compte',
    'settings.row.password': 'Changer le mot de passe',
    'settings.row.mfa': 'Double authentification (2FA)',
    'settings.row.language': 'Langue de l interface',
    'settings.row.timezone': 'Fuseau horaire',
    'settings.languageModal.title': 'Langue de l interface',
    'settings.languageModal.description': 'Choisissez la langue d affichage pour menus, libellés et notifications.',
    'settings.languageModal.activeLabel': 'Langue active',
    'actions.cancel': 'Annuler',
    'actions.apply': 'Appliquer',
    'actions.close': 'Fermer',
  },
  en: {
    'settings.section.account': 'Account',
    'settings.row.password': 'Change password',
    'settings.row.mfa': 'Two-factor authentication (2FA)',
    'settings.row.language': 'Interface language',
    'settings.row.timezone': 'Time zone',
    'settings.languageModal.title': 'Interface language',
    'settings.languageModal.description': 'Choose the display language for menus, labels, and notifications.',
    'settings.languageModal.activeLabel': 'Active language',
    'actions.cancel': 'Cancel',
    'actions.apply': 'Apply',
    'actions.close': 'Close',
  },
  es: {
    'settings.section.account': 'Cuenta',
    'settings.row.password': 'Cambiar contraseña',
    'settings.row.mfa': 'Autenticación de dos factores (2FA)',
    'settings.row.language': 'Idioma de la interfaz',
    'settings.row.timezone': 'Zona horaria',
    'settings.languageModal.title': 'Idioma de la interfaz',
    'settings.languageModal.description': 'Elige el idioma de menús, etiquetas y notificaciones.',
    'settings.languageModal.activeLabel': 'Idioma activo',
    'actions.cancel': 'Cancelar',
    'actions.apply': 'Aplicar',
    'actions.close': 'Cerrar',
  },
  ar: {
    'settings.section.account': 'الحساب',
    'settings.row.password': 'تغيير كلمة المرور',
    'settings.row.mfa': 'المصادقة الثنائية (2FA)',
    'settings.row.language': 'لغة الواجهة',
    'settings.row.timezone': 'المنطقة الزمنية',
    'settings.languageModal.title': 'لغة الواجهة',
    'settings.languageModal.description': 'اختر لغة العرض للقوائم والعناصر والإشعارات.',
    'settings.languageModal.activeLabel': 'اللغة النشطة',
    'actions.cancel': 'إلغاء',
    'actions.apply': 'تطبيق',
    'actions.close': 'إغلاق',
  },
  zh: {
    'settings.section.account': '账户',
    'settings.row.password': '更改密码',
    'settings.row.mfa': '双重身份验证 (2FA)',
    'settings.row.language': '界面语言',
    'settings.row.timezone': '时区',
    'settings.languageModal.title': '界面语言',
    'settings.languageModal.description': '选择菜单、标签和通知的显示语言。',
    'settings.languageModal.activeLabel': '当前语言',
    'actions.cancel': '取消',
    'actions.apply': '应用',
    'actions.close': '关闭',
  },
  hi: {
    'settings.section.account': 'खाता',
    'settings.row.password': 'पासवर्ड बदलें',
    'settings.row.mfa': 'दो-स्तरीय प्रमाणीकरण (2FA)',
    'settings.row.language': 'इंटरफेस भाषा',
    'settings.row.timezone': 'समय क्षेत्र',
    'settings.languageModal.title': 'इंटरफेस भाषा',
    'settings.languageModal.description': 'मेनू, लेबल और सूचनाओं की भाषा चुनें।',
    'settings.languageModal.activeLabel': 'सक्रिय भाषा',
    'actions.cancel': 'रद्द करें',
    'actions.apply': 'लागू करें',
    'actions.close': 'बंद करें',
  },
  pt: {
    'settings.section.account': 'Conta',
    'settings.row.password': 'Alterar palavra-passe',
    'settings.row.mfa': 'Autenticação de dois fatores (2FA)',
    'settings.row.language': 'Idioma da interface',
    'settings.row.timezone': 'Fuso horário',
    'settings.languageModal.title': 'Idioma da interface',
    'settings.languageModal.description': 'Escolha o idioma de menus, rótulos e notificações.',
    'settings.languageModal.activeLabel': 'Idioma ativo',
    'actions.cancel': 'Cancelar',
    'actions.apply': 'Aplicar',
    'actions.close': 'Fechar',
  },
  bn: {
    'settings.section.account': 'অ্যাকাউন্ট',
    'settings.row.password': 'পাসওয়ার্ড পরিবর্তন',
    'settings.row.mfa': 'দুই ধাপ প্রমাণীকরণ (2FA)',
    'settings.row.language': 'ইন্টারফেস ভাষা',
    'settings.row.timezone': 'সময় অঞ্চল',
    'settings.languageModal.title': 'ইন্টারফেস ভাষা',
    'settings.languageModal.description': 'মেনু, লেবেল ও নোটিফিকেশনের ভাষা বেছে নিন।',
    'settings.languageModal.activeLabel': 'সক্রিয় ভাষা',
    'actions.cancel': 'বাতিল',
    'actions.apply': 'প্রয়োগ',
    'actions.close': 'বন্ধ',
  },
  ru: {
    'settings.section.account': 'Аккаунт',
    'settings.row.password': 'Сменить пароль',
    'settings.row.mfa': 'Двухфакторная аутентификация (2FA)',
    'settings.row.language': 'Язык интерфейса',
    'settings.row.timezone': 'Часовой пояс',
    'settings.languageModal.title': 'Язык интерфейса',
    'settings.languageModal.description': 'Выберите язык меню, меток и уведомлений.',
    'settings.languageModal.activeLabel': 'Активный язык',
    'actions.cancel': 'Отмена',
    'actions.apply': 'Применить',
    'actions.close': 'Закрыть',
  },
};

export const TIMEZONE_OPTIONS = [
  {
    id: 'gst_dual',
    label: 'GST +4 — Dubaï / UTC+1 — Kinshasa',
    city: 'Dubaï + Kinshasa',
    iana: 'Asia/Dubai',
    offsetLabel: 'UTC+4 et UTC+1',
    businessHint: 'Suivi simultané siège + opérations terrain',
  },
  {
    id: 'utc1_kinshasa',
    label: 'UTC+1 — Kinshasa',
    city: 'Kinshasa',
    iana: 'Africa/Kinshasa',
    offsetLabel: 'UTC+1',
    businessHint: 'Rythme local RDC pour opérations scouts',
  },
  {
    id: 'gst_dubai',
    label: 'GST +4 — Dubaï',
    city: 'Dubaï',
    iana: 'Asia/Dubai',
    offsetLabel: 'UTC+4',
    businessHint: 'Alignement siège direction générale',
  },
  {
    id: 'utc0_london',
    label: 'UTC+0 — Londres',
    city: 'Londres',
    iana: 'Europe/London',
    offsetLabel: 'UTC+0',
    businessHint: 'Coordination Europe et négociations clubs',
  },
] as const;

export interface AppPreferencesSnapshot {
  language: string;
  timezone: string;
  locale: string;
  timeZone: string;
  langTag: string;
}

const getLanguageDetails = (language: string) =>
  INTERFACE_LANGUAGE_OPTIONS.find((option) => option.label === language) ?? INTERFACE_LANGUAGE_OPTIONS[0];

const getTimezoneDetails = (timezone: string) =>
  TIMEZONE_OPTIONS.find((option) => option.label === timezone) ?? TIMEZONE_OPTIONS[0];

const syncDocumentLanguage = (language: string) => {
  if (typeof document === 'undefined') return;
  const langTag = getLanguageDetails(language).langTag;
  document.documentElement.lang = langTag;
  document.documentElement.dir = langTag === 'ar' ? 'rtl' : 'ltr';
};

export const getAppPreferencesSnapshot = (): AppPreferencesSnapshot => {
  const language = typeof window === 'undefined'
    ? DEFAULT_INTERFACE_LANGUAGE
    : window.localStorage.getItem(LANGUAGE_STORAGE_KEY) || DEFAULT_INTERFACE_LANGUAGE;
  const timezone = typeof window === 'undefined'
    ? DEFAULT_TIMEZONE
    : window.localStorage.getItem(TIMEZONE_STORAGE_KEY) || DEFAULT_TIMEZONE;
  const languageDetails = getLanguageDetails(language);
  const timezoneDetails = getTimezoneDetails(timezone);

  return {
    language,
    timezone,
    locale: languageDetails.locale,
    timeZone: timezoneDetails.iana,
    langTag: languageDetails.langTag,
  };
};

export const setGlobalLanguage = (language: string) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  syncDocumentLanguage(language);
  window.dispatchEvent(new CustomEvent(APP_PREFERENCES_EVENT));
};

export const setGlobalTimezone = (timezone: string) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(TIMEZONE_STORAGE_KEY, timezone);
  window.dispatchEvent(new CustomEvent(APP_PREFERENCES_EVENT));
};

export const formatTimeInTimezone = (iana: string, locale?: string) => {
  const snapshot = getAppPreferencesSnapshot();
  return new Intl.DateTimeFormat(locale || snapshot.locale, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone: iana,
  }).format(new Date());
};

export function useAppPreferences() {
  const [snapshot, setSnapshot] = useState<AppPreferencesSnapshot>(() => getAppPreferencesSnapshot());

  useEffect(() => {
    syncDocumentLanguage(snapshot.language);
  }, [snapshot.language]);

  useEffect(() => {
    const syncSnapshot = () => {
      setSnapshot(getAppPreferencesSnapshot());
    };

    syncSnapshot();
    window.addEventListener('storage', syncSnapshot);
    window.addEventListener(APP_PREFERENCES_EVENT, syncSnapshot);

    return () => {
      window.removeEventListener('storage', syncSnapshot);
      window.removeEventListener(APP_PREFERENCES_EVENT, syncSnapshot);
    };
  }, []);

  const formatDate = useCallback((value: string | number | Date, options?: Intl.DateTimeFormatOptions) => {
    const date = value instanceof Date ? value : new Date(value);
    return new Intl.DateTimeFormat(snapshot.locale, {
      timeZone: snapshot.timeZone,
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      ...options,
    }).format(date);
  }, [snapshot.locale, snapshot.timeZone]);

  const formatTime = useCallback((value: string | number | Date, options?: Intl.DateTimeFormatOptions) => {
    const date = value instanceof Date ? value : new Date(value);
    return new Intl.DateTimeFormat(snapshot.locale, {
      timeZone: snapshot.timeZone,
      hour: '2-digit',
      minute: '2-digit',
      ...options,
    }).format(date);
  }, [snapshot.locale, snapshot.timeZone]);

  const formatDateTime = useCallback((value: string | number | Date, options?: Intl.DateTimeFormatOptions) => {
    const date = value instanceof Date ? value : new Date(value);
    return new Intl.DateTimeFormat(snapshot.locale, {
      timeZone: snapshot.timeZone,
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      ...options,
    }).format(date);
  }, [snapshot.locale, snapshot.timeZone]);

  const formatNumber = useCallback((value: number, options?: Intl.NumberFormatOptions) => {
    return new Intl.NumberFormat(snapshot.locale, options).format(value);
  }, [snapshot.locale]);

  const t = useCallback((key: TranslationKey) => {
    const langTag = snapshot.langTag;
    const table = TRANSLATIONS[langTag] || TRANSLATIONS.en;
    return table[key] || TRANSLATIONS.en[key] || key;
  }, [snapshot.langTag]);

  return {
    ...snapshot,
    setLanguage: setGlobalLanguage,
    setTimezone: setGlobalTimezone,
    formatDate,
    formatTime,
    formatDateTime,
    formatNumber,
    t,
  };
}
