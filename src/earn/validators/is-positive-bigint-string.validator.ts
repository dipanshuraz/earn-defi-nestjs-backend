import {
  registerDecorator,
  ValidationOptions,
} from 'class-validator';

export function IsPositiveBigIntString(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string): void {
    registerDecorator({
      name: 'isPositiveBigIntString',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown): boolean {
          if (typeof value !== 'string' || !/^\d+$/.test(value)) {
            return false;
          }

          try {
            return BigInt(value) > 0n;
          } catch {
            return false;
          }
        },
        defaultMessage(): string {
          return 'amount must be a positive integer string';
        },
      },
    });
  };
}
