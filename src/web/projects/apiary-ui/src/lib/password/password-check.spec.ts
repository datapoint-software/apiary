import {
  checkNewPassword,
  maximumPasswordLength,
  minimumPasswordLength,
  passwordRules,
} from './password-check';

function aPassword(length = minimumPasswordLength): string {
  return 'correct horse battery staple '.repeat(20).slice(0, length);
}

const email = 'maria.silva@example.com';

describe('checkNewPassword', () => {
  it('requires a password', () => {
    expect(checkNewPassword('')).toBe('required');
  });

  it('refuses a password shorter than the minimum', () => {
    expect(checkNewPassword(aPassword(minimumPasswordLength - 1))).toBe('password.tooShort');
  });

  it('refuses a password longer than the maximum', () => {
    expect(checkNewPassword(aPassword(maximumPasswordLength + 1))).toBe('password.tooLong');
  });

  it.each([['a'.repeat(15)], ['AAAAAAAaaaaaaaa'], ['abababababababab'], ['abcdabcdabcdabcd']])(
    'refuses the repetition %j as common',
    (password) => {
      expect(checkNewPassword(password)).toBe('password.common');
    },
  );

  it('refuses a password that contains the email name', () => {
    expect(checkNewPassword('my name is Maria.Silva ok', email)).toBe('password.containsEmail');
  });

  it('ignores an email name shorter than three characters', () => {
    expect(checkNewPassword('jo likes long passwords', 'jo@example.com')).toBeNull();
  });

  it('accepts a long password of unrelated words', () => {
    expect(checkNewPassword(aPassword(), email)).toBeNull();
  });

  it('accepts a password of exactly the maximum length', () => {
    expect(checkNewPassword(aPassword(maximumPasswordLength))).toBeNull();
  });
});

describe('passwordRules', () => {
  it('meets no rule for an empty password', () => {
    expect(passwordRules('', email).map((rule) => rule.met)).toEqual([false, false, false]);
  });

  it('meets every rule for a good password', () => {
    expect(passwordRules(aPassword(), email).map((rule) => rule.met)).toEqual([true, true, true]);
  });

  it('marks only the length rule as unmet for a short password', () => {
    expect(passwordRules('short words', email).map((rule) => rule.met)).toEqual([
      false,
      true,
      true,
    ]);
  });

  it('marks the repetition rule as unmet for repeated characters', () => {
    expect(passwordRules('x'.repeat(20))[1].met).toBe(false);
  });

  it('marks the email rule as unmet when the password contains the email name', () => {
    expect(passwordRules('hello maria.silva there', email)[2].met).toBe(false);
  });

  it('labels the rules with English text to translate', () => {
    expect(passwordRules('').map((rule) => rule.label)).toEqual([
      'At least {min} characters',
      'Not a common password or repeated characters',
      'Doesn’t contain your email name',
    ]);
  });
});
