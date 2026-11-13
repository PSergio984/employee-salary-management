export interface SalaryRates {
  monthly: string;
  annual: string;
  daily: string;
  hourly: string;
  minute: string;
}

export function roundHalfUpDiv(numeratorCents: bigint, denominator: bigint): string {
  const roundedCents = (2n * numeratorCents + denominator) / (2n * denominator);
  const whole = roundedCents / 100n;
  const fraction = roundedCents % 100n;
  return `${whole}.${fraction.toString().padStart(2, '0')}`;
}

export function calculateRates(monthlyStr: string): SalaryRates {
  const [whole, frac = ''] = monthlyStr.split('.');
  const cents = BigInt(whole) * 100n + BigInt((frac + '00').slice(0, 2));
  const annualCents = cents * 12n;

  const annual = `${annualCents / 100n}.${(annualCents % 100n).toString().padStart(2, '0')}`;
  const daily = roundHalfUpDiv(annualCents, 314n);
  const hourly = roundHalfUpDiv(annualCents, 314n * 8n);
  const minute = roundHalfUpDiv(annualCents, 314n * 8n * 60n);

  return {
    monthly: monthlyStr,
    annual,
    daily,
    hourly,
    minute,
  };
}
