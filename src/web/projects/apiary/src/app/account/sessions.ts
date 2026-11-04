import { httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Button, Confirmer, ErrorMessages, I18n, Icon, PageHead, Toaster, TranslatePipe } from '@datapoint/apiary-ui';
import { Monitor, Smartphone } from 'lucide';
import { Api } from '../api/api';
import { SessionView } from '../api/models';
import { utcDateTime } from '../api/time-ago';
import { AccountTabs } from './account-tabs';
import { WriteLock } from '../cluster/write-lock';

@Component({
  selector: 'ap-sessions',
  imports: [WriteLock, PageHead, AccountTabs, Button, Icon, TranslatePipe],
  templateUrl: './sessions.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Sessions {
  private readonly api = inject(Api);
  private readonly confirmer = inject(Confirmer);
  private readonly toaster = inject(Toaster);
  private readonly messages = inject(ErrorMessages);
  private readonly i18n = inject(I18n);
  protected readonly crumbs = computed(() => [{ label: this.i18n.t('Your account'), link: '/account' }]);
  protected readonly sessions = httpResource<SessionView[]>(() => this.api.query('account.sessions'), { defaultValue: [] });
  protected readonly others = computed(() => this.sessions.value().filter((s) => !s.current).length);
  protected readonly utcDateTime = utcDateTime;

  protected icon(session: SessionView) {
    return /iPhone|Android|iPad/.test(session.device ?? '') ? Smartphone : Monitor;
  }

  protected async end(session: SessionView): Promise<void> {
    try {
      await this.api.send('account.end-session', { id: session.id });
      this.toaster.show(session.device ? this.i18n.t('{device} is signed out.', { device: session.device }) : this.i18n.t('That session is signed out.'));
    } catch (problem) {
      this.toaster.show(this.messages.describe((problem as { code?: string }).code ?? 'internal'), { tone: 'error' });
    }
  }

  protected async endOthers(): Promise<void> {
    const count = this.others();
    const done = await this.confirmer.confirm({
      heading: this.i18n.t('Sign out of all other sessions?'),
      text: this.i18n.plural(count, '{count} other session ends at once. You stay signed in here.', '{count} other sessions end at once. You stay signed in here.'),
      confirm: this.i18n.t('Sign out others'),
      busy: this.i18n.t('Signing out…'),
      tone: 'primary',
      action: () => this.api.send('account.end-other-sessions'),
    });
    if (done) {
      this.toaster.show(this.i18n.t('Only this browser is signed in now.'));
    }
  }
}
