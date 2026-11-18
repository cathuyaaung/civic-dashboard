const compactMoney = new Intl.NumberFormat('en-CA', {
  style: 'currency',
  currency: 'CAD',
  currencyDisplay: 'narrowSymbol',
  notation: 'compact',
  maximumSignificantDigits: 3,
});

/** $1.27B, $496M, $932K */
export const money = (dollars: number): string => compactMoney.format(dollars);

/** +$221M, −$5.2M (true minus sign), $0, or – when unknown. */
export function signedMoney(dollars: number | null): string {
  if (dollars === null || !Number.isFinite(dollars)) return '–';
  if (Math.abs(dollars) < 0.5) return '$0';
  return `${dollars > 0 ? '+' : '−'}${money(Math.abs(dollars))}`;
}

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

const wholeNumber = new Intl.NumberFormat('en-CA', { maximumFractionDigits: 0 });

const exactDollars = new Intl.NumberFormat('en-CA', {
  style: 'currency',
  currency: 'CAD',
  currencyDisplay: 'narrowSymbol',
  maximumFractionDigits: 0,
});

/** 764,597 — for counts of things, where compact notation would hide detail. */
export const count = (n: number): string => wholeNumber.format(n);

/** +16,707, −16,707 (true minus sign), 0, or – when unknown. */
export function signedCount(n: number | null): string {
  if (n === null || !Number.isFinite(n)) return '–';
  const rounded = Math.round(n);
  if (rounded === 0) return '0';
  return `${rounded > 0 ? '+' : '−'}${wholeNumber.format(Math.abs(rounded))}`;
}

/** $1,666 — exact dollars, for per-person amounts that compact notation ruins. */
export const dollars = (n: number): string => exactDollars.format(n);
