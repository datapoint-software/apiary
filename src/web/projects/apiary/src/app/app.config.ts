import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { ApplicationConfig, inject, provideAppInitializer, provideBrowserGlobalErrorListeners } from '@angular/core';
import { TitleStrategy, provideRouter, withComponentInputBinding, withInMemoryScrolling } from '@angular/router';
import { provideErrorMessages, provideTranslations } from '@datapoint/apiary-ui';
import { routes } from './app.routes';
import { unauthorized } from './auth/unauthorized';
import { backgroundRequests } from './auth/user-activity';
import { appMessages } from './errors/app-messages';
import { appMessagesPortuguese } from './errors/app-messages.pt';
import { LanguageChoice } from './auth/language-choice';
import { TranslatedTitles } from './shell/translated-titles';
import { shellPortuguese } from './shell/shell.pt';
import { accountPortuguese } from './account/account.pt';
import { agentsPortuguese } from './agents/agents.pt';
import { auditPortuguese } from './audit/audit.pt';
import { authPortuguese } from './auth/auth.pt';
import { backupsPortuguese } from './backups/backups.pt';
import { certificatesPortuguese } from './certificates/certificates.pt';
import { dnsProvidersPortuguese } from './dns-providers/dns-providers.pt';
import { clusterPortuguese } from './cluster/cluster.pt';
import { keysPortuguese } from './keys/keys.pt';
import { overviewPortuguese } from './overview/overview.pt';
import { projectsPortuguese } from './projects/projects.pt';
import { proxiesPortuguese } from './proxies/proxies.pt';
import { redirectsPortuguese } from './redirects/redirects.pt';
import { routesPortuguese } from './routes/routes.pt';
import { ssoPortuguese } from './sso/sso.pt';
import { stacksPortuguese } from './stacks/stacks.pt';
import { streamsPortuguese } from './streams/streams.pt';
import { usersPortuguese } from './users/users.pt';
import { visitorPagesPortuguese } from './visitor-pages/visitor-pages.pt';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding(), withInMemoryScrolling({ scrollPositionRestoration: 'top' })),
    provideHttpClient(withFetch(), withInterceptors([backgroundRequests, unauthorized])),
    provideErrorMessages(appMessages),
    provideErrorMessages(appMessagesPortuguese, 'pt-PT'),
    provideTranslations('pt-PT', shellPortuguese),
    provideTranslations('pt-PT', accountPortuguese),
    provideTranslations('pt-PT', agentsPortuguese),
    provideTranslations('pt-PT', auditPortuguese),
    provideTranslations('pt-PT', authPortuguese),
    provideTranslations('pt-PT', backupsPortuguese),
    provideTranslations('pt-PT', certificatesPortuguese),
    provideTranslations('pt-PT', clusterPortuguese),
    provideTranslations('pt-PT', dnsProvidersPortuguese),
    provideTranslations('pt-PT', keysPortuguese),
    provideTranslations('pt-PT', overviewPortuguese),
    provideTranslations('pt-PT', projectsPortuguese),
    provideTranslations('pt-PT', proxiesPortuguese),
    provideTranslations('pt-PT', redirectsPortuguese),
    provideTranslations('pt-PT', routesPortuguese),
    provideTranslations('pt-PT', ssoPortuguese),
    provideTranslations('pt-PT', stacksPortuguese),
    provideTranslations('pt-PT', streamsPortuguese),
    provideTranslations('pt-PT', usersPortuguese),
    provideTranslations('pt-PT', visitorPagesPortuguese),
    { provide: TitleStrategy, useClass: TranslatedTitles },
    provideAppInitializer(() => inject(LanguageChoice).start()),
  ],
};
