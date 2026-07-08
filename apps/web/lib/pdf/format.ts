export function formatDateTime(value: string) {
  return new Date(value).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" });
}

export function formatCurrency(value: string | number | null) {
  if (value === null) return "-";
  return new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB" }).format(Number(value));
}
