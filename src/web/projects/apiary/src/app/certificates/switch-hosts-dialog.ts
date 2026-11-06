import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { form, validate } from '@angular/forms/signals';
import { ApiProblem, Button, ErrorSummary, Form, TranslatePipe, problemErrors } from '@datapoint/apiary-ui';
import { Api } from '../api/api';
import { CertificateSummary } from '../api/models';
import { CoveredHost } from './covered-hosts';
import { HostChoices } from './host-choices';

export interface SwitchHostsData {
  readonly certificate: CertificateSummary;
  readonly hosts: readonly CoveredHost[];
}

export interface SwitchModel {
  chosen: boolean[];
}

@Component({
  selector: 'ap-switch-hosts-dialog',
  imports: [Form, ErrorSummary, Button, HostChoices, TranslatePipe],
  templateUrl: './switch-hosts-dialog.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SwitchHostsDialog {
  protected readonly dialog = inject<DialogRef<number>>(DialogRef);
  protected readonly data = inject<SwitchHostsData>(DIALOG_DATA);
  private readonly api = inject(Api);
  private readonly model = signal<SwitchModel>({ chosen: this.data.hosts.map(() => false) });
  protected readonly choices = form(this.model, (s) => {
    validate(s.chosen, ({ value }) => (value().some(Boolean) ? undefined : { kind: 'certificate.chooseHost' }));
  });

  protected async save(apForm: Form): Promise<void> {
    const chosen = this.model().chosen;
    const hosts = this.data.hosts.map((h) => h.host).filter((host, index) => chosen[index]);
    const saved = await apForm.submit(async () => {
      try {
        await this.api.send('certificates.use', { certificateId: this.data.certificate.id, hosts });
        return undefined;
      } catch (problem) {
        return problemErrors(problem as ApiProblem, this.choices);
      }
    });
    if (saved) {
      this.dialog.close(hosts.length);
    }
  }
}
