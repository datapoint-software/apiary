export interface ApiFieldError {
  readonly field: string;
  readonly code: string;
  readonly params?: Readonly<Record<string, unknown>>;
}

export interface ApiProblem {
  readonly status: number;
  readonly code: string;
  readonly errors?: readonly ApiFieldError[];
  readonly traceId?: string;
}

export function isApiProblem(value: unknown): value is ApiProblem {
  return typeof value === 'object' && value !== null && typeof (value as ApiProblem).code === 'string';
}
