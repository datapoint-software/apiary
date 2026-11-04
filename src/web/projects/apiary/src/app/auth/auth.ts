import { Service, computed, inject, signal } from '@angular/core';
import { ApiProblem } from '@datapoint/apiary-ui';
import { Api } from '../api/api';
import { Role, SignedInUser } from '../api/models';
import { LanguageChoice } from './language-choice';
import { hasRole } from './roles';

@Service()
export class Auth {
  private readonly api = inject(Api);
  private readonly language = inject(LanguageChoice);
  readonly user = signal<SignedInUser | null>(null);
  readonly canOperate = computed(() => hasRole(this.user()?.role, 'operator'));
  readonly canAdminister = computed(() => hasRole(this.user()?.role, 'administrator'));

  async load(): Promise<SignedInUser | null> {
    try {
      const user = await this.api.read<SignedInUser>('auth.me');
      this.user.set(user);
      this.language.follow(user.language);
      return user;
    } catch (problem) {
      if ((problem as ApiProblem).status === 401) {
        this.user.set(null);
        return null;
      }
      throw problem;
    }
  }

  has(role: Role): boolean {
    return hasRole(this.user()?.role, role);
  }

  async signOut(): Promise<void> {
    try {
      await this.api.send('auth.sign-out');
    } finally {
      this.user.set(null);
    }
  }
}
