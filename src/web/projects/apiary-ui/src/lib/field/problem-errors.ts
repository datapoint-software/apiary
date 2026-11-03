import { FieldTree, ValidationError } from '@angular/forms/signals';
import { ApiProblem } from './api-problem';

type Tree = FieldTree<unknown> & Record<string | number, unknown>;

function resolve(root: FieldTree<unknown>, path: string): FieldTree<unknown> | undefined {
  let current: unknown = root;
  for (const segment of path.split(/[.[\]]/).filter(Boolean)) {
    const key = /^\d+$/.test(segment) ? Number(segment) : segment;
    current = (current as Tree | undefined)?.[key];
  }
  return typeof current === 'function' ? (current as FieldTree<unknown>) : undefined;
}

export function problemErrors(problem: ApiProblem, root: FieldTree<unknown>): ValidationError.WithFieldTree[] {
  if (!problem.errors?.length) {
    return [{ kind: problem.code, fieldTree: root }];
  }
  return problem.errors.map((error) => ({
    kind: error.code,
    params: error.params,
    fieldTree: resolve(root, error.field) ?? root,
  }));
}
