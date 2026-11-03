import { Dialog } from '@angular/cdk/dialog';
import { httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Banner, Button, Confirmer, EmptyState, Icon, PageHead, Toaster } from '@datapoint/apiary-ui';
import { Pencil, Plus, Trash2 } from 'lucide';
import { Api } from '../api/api';
import { reloadEvery } from '../api/reload-every';
import { ProjectView, StreamRouteView } from '../api/models';
import { Auth } from '../auth/auth';
import { WriteLock } from '../cluster/write-lock';
import { openDialog } from '../shell/open-dialog';
import { SavedStream, StreamDialog } from './stream-dialog';

@Component({
  selector: 'ap-stream-list',
  imports: [WriteLock, PageHead, Banner, EmptyState, Icon, Button],
  templateUrl: './stream-list.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StreamList {
  private readonly api = inject(Api);
  private readonly dialog = inject(Dialog);
  private readonly confirmer = inject(Confirmer);
  private readonly toaster = inject(Toaster);
  protected readonly auth = inject(Auth);
  protected readonly icons = { add: Plus, edit: Pencil, delete: Trash2 };
  protected readonly streams = httpResource<StreamRouteView[]>(() => this.api.query('streams.list'), { defaultValue: [] });
  private readonly refresh = reloadEvery(this.streams);
  private readonly projects = httpResource<ProjectView[]>(() => this.api.query('projects.list'), { defaultValue: [] });
  protected readonly isLoading = computed(() => this.streams.isLoading() && this.streams.value().length === 0);
  protected readonly projectNames = computed(() => new Map(this.projects.value().map((p) => [p.id, p.name])));

  protected async edit(stream: StreamRouteView | null): Promise<void> {
    const saved = await openDialog<SavedStream, StreamRouteView | null>(this.dialog, StreamDialog, stream);
    if (saved) {
      this.streams.reload();
      this.toaster.show(saved.added ? `${saved.name} is ready on every replica.` : `${saved.name} saved.`);
    }
  }

  protected async delete(stream: StreamRouteView): Promise<void> {
    const deleted = await this.confirmer.confirm({
      heading: `Delete ${stream.name}?`,
      text: `Connections to port ${stream.listenPort}/${stream.protocol.toUpperCase()} are refused at once, and open ones are closed. Remove the port from your stack file afterwards.`,
      confirm: 'Delete stream route',
      busy: 'Deleting…',
      action: () => this.api.send('streams.delete', { id: stream.id }),
    });
    if (deleted) {
      this.toaster.show(`${stream.name} was deleted.`);
    }
  }
}
