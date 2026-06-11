import { computeCurrentValue } from './position-value.util';

describe('computeCurrentValue', () => {
  it('computes ERC-4626 current value from 18-decimal shares', () => {
    const currentValue = computeCurrentValue(
      '980392156862745098',
      '1.02735',
      6,
      18,
    );

    expect(currentValue).toBe('1007205');
  });

  it('computes Aave current value from asset-denominated shares and liquidity index', () => {
    const currentValue = computeCurrentValue(
      '20000',
      '1.241339081286161838099727225',
      6,
    );

    expect(currentValue).toBe('24826');
  });

  it('returns zero when shares are zero', () => {
    expect(computeCurrentValue('0', '1.02735', 6)).toBe('0');
  });
});
