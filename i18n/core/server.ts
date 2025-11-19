// src/i18n/server.ts
import fs from 'fs';
import path from 'path';
import { i18nConfig } from '~/i18n/config';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

export const getServerLocale = (request: Request): string => {
  const cookie = request.headers.get('cookie');
  const match = cookie?.match(new RegExp(`${i18nConfig.cookieName}=([^;]+)`));
  if (match && i18nConfig.supportedLocales.includes(match[1])) return match[1];

  const accept = request.headers.get('accept-language');
  if (!accept) return i18nConfig.defaultLocale;

  const langs = accept.split(',').map(l => l.split(';')[0].trim());
  const detected = langs.find(l => i18nConfig.supportedLocales.includes(l)) || i18nConfig.defaultLocale;
  return detected;
};

export function loadNamespaceSync(locale: string, namespace: string): Record<string, string> {
  const loc = i18nConfig.supportedLocales.includes(locale) ? locale : i18nConfig.defaultLocale;
  
  const basePath = path.join(__dirname, '../locales');
  const nsPath = path.join(basePath, `${loc}/${namespace}.json`);
  
  console.log('Trying to load:', nsPath);
  
  if (!fs.existsSync(nsPath)) {
    console.warn(`Namespace ${namespace} not found at ${nsPath} for locale ${loc}`);
    return {};
  }
  const content = fs.readFileSync(nsPath, 'utf-8');
  console.log('Loaded content length:', content.length);
  return JSON.parse(content);
}

export function useTranslateSSR(locale: string, namespace: string, keyPrefix?: string) {
  const data = loadNamespaceSync(locale, namespace);

  const getNested = (obj: any, path: string): string | undefined => {
    const parts = path.split('.');
    let current = obj;
    for (const part of parts) {
      if (typeof current !== 'object' || current == null || !(part in current)) {
        return undefined;
      }
      current = current[part];
    }
    return typeof current === 'string' ? current : undefined;
  };

  const t = (key: string, vars?: Record<string, any>) => {
    const fullKey = keyPrefix ? `${keyPrefix}.${key}` : key;
    let str = getNested(data, fullKey) ?? getNested(data, key) ?? key;

    if (vars) {
      str = str.replace(/\{(\w+)\}/g, (_, k) =>
        k in vars ? String(vars[k]) : `{${k}}`
      );
    }
    return str;
  };

  const tAsync = async (key: string, vars?: Record<string, any>) => t(key, vars);

  return { t, tAsync };
}