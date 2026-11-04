import { Dialog } from '@angular/cdk/dialog';
import { httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ApiProblem, Banner, Button, Confirmer, EmptyState, ErrorMessages, I18n, Icon, PageHead, Status, Toaster, TranslatePipe } from '@datapoint/apiary-ui';
import { Pencil, Play, Plus, Power, Trash2 } from 'lucide';
import { Api } from '../api/api';
import { reloadEvery } from '../api/reload-every';
import { ProjectView, StreamRouteView } from '../api/models';
import { Auth } from '../auth/auth';
import { WriteLock } from '../cluster/write-lock';
import { openDialog } from '../shell/open-dialog';
import { StreamActivity, streamActivity } from './stream-activity';
import { SavedStream, StreamDialog } from './stream-dialog';

@Component({
  selector: 'ap-stream-list',
  imports: [WriteLock, PageHead, Banner, EmptyState, Icon, Button, Status, TranslatePipe],
  templateUrl: './stream-list.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StreamList {
  private readonly api = inject(Api);
  private readonly dialog = inject(Dialog);
  private readonly confirmer = inject(Confirmer);
  private readonly toaster = inject(Toaster);
  private readonly messages = inject(ErrorMessages);
  private readonly i18n = inject(I18n);
  protected readonly auth = inject(Auth);
  protected readonly icons = { add: Plus, edit: Pencil, delete: Trash2, disable: Power, enable: Play };
  protected readonly streams = httpResource<StreamRouteView[]>(() => this.api.query('streams.list'), { defaultValue: [] });
  private readonly refresh = reloadEvery(this.streams);
  private readonly projects = httpResource<ProjectView[]>(() => this.api.query('projects.list'), { defaultValue: [] });
  protected readonly isLoading = computed(() => this.streams.isLoading() && this.streams.value().length === 0);
  protected readonly projectNames = computed(() => new Map(this.projects.value().map((p) => [p.id, p.name])));

  protected activity(stream: StreamRouteView): StreamActivity {
    return streamActivity(stream, this.i18n);
  }

  protected async edit(stream: StreamRouteView | null): Promise<void> {
    const saved = await openDialog<SavedStream, StreamRouteView | null>(this.dialog, StreamDialog, stream);
    if (saved) {
      this.streams.reload();
      this.toaster.show(this.i18n.t(saved.added ? '{name} is ready on every replica.' : '{name} saved.', { name: saved.name }));
    }
  }

  protected async disable(stream: StreamRouteView): Promise<void> {
    const disabled = await this.confirmer.confirm({
      heading: this.i18n.t('Disable {name}?', { name: stream.name }),
      text: this.i18n.t('Every replica stops listening on port {port} and closes open connections until you enable it again. Its settings are kept.', { port: this.port(stream) }),
      confirm: this.i18n.t('Disable stream route'),
      busy: this.i18n.t('Disabling…'),
      action: () => this.api.send('streams.disable', { id: stream.id }),
    });
    if (disabled) {
      this.toaster.show(this.i18n.t('{name} disabled.', { name: stream.name }), { action: { label: this.i18n.t('Undo'), run: () => void this.enable(stream) } });
    }
  }

  protected async enable(stream: StreamRouteView): Promise<void> {
    try {
      await this.api.send('streams.enable', { id: stream.id });
      this.toaster.show(this.i18n.t('{name} enabled. Traffic flows again.', { name: stream.name }));
    } catch (problem) {
      this.toaster.show(this.messages.describe((problem as ApiProblem).code), { tone: 'error' });
    }
  }

  protected async delete(stream: StreamRouteView): Promise<void> {
    const deleted = await this.confirmer.confirm({
      heading: this.i18n.t('Delete {name}?', { name: stream.name }),
      text: this.i18n.t('Connections to port {port} are refused at once, and open ones are closed. Remove the port from your stack file afterwards.', { port: this.port(stream) }),
      confirm: this.i18n.t('Delete stream route'),
      busy: this.i18n.t('Deleting…'),
      action: () => this.api.send('streams.delete', { id: stream.id }),
    });
    if (deleted) {
      this.toaster.show(this.i18n.t('{name} was deleted.', { name: stream.name }));
    }
  }

  private port(stream: StreamRouteView): string {
    return `${stream.listenPort}/${stream.protocol.toUpperCase()}`;
  }
}
