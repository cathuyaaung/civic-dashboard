import { arcPath } from './donut';

describe('arcPath', () => {
  it('draws a quarter ring segment with the small-arc flag', () => {
    const d = arcPath(0, Math.PI / 2, 100, 50);
    expect(d).toMatch(/^M230\.00,130\.00 A100,100 0 0 1 130\.00,230\.00 /);
  });

  it('uses the large-arc flag past half a turn', () => {
    expect(arcPath(0, Math.PI * 1.5, 100, 50)).toContain(' 0 1 1 ');
  });

  it('draws a single 100% slice without collapsing to nothing', () => {
    const d = arcPath(-Math.PI / 2, (3 * Math.PI) / 2, 100, 50);
    expect(d).not.toContain('NaN');
    expect(d).toContain(' 0 1 1 ');
  });
});
