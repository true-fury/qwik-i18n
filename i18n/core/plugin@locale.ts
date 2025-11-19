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

  // 1️⃣ Extract locale from URL params (sync with route changes)
  let lang = params[cookieName]; // usually params.locale if route is /:locale/...
  const segments = url.pathname.split('/').filter(Boolean);

  // 2️⃣ Check cookie (primary reference for user preference)
  const cookieLang = cookie.get(cookieName)?.value;

  // If URL contains a valid locale, use it and update cookie if necessary
  if (lang && supportedLocales.includes(lang)) {
    if (cookieLang !== lang) {
      cookie.set(cookieName, lang, { path: '/', maxAge: cookieMaxAge });
    }
  } else {
    // If URL locale is invalid, fall back to cookie if valid
    lang = cookieLang && supportedLocales.includes(cookieLang) ? cookieLang : '';
  }

  // 3️⃣ Fallback to Accept-Language header if locale still not determined
  if (!lang) {
    const accept = request.headers.get('accept-language');
    const langs = accept?.split(',').map(l => l.split(';')[0].trim()) || [];
    lang = langs.find(l => supportedLocales.includes(l)) || defaultLocale;
  }

  // 4️⃣ Always set the cookie to ensure full synchronization
  cookie.set(cookieName, lang, { path: '/', maxAge: cookieMaxAge });

  // 5️⃣ Ensure the URL path is correctly prefixed with the locale
  if (!segments[0] || !supportedLocales.includes(segments[0]) || segments[0] !== lang) {
    const newPath = ['', lang, ...segments.slice(supportedLocales.includes(segments[0]) ? 1 : 0)].join('/');
    throw redirect(302, newPath);
  }

  // Continue to the next middleware or route handler
  await next();
};
