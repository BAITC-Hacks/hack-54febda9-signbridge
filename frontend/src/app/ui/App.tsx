import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ConfigProvider } from "antd";
import enUS from "antd/locale/en_US";
import kkKZ from "antd/locale/kk_KZ";
import ruRU from "antd/locale/ru_RU";

import { DashboardPage } from "@/pages/dashboard";
import { LanguageProvider, useLanguage } from "@/shared/i18n";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false },
  },
});

const locales = { ru: ruRU, en: enUS, kk: kkKZ };

function LocalizedApp() {
  const { language } = useLanguage();

  return (
    <ConfigProvider
      locale={locales[language]}
      theme={{
        token: {
          colorPrimary: "#047857",
          colorInfo: "#047857",
          colorSuccess: "#047857",
          colorText: "#14201e",
          colorTextSecondary: "#52615d",
          colorBgLayout: "#f5f5f0",
          borderRadius: 16,
          fontFamily:
            "Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
        },
      }}
    >
      <DashboardPage />
    </ConfigProvider>
  );
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <LocalizedApp />
      </LanguageProvider>
    </QueryClientProvider>
  );
}
