import { isApiProblem } from './api-problem';

describe('isApiProblem', () => {
  it('recognizes a problem with a code', () => {
    expect(isApiProblem({ status: 409, code: 'route.exists' })).toBe(true);
  });

  it.each([
    [null],
    [undefined],
    ['route.exists'],
    [new Error('offline')],
    [{ status: 500 }],
    [{ code: 42 }],
  ])('refuses %j', (value) => {
    expect(isApiProblem(value)).toBe(false);
  });
});
