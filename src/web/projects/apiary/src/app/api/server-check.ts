import { HttpResourceRequest } from '@angular/common/http';
import { FieldContext, SchemaPath, validateHttp } from '@angular/forms/signals';

interface FieldCheck {
  readonly field: string;
  readonly code: string;
}

export function serverCheck<TValue>(
  path: SchemaPath<TValue>,
  action: string,
  fields: readonly string[],
  body: (ctx: FieldContext<TValue>) => object,
): void {
  validateHttp(path, {
    request: (ctx): HttpResourceRequest => ({ url: `/api/${action.replaceAll('.', '/')}`, method: 'POST', body: body(ctx) }),
    debounce: 400,
    when: ({ value }) => value() !== '' && value() !== null,
    onSuccess: (checks: FieldCheck[]) => checks.filter((check) => fields.includes(check.field)).map((check) => ({ kind: check.code })),
    onError: () => undefined,
  });
}
