import { Service, inject } from '@angular/core';
import { I18n, Language, browserLanguage, supportedLanguage } from '@datapoint/apiary-ui';
import { Api } from '../api/api';

const key = 'apiary.language';

function readStored(): Language | undefined {
  try {
    return supportedLanguage(localStorage.getItem(key));
  } catch {
    return undefined;
  }
}

function store(language: Language): void {
  try {
    localStorage.setItem(key, language);
  } catch {
    return;
  }
}

@Service()
export class LanguageChoice {
  private readonly i18n = inject(I18n);
  private readonly api = inject(Api);

  start(): void {
    this.i18n.use(readStored() ?? browserLanguage());
  }

  follow(saved: string | undefined): void {
    const language = supportedLanguage(saved);
    if (language) {
      this.i18n.use(language);
      store(language);
    }
  }

  async choose(language: Language, signedIn: boolean): Promise<void> {
    this.i18n.use(language);
    store(language);
    if (signedIn) {
      await this.api.send('account.set-language', { language });
    }
  }
}
