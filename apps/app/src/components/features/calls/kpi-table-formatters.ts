export const formatCurrency = (value: number | null | undefined): string => {
  if (value == null || !Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

export const formatMinutes = (value: number | null | undefined): string => {
  if (value == null || !Number.isFinite(value)) return "—";
  const hours = Math.floor(value / 60);
  const minutes = Math.floor(value % 60);
  if (hours === 0) return `${minutes}м`;
  return `${hours}ч ${minutes}м`;
};

export const formatPercentage = (value: number | null | undefined): string => {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${(value * 100).toFixed(1)}%`;
};

export const formatNumber = (value: number | null | undefined): string => {
  if (value == null || !Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("ru-RU").format(value);
};
