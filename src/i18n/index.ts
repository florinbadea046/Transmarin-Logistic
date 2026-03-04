import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import enCommon from "./resources/en/common.json";
import roCommon from "./resources/ro/common.json";

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: "ro",
    debug: false,

    resources: {
      en: { translation: enCommon },
      ro: { translation: roCommon },
    },

    interpolation: {
      escapeValue: false,
    },

    detection: {
      order: ["localStorage", "navigator"],
      caches: ["localStorage"],
      lookupLocalStorage: "transmarin_lang",
    },

    react: {
      useSuspense: false,
    },
  });

export default i18n;
