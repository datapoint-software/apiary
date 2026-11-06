import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { FieldTree, FormField } from '@angular/forms/signals';
import { Field, FieldHelp, TranslatePipe } from '@datapoint/apiary-ui';
import { DnsProviderView } from '../api/models';
import { httpChallenge } from '../dns-providers/dns-names';

/** The "Checked with" select under an automatic certificate: a file on port 80, or a DNS record through a provider. */
@Component({
  selector: 'ap-challenge-field',
  imports: [Field, FieldHelp, FormField, TranslatePipe],
  templateUrl: './challenge-field.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChallengeField {
  readonly challenge = input.required<FieldTree<string>>();
  readonly providers = input.required<readonly DnsProviderView[]>();
  readonly help = input('');
  readonly shown = input(false);
  protected readonly httpChallenge = httpChallenge;
}
