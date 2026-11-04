import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { ApplicationConfig, inject, provideAppInitializer, provideBrowserGlobalErrorListeners } from '@angular/core';
import { TitleStrategy, provideRouter, withComponentInputBinding, withInMemoryScrolling } from '@angular/router';
import { provideErrorMessages } from '@datapoint/apiary-ui';
import { routes } from './app.routes';
import { unauthorized } from './auth/unauthorized';
import { backgroundRequests } from './auth/user-activity';
import { appMessages } from './errors/app-messages';
import { LanguageChoice } from './auth/language-choice';
import { TranslatedTitles } from './shell/translated-titles';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding(), withInMemoryScrolling({ scrollPositionRestoration: 'top' })),
    provideHttpClient(withFetch(), withInterceptors([backgroundRequests, unauthorized])),
    provideErrorMessages(appMessages),
    { provide: TitleStrategy, useClass: TranslatedTitles },
    provideAppInitializer(() => inject(LanguageChoice).start()),
  ],
};
