// src/i18n/client.ts (hydration-aware)
import {
  $,
  component$,
  useContextProvider,
  useSignal,
  useVisibleTask$,
  useContext,
  createContextId,
  useStore,
  Slot,
  type QRL,
} from '@builder.io/qwik';
import { i18nConfig } from '~/i18n/config';

// GLOB FIX: eager load for client-side
const localeFiles: Record<string, { default: Record<string, string> }> = import.meta.glob('../locales/**/*.json', { eager: true });

const loadLocaleJSON = (locale: string, ns: string) => {
  const file = localeFiles[`../locales/${locale}/${ns}.json`];
  return file ? file.default || file : null;
};

export const LangContext = createContextId<{
  locale: string;
  setLocale$: QRL<(lang: string) => void>;
  translations: Record<string, Record<string, string>>;
}>('lang');

export const I18nProvider = component$((props: { locale: string; initialTranslations?: Record<string, Record<string, string>> }) => {
  const localeSig = useSignal(props.locale);
  const translations = useStore<Record<string, Record<string, string>>>(props.initialTranslations || {});

  const setLocale$ = $((lang: string) => {
    const validLang = i18nConfig.supportedLocales.includes(lang) ? lang : i18nConfig.defaultLocale;
    document.cookie = `${i18nConfig.cookieName}=${validLang};path=/`;
    localeSig.value = validLang;

    // Sync URL by redirecting to the new locale path
    const currentPath = window.location.pathname;
    const segments = currentPath.split('/').filter(Boolean);
    const currentLangIndex = i18nConfig.supportedLocales.includes(segments[0]) ? 0 : -1;
    const newSegments = [validLang, ...(currentLangIndex >= 0 ? segments.slice(1) : segments)];
    const newPath = '/' + newSegments.join('/');
    window.location.href = newPath + window.location.search;
  });

  // Ensure client-side sync with cookie on mount (in case of manual cookie changes)
  useVisibleTask$(() => {
    const cookieMatch = document.cookie.match(new RegExp(`${i18nConfig.cookieName}=([^;]+)`));
    const cookieLang = cookieMatch ? cookieMatch[1] : null;
    if (cookieLang && i18nConfig.supportedLocales.includes(cookieLang) && cookieLang !== localeSig.value) {
      setLocale$(cookieLang);
    }
  });

  // Watch locale change and potentially reload, but since per-ns, handled in useTranslate
  useVisibleTask$(({ track }) => {
    track(() => localeSig.value);
    // Optional: global reload if you want, but better per-hook
  });

  useContextProvider(LangContext, { locale: localeSig.value, setLocale$, translations });
  return <Slot />;
});

export const useTranslate = (
  namespace: string,
  keyPrefix?: string,
  langOverride?: string
) => {
  const ctx = useContext(LangContext);
  const locale = langOverride && i18nConfig.supportedLocales.includes(langOverride)
    ? langOverride
    : ctx.locale || i18nConfig.defaultLocale;

  const translations = useStore<Record<string, any>>(ctx.translations[namespace] || {});

  const loaded = useSignal(Object.keys(translations).length > 0); // initial check if SSR provided
  useVisibleTask$(({ track }) => {
    track(() => locale);
    if (!loaded.value) {
      let json = loadLocaleJSON(locale, namespace);
      if (!json && locale !== i18nConfig.defaultLocale) {
        json = loadLocaleJSON(i18nConfig.defaultLocale, namespace);
      }
      if (json) {
        Object.assign(translations, json);
        ctx.translations[namespace] = translations;
        loaded.value = true;
      } else {
        loaded.value = true; // fallback to keys if failed
      }
    }
  });

  const getNested = $((obj: any, path: string): string | undefined => {
    const parts = path.split('.');
    let current = obj;
    for (const part of parts) {
      if (typeof current !== 'object' || current == null || !(part in current)) {
        return undefined;
      }
      current = current[part];
    }
    return typeof current === 'string' ? current : undefined;
  });

  const t = $((key: string) => {
    const fullKey = keyPrefix ? `${keyPrefix}.${key}` : key;
    return getNested(translations, fullKey) ?? getNested(translations, key) ?? '';
  });

  const tAsync = $(async (key: string) => {
    if (Object.keys(translations).length === 0) {
      let json = loadLocaleJSON(locale, namespace);
      if (!json && locale !== i18nConfig.defaultLocale) {
        json = loadLocaleJSON(i18nConfig.defaultLocale, namespace);
      }
      if (json) Object.assign(translations, json);
    }
    const fullKey = keyPrefix ? `${keyPrefix}.${key}` : key;
    return getNested(translations, fullKey) ?? getNested(translations, key) ?? '';
  });

  return {
    t,
    tAsync,
    locale,
    loaded: loaded.value,
    setLocale$: ctx.setLocale$
  };
};
