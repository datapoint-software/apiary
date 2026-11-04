import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormField, form, required, validate } from '@angular/forms/signals';
import { ApiProblem, Button, ErrorMessages, ErrorSummary, Field, Form, Icon, problemErrors } from '@datapoint/apiary-ui';
import { CircleAlert, ImageUp } from 'lucide';
import { Api } from '../api/api';
import { BrandView, ProjectView } from '../api/models';
import { FileDrop } from '../certificates/file-drop';
import { DatapointLogo } from '../shell/datapoint-logo';
import { isAccent, textOn } from './accent';

export interface BrandDialogData {
  readonly projectId: string | null;
  readonly heading: string;
  readonly brand?: BrandView;
  readonly choices: readonly ProjectView[];
}

interface BrandModel {
  projectId: string;
  name: string;
  accent: string;
  contact: string;
}

const maximumLogo = 100 * 1024;
const logoTypes = ['image/png', 'image/webp', 'image/svg+xml'];
const fallbackAccent = '#1C1C1E';

@Component({
  selector: 'ap-brand-dialog',
  imports: [Form, Field, FormField, ErrorSummary, Button, Icon, FileDrop, DatapointLogo],
  templateUrl: './brand-dialog.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BrandDialog {
  protected readonly data = inject<BrandDialogData>(DIALOG_DATA);
  protected readonly dialog = inject<DialogRef<string>>(DialogRef);
  private readonly api = inject(Api);
  private readonly messages = inject(ErrorMessages);
  protected readonly icons = { upload: ImageUp, alert: CircleAlert };
  protected readonly adding = this.data.choices.length > 0;
  protected readonly logo = signal(this.data.brand?.logo ?? '');
  protected readonly logoName = signal(this.data.brand?.logoName ?? '');
  protected readonly logoError = signal('');
  private readonly model = signal<BrandModel>({
    projectId: '',
    name: this.data.brand?.name ?? '',
    accent: this.data.brand?.accent ?? '#1D4ED8',
    contact: this.data.brand?.contact ?? '',
  });
  protected readonly brand = form(this.model, (b) => {
    required(b.projectId, { error: { kind: 'project.notFound' }, when: () => this.adding });
    validate(b.name, ({ value }) => {
      const name = value().trim();
      if (!name) {
        return { kind: 'required' };
      }
      return name.length > 60 ? { kind: 'tooLong', params: { max: 60 } } : undefined;
    });
    validate(b.accent, ({ value }) => (isAccent(value()) ? undefined : { kind: 'brand.accentInvalid' }));
    validate(b.contact, ({ value }) => (value().trim().length > 120 ? { kind: 'tooLong', params: { max: 120 } } : undefined));
  });
  protected readonly previewName = computed(() => this.model().name.trim() || 'Your name');
  protected readonly previewContact = computed(() => this.model().contact.trim());
  protected readonly previewAccent = computed(() => (isAccent(this.model().accent) ? this.model().accent.trim() : fallbackAccent));
  protected readonly previewText = computed(() => textOn(this.previewAccent()));
  protected readonly pickerValue = computed(() => this.previewAccent().toLowerCase());

  protected pick(event: Event): void {
    const value = (event.target as HTMLInputElement).value.toUpperCase();
    this.brand.accent().value.set(value);
    this.brand.accent().markAsDirty();
  }

  protected load(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (file) {
      this.read(file);
    }
  }

  protected read(file: File): void {
    if (!logoTypes.includes(file.type)) {
      this.logoError.set(this.messages.describe('brand.logoType'));
      return;
    }
    if (file.size > maximumLogo) {
      this.logoError.set(this.messages.describe('brand.logoTooLarge'));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      this.logoError.set('');
      this.logo.set(String(reader.result));
      this.logoName.set(file.name);
    };
    reader.readAsDataURL(file);
  }

  protected removeLogo(): void {
    this.logo.set('');
    this.logoName.set('');
  }

  protected async save(apForm: Form): Promise<void> {
    const value = this.model();
    const projectId = this.adding ? value.projectId : this.data.projectId;
    const saved = await apForm.submit(async () => {
      try {
        await this.api.send('brands.save', {
          projectId,
          name: value.name.trim(),
          accent: value.accent.trim().toUpperCase(),
          contact: value.contact.trim() || null,
          logo: this.logo() || null,
          logoName: this.logoName() || null,
        });
        return undefined;
      } catch (problem) {
        const apiProblem = problem as ApiProblem;
        const logoProblem = apiProblem.errors?.find((e) => e.field === 'logo');
        if (logoProblem) {
          this.logoError.set(this.messages.describe(logoProblem.code));
        }
        return problemErrors(apiProblem, this.brand);
      }
    });
    if (saved) {
      const project = this.data.choices.find((p) => p.id === projectId);
      this.dialog.close(project ? `${project.name} has its own brand now.` : 'Visitor pages use it now.');
    }
  }
}
