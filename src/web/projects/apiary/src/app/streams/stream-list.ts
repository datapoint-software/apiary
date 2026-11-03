import { Dialog } from '@angular/cdk/dialog';
import { httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ApiProblem, Banner, Button, Confirmer, EmptyState, ErrorMessages, Icon, PageHead, Status, Toaster } from '@datapoint/apiary-ui';
import { Pencil, Play, Plus, Power, Trash2 } from 'lucide';
import { Api } from '../api/api';
import { reloadEvery } from '../api/reload-every';
import { ProjectView, StreamRouteView } from '../api/models';
import { Auth } from '../auth/auth';
import { WriteLock } from '../cluster/write-lock';
import { openDialog } from '../shell/open-dialog';
import { streamActivity } from './stream-activity';
import { SavedStream, StreamDialog } from './stream-dialog';

@Component({
  selector: 'ap-stream-list',
  imports: [WriteLock, PageHead, Banner, EmptyState, Icon, Button, Status],
  templateUrl: './stream-list.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StreamList {
  private readonly api = inject(Api);
  private readonly dialog = inject(Dialog);
  private readonly confirmer = inject(Confirmer);
  private readonly toaster = inject(Toaster);
  private readonly messages = inject(ErrorMessages);
  protected readonly auth = inject(Auth);
  protected readonly activity = streamActivity;
  protected readonly icons = { add: Plus, edit: Pencil, delete: Trash2, disable: Power, enable: Play };
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

  protected async disable(stream: StreamRouteView): Promise<void> {
    const disabled = await this.confirmer.confirm({
      heading: `Disable ${stream.name}?`,
      text: `Every replica stops listening on port ${stream.listenPort}/${stream.protocol.toUpperCase()} and closes open connections until you enable it again. Its settings are kept.`,
      confirm: 'Disable stream route',
      busy: 'Disabling…',
      action: () => this.api.send('streams.disable', { id: stream.id }),
    });
    if (disabled) {
      this.toaster.show(`${stream.name} disabled.`, { action: { label: 'Undo', run: () => void this.enable(stream) } });
    }
  }

  protected async enable(stream: StreamRouteView): Promise<void> {
    try {
      await this.api.send('streams.enable', { id: stream.id });
      this.toaster.show(`${stream.name} enabled. Traffic flows again.`);
    } catch (problem) {
      this.toaster.show(this.messages.describe((problem as ApiProblem).code), { tone: 'error' });
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
