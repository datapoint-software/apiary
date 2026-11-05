import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { FormField, applyWhen, disabled, form, hidden, required, validate } from '@angular/forms/signals';
import { ApiProblem, Button, ErrorSummary, Field, Form, TranslatePipe, ipRanges, port, problemErrors, target, wholeNumber } from '@datapoint/apiary-ui';
import { Api } from '../api/api';
import { serverCheck } from '../api/server-check';
import { ProjectView, StreamProtocol, StreamRouteView } from '../api/models';
import { CopyText } from '../auth/copy-text';
import { StackBanner } from '../stacks/stack-banner';

export interface SavedStream {
  readonly name: string;
  readonly added: boolean;
}

interface StreamModel {
  projectId: string;
  name: string;
  protocol: StreamProtocol;
  listenPort: number | null;
  targetHost: string;
  targetPort: number | null;
  serverNames: string;
  idleTimeoutSeconds: number | null;
  allowedAddresses: string;
}

const serverNamePattern = /^(\*\.)?([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/;

function lines(text: string): string[] {
  return text.split('\n').map((line) => line.trim().toLowerCase()).filter(Boolean);
}

const emptyStream: StreamModel = {
  projectId: '',
  name: '',
  protocol: 'tcp',
  listenPort: null,
  targetHost: '',
  targetPort: null,
  serverNames: '',
  idleTimeoutSeconds: 60,
  allowedAddresses: '',
};

function streamModel(stream: StreamRouteView | null): StreamModel {
  if (!stream) {
    return emptyStream;
  }
  const { projectId, name, protocol, listenPort, targetHost, targetPort, idleTimeoutSeconds } = stream;
  return {
    projectId,
    name,
    protocol,
    listenPort,
    targetHost,
    targetPort,
    idleTimeoutSeconds,
    serverNames: stream.serverNames.join('\n'),
    allowedAddresses: stream.allowedAddresses.join('\n'),
  };
}

@Component({
  selector: 'ap-stream-dialog',
  imports: [Form, Field, FormField, ErrorSummary, Button, StackBanner, CopyText, TranslatePipe],
  templateUrl: './stream-dialog.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StreamDialog {
  protected readonly dialog = inject<DialogRef<SavedStream>>(DialogRef);
  protected readonly existing = inject<StreamRouteView | null>(DIALOG_DATA);
  private readonly api = inject(Api);
  protected readonly projects = httpResource<ProjectView[]>(() => this.api.query('projects.list'), { defaultValue: [] });
  protected readonly model = signal<StreamModel>(streamModel(this.existing));
  protected readonly stack = this.existing?.stack;
  protected readonly projectFromStack = this.stack?.fields.includes('project') ?? false;
  protected readonly stream = form(this.model, (s) => {
    const fromStack = () => !!this.stack;
    disabled(s.name, fromStack);
    disabled(s.protocol, fromStack);
    disabled(s.listenPort, fromStack);
    disabled(s.targetHost, fromStack);
    disabled(s.targetPort, fromStack);
    disabled(s.projectId, () => this.projectFromStack);
    required(s.projectId, { error: { kind: 'project.notFound' } });
    required(s.name);
    validate(s.name, ({ value }) => (value().trim().length > 40 ? { kind: 'tooLong', params: { max: 40 } } : undefined));
    port(s.listenPort);
    serverCheck(s.listenPort, 'streams.check', ['listenPort'], ({ value, valueOf }) => ({
      protocol: valueOf(s.protocol),
      listenPort: value(),
      serverNames: valueOf(s.protocol) === 'tcp' ? lines(valueOf(s.serverNames)) : [],
      id: this.existing?.id ?? null,
    }));
    target(s.targetHost);
    port(s.targetPort);
    hidden(s.serverNames, ({ valueOf }) => valueOf(s.protocol) !== 'tcp');
    validate(s.serverNames, ({ value }) => (lines(value()).every((name) => serverNamePattern.test(name)) ? undefined : { kind: 'hostname.invalid' }));
    hidden(s.idleTimeoutSeconds, ({ valueOf }) => valueOf(s.protocol) !== 'udp');
    applyWhen(s.idleTimeoutSeconds, ({ valueOf }) => valueOf(s.protocol) === 'udp', (timeout) => wholeNumber(timeout, 1, 3600));
    ipRanges(s.allowedAddresses);
  });
  protected readonly published = signal<StreamModel | null>(null);
  protected readonly portLine = computed(() => {
    const value = this.published();
    return value ? `- { target: ${value.listenPort}, published: ${value.listenPort}, protocol: ${value.protocol}, mode: host }` : '';
  });

  constructor() {
    effect(() => {
      const projects = this.projects.value();
      if (!this.model().projectId && projects.length > 0) {
        this.model.update((m) => ({ ...m, projectId: projects[0].id }));
      }
    });
  }

  protected async save(apForm: Form): Promise<void> {
    const value = this.model();
    const saved = await apForm.submit(async () => {
      try {
        await this.persist(value);
        return undefined;
      } catch (problem) {
        return problemErrors(problem as ApiProblem, this.stream);
      }
    });
    if (!saved) {
      return;
    }
    const portChanged = this.existing?.listenPort !== value.listenPort || this.existing?.protocol !== value.protocol;
    if (portChanged) {
      this.published.set(value);
      return;
    }
    this.dialog.close({ name: value.name.trim(), added: false });
  }

  protected done(): void {
    this.dialog.close({ name: this.model().name.trim(), added: !this.existing });
  }

  private async persist(value: StreamModel): Promise<void> {
    const body = {
      projectId: value.projectId,
      name: value.name.trim(),
      protocol: value.protocol,
      listenPort: value.listenPort,
      targetHost: value.targetHost.trim(),
      targetPort: value.targetPort,
      serverNames: value.protocol === 'tcp' ? lines(value.serverNames) : [],
      idleTimeoutSeconds: value.protocol === 'udp' ? value.idleTimeoutSeconds : 60,
      allowedAddresses: value.allowedAddresses.split('\n').map((line) => line.trim()).filter(Boolean),
    };
    await (this.existing ? this.api.send('streams.update', { id: this.existing.id, ...body }) : this.api.send<string>('streams.create', body));
  }
}
