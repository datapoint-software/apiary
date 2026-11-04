import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { currentStep, totp } from './totp';

export const admin = {
  name: 'Ana Lopes',
  email: 'ana@example.com',
  password: 'correct horse battery staple 42',
};

export const adminState = join(__dirname, '../.auth/admin.json');
const secretFile = join(__dirname, '../.auth/secret.json');

interface Secret {
  readonly secret: string;
  readonly lastStep: number;
}

export function saveSecret(secret: string): void {
  mkdirSync(dirname(secretFile), { recursive: true });
  writeFileSync(secretFile, JSON.stringify({ secret, lastStep: currentStep() }));
}

function readSecret(): Secret {
  return JSON.parse(readFileSync(secretFile, 'utf8')) as Secret;
}

export async function freshCode(): Promise<string> {
  const { secret, lastStep } = readSecret();
  while (currentStep() <= lastStep) {
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  const step = currentStep();
  writeFileSync(secretFile, JSON.stringify({ secret, lastStep: step }));
  return totp(secret, step);
}
