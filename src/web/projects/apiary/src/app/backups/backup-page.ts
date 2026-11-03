import { httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Banner, Button, Confirmer, ErrorMessages, Icon, PageHead, Toaster, isApiProblem } from '@datapoint/apiary-ui';
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
  imports: [PageHead, Banner, Button, Icon, WriteLock],
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
        this.toaster.show('The backup was taken, but its file was lost while the leader changed. Back up again.', { tone: 'error' });
        return;
      }
      download(file);
      this.status.reload();
      this.toaster.show(`${file.name} is downloading. Store it with the root key, apart from the cluster.`, { heading: 'Backup taken' });
    } catch (error) {
      this.toaster.show(this.messages.describe(isApiProblem(error) ? error.code : 'network.offline'), { tone: 'error', heading: 'Couldn’t back up' });
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
      heading: `Restore ${file.name}?`,
      text: 'Every replica goes back to the routes, certificates and users in this backup. Changes made since it was taken are lost, and everyone is signed out, you included. Traffic keeps flowing.',
      confirm: 'Restore backup',
      busy: 'Restoring…',
      tone: 'danger',
      typeToConfirm: 'restore',
      action: async () => {
        restored = await restoreBackup(this.api, 'backups.restore', content);
      },
    });
    if (done && restored) {
      this.auth.user.set(null);
      this.toaster.show(
        `Back to ${utcDateTime(restored.takenAt)} UTC: ${restored.routes} routes, ${restored.certificates} certificates, ${restored.users} users. Sign in again.`,
        { heading: 'Backup restored' },
      );
      await this.router.navigate(['/sign-in']);
    }
  }
}
