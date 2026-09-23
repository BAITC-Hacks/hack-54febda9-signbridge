import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ConfigProvider } from "antd";
import ruRU from "antd/locale/ru_RU";

import { DashboardPage } from "@/pages/dashboard";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false },
  },
});

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ConfigProvider
        locale={ruRU}
        theme={{
          token: {
            colorPrimary: "#1768ac",
            colorInfo: "#1768ac",
            colorSuccess: "#14835f",
            colorBgLayout: "#f4f7fb",
            borderRadius: 12,
            fontFamily:
              "Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
          },
        }}
      >
        <DashboardPage />
      </ConfigProvider>
    </QueryClientProvider>
  );
}
