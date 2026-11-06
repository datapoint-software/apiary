import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormField, form, required } from '@angular/forms/signals';
import { ApiProblem, Button, ErrorSummary, Form, I18n, TranslatePipe, problemErrors } from '@datapoint/apiary-ui';
import { Api } from '../api/api';
import { CertificateSummary, DnsProviderView } from '../api/models';
import { bareName, challengeName, httpChallenge, providersFor } from '../dns-providers/dns-names';
import { isRenewedWildcard } from './certificate-status';

export interface ChallengeDialogData {
  readonly certificate: CertificateSummary;
  readonly providers: readonly DnsProviderView[];
  readonly canAdminister: boolean;
}

interface ChallengeModel {
  dnsProviderId: string;
}

interface ProviderChoice {
  readonly provider: DnsProviderView;
  readonly record: string;
  readonly target: string;
}

@Component({
  selector: 'ap-challenge-dialog',
  imports: [Form, FormField, ErrorSummary, Button, TranslatePipe],
  templateUrl: './challenge-dialog.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChallengeDialog {
  protected readonly dialog = inject<DialogRef<string>>(DialogRef);
  private readonly data = inject<ChallengeDialogData>(DIALOG_DATA);
  private readonly api = inject(Api);
  private readonly i18n = inject(I18n);
  protected readonly certificate = this.data.certificate;
  protected readonly httpChallenge = httpChallenge;
  protected readonly offersHttp = !isRenewedWildcard(this.certificate);
  protected readonly choices: readonly ProviderChoice[] = providersFor(this.data.providers, this.certificate.hosts).map((provider) => ({
    provider,
    record: challengeName(this.certificate.hosts[0]),
    target: `${bareName(this.certificate.hosts[0])}.${provider.challengeZone}`,
  }));
  private readonly model = signal<ChallengeModel>({ dnsProviderId: this.certificate.dnsProviderId ?? (this.offersHttp ? httpChallenge : '') });
  protected readonly challenge = form(this.model, (c) => {
    required(c.dnsProviderId, { error: { kind: 'certificate.chooseChallenge' } });
  });
  protected readonly noProvider = computed(() =>
    this.data.canAdminister ? this.i18n.t('Add one on the DNS providers page first.') : this.i18n.t('Ask an Administrator to add one.'),
  );

  protected async save(apForm: Form): Promise<void> {
    const chosen = this.model().dnsProviderId;
    const saved = await apForm.submit(async () => {
      try {
        await this.api.send('certificates.set-challenge', { name: this.certificate.name, dnsProviderId: chosen === httpChallenge ? null : chosen });
        return undefined;
      } catch (problem) {
        return problemErrors(problem as ApiProblem, this.challenge);
      }
    });
    if (saved) {
      this.dialog.close(chosen);
    }
  }
}
