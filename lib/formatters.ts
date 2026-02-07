export function formatCurrency(params: {
  amount: number;
  currency: string;
  locale: string;
}): string {
  return new Intl.NumberFormat(params.locale, {
    style: "currency",
    currency: params.currency,
  }).format(params.amount / 100);
}
