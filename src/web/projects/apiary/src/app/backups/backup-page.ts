import { httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Banner, Button, Confirmer, ErrorMessages, I18n, Icon, PageHead, Toaster, TranslatePipe, isApiProblem } from '@datapoint/apiary-ui';
import { Archive, FileUp } from 'lucide';
import { Api } from '../api/api';
import { BackupFile, BackupStatus, RestoredBackup } from '../api/models';
import { timeAgo, utcDateTime } from '../api/time-ago';
import { Auth } from '../auth/auth';
import { WriteLock } from '../cluster/write-lock';
import { download, maximumBackupSize, restoreBackup } from './backup-files';

const week = 7 * 24 * 3_600_000;

@Component({
  selector: 'ap-backup-page',
  imports: [PageHead, Banner, Button, Icon, WriteLock, TranslatePipe],
  templateUrl: './backup-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BackupPage {
  private readonly api = inject(Api);
  private readonly toaster = inject(Toaster);
  private readonly confirmer = inject(Confirmer);
  private readonly messages = inject(ErrorMessages);
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);
  private readonly i18n = inject(I18n);
  protected readonly status = httpResource<BackupStatus>(() => this.api.query('backups.status'));
  protected readonly stale = computed(() => {
    const last = this.status.value()?.lastAt;
    return this.status.hasValue() && (!last || Date.now() - Date.parse(last) > week);
  });
  protected readonly exporting = signal(false);
  protected readonly icons = { archive: Archive, file: FileUp };
  protected readonly timeAgo = timeAgo;
  protected readonly utcDateTime = utcDateTime;

  protected async backUp(): Promise<void> {
    this.exporting.set(true);
    try {
      const file = await this.api.send<BackupFile | null>('backups.export');
      if (!file) {
        this.toaster.show(this.i18n.t('The backup was taken, but its file was lost while the leader changed. Back up again.'), { tone: 'error' });
        return;
      }
      download(file);
      this.status.reload();
      this.toaster.show(this.i18n.t('{name} is downloading. Store it with the root key, apart from the cluster.', { name: file.name }), {
        heading: this.i18n.t('Backup taken'),
      });
    } catch (error) {
      this.toaster.show(this.messages.describe(isApiProblem(error) ? error.code : 'network.offline'), { tone: 'error', heading: this.i18n.t('Couldn’t back up') });
    } finally {
      this.exporting.set(false);
    }
  }

  protected async restore(input: HTMLInputElement): Promise<void> {
    const file = input.files?.[0];
    input.value = '';
    if (!file) {
      return;
    }
    if (file.size > maximumBackupSize) {
      this.toaster.show(this.messages.describe('backup.unreadable'), { tone: 'error' });
      return;
    }
    const content = await file.text();
    let restored: RestoredBackup | undefined;
    const done = await this.confirmer.confirm({
      heading: this.i18n.t('Restore {name}?', { name: file.name }),
      text: this.i18n.t(
        'Every replica goes back to the routes, certificates and users in this backup. Changes made since it was taken are lost, and everyone is signed out, you included. Traffic keeps flowing.',
      ),
      confirm: this.i18n.t('Restore backup'),
      busy: this.i18n.t('Restoring…'),
      tone: 'danger',
      typeToConfirm: this.i18n.t('restore'),
      action: async () => {
        restored = await restoreBackup(this.api, 'backups.restore', content);
      },
    });
    if (done && restored) {
      this.auth.user.set(null);
      this.toaster.show(this.i18n.t('Back to {time} UTC: {contents}. Sign in again.', { time: utcDateTime(restored.takenAt), contents: this.contents(restored) }), {
        heading: this.i18n.t('Backup restored'),
      });
      await this.router.navigate(['/sign-in']);
    }
  }

  private contents(restored: RestoredBackup): string {
    return new Intl.ListFormat(this.i18n.language(), { type: 'unit', style: 'long' }).format([
      this.i18n.plural(restored.routes, '{count} route', '{count} routes'),
      this.i18n.plural(restored.certificates, '{count} certificate', '{count} certificates'),
      this.i18n.plural(restored.users, '{count} user', '{count} users'),
    ]);
  }
}
