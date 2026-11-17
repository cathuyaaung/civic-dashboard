const compactMoney = new Intl.NumberFormat('en-CA', {
  style: 'currency',
  currency: 'CAD',
  currencyDisplay: 'narrowSymbol',
  notation: 'compact',
  maximumSignificantDigits: 3,
});

/** $1.27B, $496M, $932K */
export const money = (dollars: number): string => compactMoney.format(dollars);

/** 38.9%, or <0.1% for tiny non-zero shares. */
export function share(fraction: number): string {
  if (fraction > 0 && fraction < 0.001) return '<0.1%';
  return `${(fraction * 100).toFixed(1)}%`;
}

/** +81%, −12% (true minus sign), or – when unknown. */
export function signedPercent(fraction: number | null): string {
  if (fraction === null || !Number.isFinite(fraction)) return '–';
  const pct = Math.round(fraction * 100);
  return pct > 0 ? `+${pct}%` : pct < 0 ? `−${Math.abs(pct)}%` : '0%';
}
