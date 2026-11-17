import { formatPhone } from './ward';

describe('formatPhone', () => {
  it('adds the 905 area code to the 7-digit numbers the city publishes', () => {
    expect(formatPhone('896-5011')).toEqual({ display: '905-896-5011', href: 'tel:+19058965011' });
  });

  it('keeps a number that already has an area code', () => {
    expect(formatPhone('(905) 896-5011')).toEqual({
      display: '905-896-5011',
      href: 'tel:+19058965011',
    });
  });

  it('passes through anything it does not recognise', () => {
    expect(formatPhone('ext. 12')).toEqual({ display: 'ext. 12', href: 'tel:12' });
  });
});
