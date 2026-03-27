import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

// RO
import roCommon from "./resources/ro/common.json";
import roDashboard from "./resources/ro/dashboard.json";
import roOrders from "./resources/ro/orders.json";
import roEmployees from "./resources/ro/employees.json";
import roDrivers from "./resources/ro/drivers.json";
import roTrucks from "./resources/ro/trucks.json";
import roTrips from "./resources/ro/trips.json";
import roInvoices from "./resources/ro/invoices.json";
import roReports from "./resources/ro/reports.json";
import roCosts from "./resources/ro/costs.json";
import roActivityLog from "./resources/ro/activityLog.json";
import roFleet from "./resources/ro/fleet.json";
import roAccounting from "./resources/ro/accounting.json";
import roHr from "./resources/ro/hr.json";
import roSettings from "./resources/ro/settings.json";
import roMaintenance from "./resources/ro/maintenance.json";
import roFuelLog from "./resources/ro/fuelLog.json";
import roInvoiceGenerator from "./resources/ro/invoiceGenerator.json";

// EN
import enCommon from "./resources/en/common.json";
import enDashboard from "./resources/en/dashboard.json";
import enOrders from "./resources/en/orders.json";
import enEmployees from "./resources/en/employees.json";
import enDrivers from "./resources/en/drivers.json";
import enTrucks from "./resources/en/trucks.json";
import enTrips from "./resources/en/trips.json";
import enInvoices from "./resources/en/invoices.json";
import enReports from "./resources/en/reports.json";
import enCosts from "./resources/en/costs.json";
import enActivityLog from "./resources/en/activityLog.json";
import enFleet from "./resources/en/fleet.json";
import enAccounting from "./resources/en/accounting.json";
import enHr from "./resources/en/hr.json";
import enSettings from "./resources/en/settings.json";
import enMaintenance from "./resources/en/maintenance.json";
import enFuelLog from "./resources/en/fuelLog.json";
import enInvoiceGenerator from "./resources/en/invoiceGenerator.json";

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: "ro",
    debug: false,

    resources: {
      en: {
        translation: {
          ...enCommon,
          ...enDashboard,
          ...enOrders,
          ...enEmployees,
          ...enDrivers,
          ...enTrucks,
          ...enTrips,
          ...enInvoices,
          ...enReports,
          ...enCosts,
          ...enActivityLog,
          ...enFleet,
          ...enAccounting,
          ...enHr,
          ...enSettings,
          ...enMaintenance,
          ...enFuelLog,
          ...enInvoiceGenerator,
        },
      },
      ro: {
        translation: {
          ...roCommon,
          ...roDashboard,
          ...roOrders,
          ...roEmployees,
          ...roDrivers,
          ...roTrucks,
          ...roTrips,
          ...roInvoices,
          ...roReports,
          ...roCosts,
          ...roActivityLog,
          ...roFleet,
          ...roAccounting,
          ...roHr,
          ...roSettings,
          ...roMaintenance,
          ...roFuelLog,
          ...roInvoiceGenerator,
        },
      },
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
