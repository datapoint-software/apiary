export const minimumPasswordLength = 15;
export const maximumPasswordLength = 256;

export interface PasswordRule {
  readonly label: string;
  readonly met: boolean;
}

function isRepetition(password: string): boolean {
  const lower = password.toLowerCase();
  for (let unit = 1; unit <= 4; unit++) {
    if (lower.length > unit && [...lower].every((c, i) => c === lower[i % unit])) {
      return true;
    }
  }
  return false;
}

function containsEmailName(password: string, email: string): boolean {
  const name = email.split('@')[0].trim().toLowerCase();
  return name.length >= 3 && password.toLowerCase().includes(name);
}

export function passwordRules(password: string, email = ''): readonly PasswordRule[] {
  return [
    { label: 'At least {min} characters', met: password.length >= minimumPasswordLength },
    { label: 'Not a common password or repeated characters', met: password.length > 0 && !isRepetition(password) },
    { label: 'Doesn’t contain your email name', met: password.length > 0 && !containsEmailName(password, email) },
  ];
}

export function checkNewPassword(password: string, email = ''): string | null {
  if (!password) {
    return 'required';
  }
  if (password.length < minimumPasswordLength) {
    return 'password.tooShort';
  }
  if (password.length > maximumPasswordLength) {
    return 'password.tooLong';
  }
  if (isRepetition(password)) {
    return 'password.common';
  }
  return containsEmailName(password, email) ? 'password.containsEmail' : null;
}
