const integerFormatter = new Intl.NumberFormat("ru-RU", {
  maximumFractionDigits: 0,
});
const percentFormatter = new Intl.NumberFormat("ru-RU", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export const integer = (value: number): string =>
  integerFormatter.format(value);
export const money = (value: number): string => `${integer(value)} у.е.`;
export const percent = (value: number, signed = false): string =>
  `${signed && value >= 0 ? "+" : ""}${percentFormatter.format(value)}%`;
export const tariff = (code: string | null): string =>
  code ? `Тариф ${code.replace(/^tariff_/, "")}` : "Любой тариф";

const arpuLabels: Record<string, string> = {
  LOW: "низкая выручка",
  MID: "средняя выручка",
  HIGH: "высокая выручка",
};
const dataLabels: Record<string, string> = {
  NON_USER: "без интернета",
  LITE: "до 2 ГБ",
  HEAVY: "много интернета",
};
const callLabels: Record<string, string> = {
  LOW: "мало звонков",
  MEDIUM: "среднее число звонков",
  HIGH: "много звонков",
};

export function audience(
  arpuSegment: string | null,
  dataSegment: string | null,
  callSegment: string | null,
): string {
  return (
    [
      arpuSegment ? arpuLabels[arpuSegment] || arpuSegment : null,
      dataSegment ? dataLabels[dataSegment] || dataSegment : null,
      callSegment ? callLabels[callSegment] || callSegment : null,
    ]
      .filter(Boolean)
      .join(" · ") || "все абоненты"
  );
}

const channelLabels: Record<string, string> = {
  push: "Push",
  sms: "SMS",
  digital_ads: "Реклама",
  call: "Звонок",
};

export const channelLabel = (channel: string): string =>
  channelLabels[channel] || channel;
