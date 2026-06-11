import { validate } from 'class-validator';
import { IsPositiveBigIntString } from './is-positive-bigint-string.validator';

class AmountDto {
  @IsPositiveBigIntString()
  amount!: string;
}

describe('IsPositiveBigIntString', () => {
  it('accepts positive integer strings', async () => {
    const dto = new AmountDto();
    dto.amount = '1000000';

    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it('rejects zero', async () => {
    const dto = new AmountDto();
    dto.amount = '0';

    await expect(validate(dto)).resolves.not.toHaveLength(0);
  });

  it('rejects negative values and decimals', async () => {
    const negative = new AmountDto();
    negative.amount = '-1';

    const decimal = new AmountDto();
    decimal.amount = '1.5';

    await expect(validate(negative)).resolves.not.toHaveLength(0);
    await expect(validate(decimal)).resolves.not.toHaveLength(0);
  });
});
