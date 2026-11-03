import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, effect, inject, signal } from '@angular/core';
import { FieldTree, FormField, form, required, validate } from '@angular/forms/signals';
import { ApiProblem, Banner, Button, ErrorMessages, ErrorSummary, Field, Form, Icon, Status, Toaster, isApiProblem, problemErrors } from '@datapoint/apiary-ui';
import { FileUp } from 'lucide';
import { Api } from '../api/api';
import { CertificatePreview, ProjectView } from '../api/models';
import { utcDateTime } from '../api/time-ago';
import { FileDrop } from './file-drop';

interface UploadModel {
  projectId: string;
  chainPem: string;
  keyPem: string;
}

export interface UploadTarget {
  readonly id?: string;
  readonly name: string;
  readonly projectId?: string;
  readonly admin?: boolean;
}

const maximumFileSize = 65_536;

@Component({
  selector: 'ap-upload-dialog',
  imports: [Form, Field, FormField, ErrorSummary, Button, Icon, Status, Banner, FileDrop],
  templateUrl: './upload-dialog.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UploadDialog {
  protected readonly replacing = inject<UploadTarget | null>(DIALOG_DATA);
  protected readonly dialog = inject<DialogRef<string>>(DialogRef);
  private readonly api = inject(Api);
  private readonly toaster = inject(Toaster);
  private readonly messages = inject(ErrorMessages);
  protected readonly projects = httpResource<ProjectView[]>(() => this.api.query('projects.list'), { defaultValue: [] });
  private readonly model = signal<UploadModel>({ projectId: this.replacing?.projectId ?? '', chainPem: '', keyPem: '' });
  protected readonly upload = form(this.model, (p) => {
    required(p.projectId, { error: { kind: 'project.notFound' }, when: () => !this.replacing?.admin });
    required(p.chainPem, { error: { kind: 'certificate.chainRequired' } });
    required(p.keyPem, { error: { kind: 'certificate.keyRequired' } });
    validate(p.chainPem, ({ value }) => (!value() || value().includes('-----BEGIN CERTIFICATE-----') ? undefined : { kind: 'certificate.pemInvalid' }));
    validate(p.keyPem, ({ value }) => {
      const key = value();
      if (!key) {
        return undefined;
      }
      if (key.includes('ENCRYPTED')) {
        return { kind: 'certificate.keyEncrypted' };
      }
      return /-----BEGIN (RSA |EC )?PRIVATE KEY-----/.test(key) ? undefined : { kind: 'certificate.keyInvalid' };
    });
  });
  protected readonly preview = signal<CertificatePreview | null>(null);
  protected readonly adding = signal(false);
  protected readonly failure = signal('');
  protected readonly fileIcon = FileUp;
  protected readonly utcDateTime = utcDateTime;

  constructor() {
    effect(() => {
      const projects = this.projects.value();
      if (!this.replacing?.admin && !this.model().projectId && projects.length > 0) {
        this.model.update((m) => ({ ...m, projectId: projects[0].id }));
      }
    });
  }

  protected async check(apForm: Form): Promise<void> {
    await apForm.submit(async () => {
      try {
        const { chainPem, keyPem } = this.model();
        this.preview.set(await this.api.read<CertificatePreview>('certificates.check', { chainPem, keyPem, replacingId: this.replacing?.id }));
        return undefined;
      } catch (problem) {
        return problemErrors(problem as ApiProblem, this.upload);
      }
    });
  }

  protected async add(): Promise<void> {
    this.adding.set(true);
    this.failure.set('');
    try {
      const { chainPem, keyPem } = this.model();
      const id = this.replacing?.admin
        ? (await this.api.send('admin-certificate.upload', { chainPem, keyPem }), 'admin')
        : await this.api.send<string>('certificates.upload', { ...this.model(), replacingId: this.replacing?.id });
      const preview = this.preview();
      this.toaster.show(`It covers ${preview?.hosts.join(', ')} until ${preview?.notAfter.slice(0, 10)}.`, {
        heading: this.replacing ? 'Certificate replaced' : 'Certificate added',
      });
      this.dialog.close(id);
    } catch (problem) {
      this.failure.set(this.messages.describe(isApiProblem(problem) ? problem.code : 'network.offline'));
    } finally {
      this.adding.set(false);
    }
  }

  protected back(): void {
    this.failure.set('');
    this.preview.set(null);
  }

  protected async load(event: Event, field: FieldTree<string>): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (file) {
      await this.read(file, field);
    }
  }

  protected async read(file: File, field: FieldTree<string>): Promise<void> {
    const text = await file.slice(0, maximumFileSize).text();
    field().value.set(text);
    field().markAsTouched();
  }
}
