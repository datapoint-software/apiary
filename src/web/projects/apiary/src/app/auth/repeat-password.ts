import { SchemaPath, validate } from '@angular/forms/signals';

export function matchesPassword(path: SchemaPath<string>, password: () => string): void {
  validate(path, ({ value }) => {
    if (!value()) {
      return { kind: 'password.again' };
    }
    return value() === password() ? undefined : { kind: 'password.mismatch' };
  });
}
