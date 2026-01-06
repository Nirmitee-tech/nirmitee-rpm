'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import { type Locale, defaultLocale, locales } from '@/i18n/config';

type Messages = Record<string, unknown>;

interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  isLoading: boolean;
}

const I18nContext = createContext<I18nContextValue | undefined>(undefined);

const LOCALE_STORAGE_KEY = 'app_locale';

// Cache for loaded messages
const messagesCache: Partial<Record<Locale, Messages>> = {};

// Load messages for a locale
async function loadMessages(locale: Locale): Promise<Messages> {
  if (messagesCache[locale]) {
    return messagesCache[locale]!;
  }

  try {
    const messages = await import(`@/messages/${locale}.json`);
    messagesCache[locale] = messages.default;
    return messages.default;
  } catch (error) {
    console.error(`Failed to load messages for locale: ${locale}`, error);
    // Fallback to English
    if (locale !== 'en') {
      return loadMessages('en');
    }
    return {};
  }
}

// Get nested value from object by dot-notation path
function getNestedValue(obj: unknown, path: string): string | undefined {
  const keys = path.split('.');
  let current: unknown = obj;

  for (const key of keys) {
    if (current === null || current === undefined) {
      return undefined;
    }
    if (typeof current !== 'object') {
      return undefined;
    }
    current = (current as Record<string, unknown>)[key];
  }

  return typeof current === 'string' ? current : undefined;
}

// Replace parameters in string
function interpolate(
  str: string,
  params?: Record<string, string | number>
): string {
  if (!params) return str;

  return str.replace(/\{(\w+)\}/g, (_, key) => {
    return params[key]?.toString() ?? `{${key}}`;
  });
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(defaultLocale);
  const [messages, setMessages] = useState<Messages>({});
  const [isLoading, setIsLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  // Handle mounting and load initial locale from localStorage
  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (stored && locales.includes(stored as Locale)) {
      setLocaleState(stored as Locale);
    }
  }, []);

  // Load messages when locale changes
  useEffect(() => {
    if (!mounted) return;
    setIsLoading(true);
    loadMessages(locale).then((msgs) => {
      setMessages(msgs);
      setIsLoading(false);
    });
  }, [locale, mounted]);

  // Load default messages on first render (SSR safe)
  useEffect(() => {
    loadMessages(defaultLocale).then((msgs) => {
      setMessages(msgs);
      setIsLoading(false);
    });
  }, []);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    if (typeof window !== 'undefined') {
      localStorage.setItem(LOCALE_STORAGE_KEY, newLocale);
      document.documentElement.lang = newLocale;
    }
  }, []);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>): string => {
      const value = getNestedValue(messages, key);
      if (value === undefined) {
        console.warn(`Missing translation for key: ${key}`);
        return key;
      }
      return interpolate(value, params);
    },
    [messages]
  );

  return (
    <I18nContext.Provider value={{ locale, setLocale, t, isLoading }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within I18nProvider');
  }
  return context;
}

export function useTranslations(namespace?: string) {
  const { t, locale, isLoading } = useI18n();

  const translate = useCallback(
    (key: string, params?: Record<string, string | number>): string => {
      const fullKey = namespace ? `${namespace}.${key}` : key;
      return t(fullKey, params);
    },
    [t, namespace]
  );

  return { t: translate, locale, isLoading };
}
