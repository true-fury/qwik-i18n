import { component$, Slot } from "@builder.io/qwik";
import { routeLoader$ } from "@builder.io/qwik-city";
import { I18nProvider } from "~/i18n/core/client";
import { getServerLocale } from "~/i18n/core/server";

/**
 * use in routes/layout
 */

export const useLocale = routeLoader$(({ request }) => {
  return getServerLocale(request);
});

export default component$(() => {
  const locale = useLocale().value;

  return (
    <I18nProvider locale={locale}>
        <Slot />
    </I18nProvider>
  );
});
