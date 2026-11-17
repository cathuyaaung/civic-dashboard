import { money, share, signedMoney, signedPercent } from './format';

describe('format', () => {
  it('formats compact dollars', () => {
    expect(money(1_273_523_000)).toBe('$1.27B');
    expect(money(495_967_000)).toBe('$496M');
  });

  it('formats signed dollar changes with a true minus sign', () => {
    expect(signedMoney(221_335_000)).toBe('+$221M');
    expect(signedMoney(-5_200_000)).toBe('−$5.2M');
    expect(signedMoney(0)).toBe('$0');
    expect(signedMoney(null)).toBe('–');
  });

  it('formats shares and signed percentages', () => {
    expect(share(0.389)).toBe('38.9%');
    expect(share(0.0003)).toBe('<0.1%');
    expect(signedPercent(0.816)).toBe('+82%');
    expect(signedPercent(-0.22)).toBe('−22%');
    expect(signedPercent(null)).toBe('–');
  });
});
