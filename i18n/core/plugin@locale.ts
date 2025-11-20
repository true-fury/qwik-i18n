// src/i18n/plugin@locale.ts
import type { RequestHandler } from '@builder.io/qwik-city';
import { i18nConfig } from '~/i18n/config';

/**
 * 1: Create routes/plugin.ts
 * 2: Activate plugin:
 * // routes/plugin.ts
 * import localePlugin from "~/i18n/core/plugin@locale";
 * export default onRequest = [localePlugin];
 */

/**
 * Middleware to determine the user's locale for each request.
 * It checks URL params, cookies, and Accept-Language headers in order of priority,
 * then ensures the locale is synchronized in both the URL and cookie.
 */
export const localePlugin: RequestHandler = async ({ request, params, url, cookie, redirect, next }) => {
  const { defaultLocale, supportedLocales, cookieName, cookieMaxAge } = i18nConfig;

  let lang = params[cookieName];
  const segments = url.pathname.split('/').filter(Boolean);
  const cookieLang = cookie.get(cookieName)?.value;

  // Trust valid URL locale and sync cookie
  if (lang && supportedLocales.includes(lang)) {
    if (cookieLang !== lang) {
      cookie.set(cookieName, lang, { path: '/', maxAge: cookieMaxAge });
    }
  } else {
    lang = cookieLang && supportedLocales.includes(cookieLang) ? cookieLang : '';
  }

  // Fallback to Accept-Language
  if (!lang) {
    const accept = request.headers.get('accept-language');
    const preferred = accept
      ?.split(',')
      .map(l => l.split(';')[0].trim().toLowerCase())
      .find(l => supportedLocales.includes(l));
    lang = preferred || defaultLocale;
  }

  // Always sync cookie
  cookie.set(cookieName, lang, { path: '/', maxAge: cookieMaxAge });

  // CRITICAL FIX: Only enforce locale prefix if it's missing or invalid
  const firstSegment = segments[0];
  const hasValidPrefix = firstSegment && supportedLocales.includes(firstSegment);

  if (!firstSegment || !hasValidPrefix) {
    // Replace invalid prefix OR add missing one
    const cleanSegments = firstSegment ? segments.slice(1) : segments;
    const newPath = '/' + [lang, ...cleanSegments].join('/') + (url.pathname.endsWith('/') ? '/' : '');
    throw redirect(302, newPath);
  }

  // If URL already has a valid locale (even if different from preferred), respect it!
  await next();
};
