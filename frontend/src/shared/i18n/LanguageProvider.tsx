import { createContext, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";

import { translations } from "./translations";
import type { Language } from "./translations";

interface LanguageContextValue {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (typeof translations)[Language];
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(() => {
    const stored = window.localStorage.getItem("signbridge-language");
    return stored === "ru" || stored === "en" || stored === "kk" ? stored : "ru";
  });

  const value = useMemo(
    () => ({
      language,
      setLanguage: (next: Language) => {
        window.localStorage.setItem("signbridge-language", next);
        setLanguage(next);
      },
      t: translations[language],
    }),
    [language],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  const value = useContext(LanguageContext);
  if (!value) throw new Error("useLanguage must be used inside LanguageProvider");
  return value;
}

export type { Language };
