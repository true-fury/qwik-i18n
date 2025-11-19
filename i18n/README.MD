# Qwik Multilingual (i18n) Setup – Zero-Config, Fully SSR + Hydration Safe

This is a complete, production-ready i18n implementation for Qwik (Qwik City) that works with SSR, resumability, and lazy-loading of translations.

Works out-of-the-box with locale-prefixed routes like `/en/about`, `/de/contact`, etc.

## Features

- Full SSR support (translations available on first paint)  
- Automatic locale detection (URL → cookie → Accept-Language)  
- Automatic redirect to correct locale-prefixed URL  
- Lazy per-namespace loading on the client (only loads what you use)  
- Cookie + URL synchronization  
- Nested keys support (`common:errors.notFound`)  
- No extra build step – just JSON files  
- Works perfectly with `<title>`, meta tags, `DocumentHead`, etc.

## Project Structure (just copy the whole `src/i18n` folder)

```
src/i18n
├── core
│   ├── client.tsx
│   ├── plugin@locale.ts
│   └── server.ts
├── locales
│   ├── en
│   │   ├── app.json
│   │   └── common.json
│   └── de
│       ├── app.json
│       └── common.json
├── config.ts
├── Layout.tsx
└── README.md
```

Just copy the entire `i18n` folder into your `src/` directory – do not modify the internal structure.

## 1. Activate the middleware (only once)

Create or edit `src/routes/plugin.ts`:

```ts
// src/routes/plugin.ts
import localePlugin from "~/i18n/core/plugin@locale";

export const onRequest = [localePlugin];
```

That’s it – every request will now be locale-aware.

## 2. Use the layout (already provided)

Your root layout must use the provided `Layout.tsx`:

```tsx
// src/routes/layout.tsx
// Content of ~/i18n/Layout.tsx
```

All pages will now have the correct locale available.

## 3. How to translate in components (client + SSR)

```tsx
import { component$ } from '@builder.io/qwik';
import { useTranslate } from '~/i18n/core/client';

export default component$(() => {
  const { t, tAsync, locale } = useTranslate('common'); // or 'app', etc.

  return (
    <div>
      {/* Synchronous (recommended when namespace already loaded by SSR) */}
      <h1>{t('welcome')}</h1>

      {/* IMPORTANT: NEVER concatenate like this */}
      {/* <p>{t('hello') + ' John'}</p> ← WRONG – returns a Promise object! */}
      {/* <p>{`${t('hello')} John`}</p>                     {/* template literal */}

      {/* Correct ways: */}
      <p>{t('hello')}{' John'}</p>                     {/* separate curly braces */}
      <p>{t('helloWithName', { name: 'John' })}</p>     {/* if you use ICU-style {name} */}

      {/* Async version (rarely needed) */}
      {/* tAsync returns a Promise → NEVER use directly in JSX! */}
      {/* Only call it inside async context (useVisibleTask$, routeLoader$, etc.) */}
      <p>{tAsync('someVeryRareKey')}</p> {/* ERROR! */}
    </div>
  );
});
```

### Critical Rule

Never do string concatenation or interpolation with the result of `t()` inside the same `{}` expression:

```tsx
{/* NEVER */}
{ t('key') + ' static text' }
{ `${t('key')} static text` }

{/* ALWAYS */}
{ t('key') }{ ' static text' }        {/* separate expressions */}
```

Because `t()` returns a QRL (function) on the client until the namespace is loaded – concatenating it will print `[object Promise]` or similar garbage.

## 4. Server-side translations (SSR) – perfect for meta tags

```tsx
// src/routes/best/index.tsx
import { routeLoader$ } from '@builder.io/qwik-city';
import { getTranslate } from '~/i18n/server';
import type { DocumentHead } from '@builder.io/qwik-city';

export const useMetaForBest = routeLoader$(async ({ params }) => {
  const { t } = getTranslate(params.locale ?? 'en', 'app');

  return {
    title: await t('best.title'),
    description: await t('best.description'),
  };
});

export const head: DocumentHead = ({ resolveValue }) => {
  const meta = resolveValue(useMetaForBest);

  return {
    title: meta?.title,
    meta: [
      {
        name: 'description',
        content: meta?.description,
      },
    ],
  };
};
```

## 5. Best Practices – Keep It Fast

- Create one namespace JSON file per page/section  
  Example: `src/i18n/locales/de/about.json`, `home.json`, `dashboard.json`, etc.
- Always call `useTranslate('yourNamespace')` on the page that needs it – only that file will be downloaded.
- Common texts (buttons, errors, navigation) → put in `common.json`
- Page-specific texts → separate namespace → zero waste

## 6. Adding a new language

1. Add the locale code to `supportedLocales` in `src/i18n/config.ts`
   ```ts
   supportedLocales: ['en', 'de', 'fr'],
   ```
2. Create the folder `src/i18n/locales/fr/` and add the same JSON files as in `en/`

That’s all – no code changes anywhere else.

## You’re done!

Just copy the `i18n` folder, add the two files (`routes/plugin.ts` + root layout), and start translating.

Enjoy a perfectly working, fast, SEO-friendly multilingual Qwik app!
