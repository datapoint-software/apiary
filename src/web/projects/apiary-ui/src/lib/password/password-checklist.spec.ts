import { TestBed } from '@angular/core/testing';
import { currentLanguage } from '../i18n/language';
import { PasswordChecklist } from './password-checklist';

async function render(password: string, email = ''): Promise<HTMLElement> {
  const fixture = TestBed.createComponent(PasswordChecklist);
  fixture.componentRef.setInput('password', password);
  fixture.componentRef.setInput('email', email);
  await fixture.whenStable();
  return fixture.nativeElement;
}

function items(checklist: HTMLElement): string[] {
  return [...checklist.querySelectorAll('li')].map((item) => item.textContent?.trim() ?? '');
}

describe('PasswordChecklist', () => {
  afterEach(() => currentLanguage.set('en'));

  it('labels the list as the password rules', async () => {
    expect((await render('')).querySelector('ul')?.getAttribute('aria-label')).toBe(
      'Password rules',
    );
  });

  it('says every rule is not yet met for an empty password', async () => {
    expect(items(await render(''))).toEqual([
      'At least 15 characters, not yet',
      'Not a common password or repeated characters, not yet',
      'Doesn’t contain your email name, not yet',
    ]);
  });

  it('says which rules a password meets', async () => {
    expect(items(await render('maria.silva is here', 'maria.silva@example.com'))).toEqual([
      'At least 15 characters, done',
      'Not a common password or repeated characters, done',
      'Doesn’t contain your email name, not yet',
    ]);
  });

  it('marks the rules that are met', async () => {
    const checklist = await render('short words');

    expect(
      [...checklist.querySelectorAll('li')].map((item) => item.hasAttribute('data-met')),
    ).toEqual([false, true, true]);
  });

  it('shows the rules in Portuguese', async () => {
    currentLanguage.set('pt-PT');

    expect(items(await render('correct horse battery staple'))).toEqual([
      'Pelo menos 15 caracteres, feito',
      'Não é uma palavra-passe comum nem caracteres repetidos, feito',
      'Não contém o nome do seu email, feito',
    ]);
  });
});
