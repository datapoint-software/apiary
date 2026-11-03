import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withComponentInputBinding, withInMemoryScrolling } from '@angular/router';
import { provideErrorMessages } from '@datapoint/apiary-ui';
import { routes } from './app.routes';
import { unauthorized } from './auth/unauthorized';
import { backgroundRequests } from './auth/user-activity';
import { appMessages } from './errors/app-messages';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding(), withInMemoryScrolling({ scrollPositionRestoration: 'top' })),
    provideHttpClient(withFetch(), withInterceptors([backgroundRequests, unauthorized])),
    provideErrorMessages(appMessages),
  ],
};
