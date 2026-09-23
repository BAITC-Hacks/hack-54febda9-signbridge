import { translations } from "@/shared/i18n/translations";
import type { Language } from "@/shared/i18n";

const locale: Record<Language, string> = {
  ru: "ru-RU",
  en: "en-US",
  kk: "kk-KZ",
};

export const integer = (value: number, language: Language = "ru"): string =>
  new Intl.NumberFormat(locale[language], { maximumFractionDigits: 0 }).format(value);
export const money = (value: number, language: Language = "ru"): string => {
  const unit = language === "en" ? "u.e." : language === "kk" ? "ш.б." : "у.е.";
  return `${integer(value, language)} ${unit}`;
};
export const percent = (
  value: number,
  signed = false,
  language: Language = "ru",
): string => {
  const formatted = new Intl.NumberFormat(locale[language], {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
  return `${signed && value >= 0 ? "+" : ""}${formatted}%`;
};
export const tariff = (code: string | null, language: Language = "ru"): string =>
  code
    ? `${language === "en" ? "Tariff" : "Тариф"} ${code.replace(/^tariff_/, "")}`
    : translations[language].anyTariff;

export function audience(
  arpuSegment: string | null,
  dataSegment: string | null,
  callSegment: string | null,
  language: Language = "ru",
): string {
  const t = translations[language];
  const arpuLabels: Record<string, string> = {
    LOW: t.lowRevenue,
    MID: t.midRevenue,
    HIGH: t.highRevenue,
  };
  const dataLabels: Record<string, string> = {
    NON_USER: t.noInternet,
    LITE: t.lightData,
    HEAVY: t.heavyData,
  };
  const callLabels: Record<string, string> = {
    LOW: t.lowCalls,
    MEDIUM: t.midCalls,
    HIGH: t.highCalls,
  };
  return (
    [
      arpuSegment ? arpuLabels[arpuSegment] || arpuSegment : null,
      dataSegment ? dataLabels[dataSegment] || dataSegment : null,
      callSegment ? callLabels[callSegment] || callSegment : null,
    ]
      .filter(Boolean)
      .join(" · ") || t.allSubscribers
  );
}

const channelLabels: Record<Language, Record<string, string>> = {
  ru: {
  push: "Push",
  sms: "SMS",
  digital_ads: "Реклама",
  call: "Звонок",
  },
  en: { push: "Push", sms: "SMS", digital_ads: "Ads", call: "Call" },
  kk: { push: "Push", sms: "SMS", digital_ads: "Жарнама", call: "Қоңырау" },
};

export const channelLabel = (channel: string, language: Language = "ru"): string =>
  channelLabels[language][channel] || channel;
