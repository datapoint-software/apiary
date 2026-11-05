import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { FormField, form } from '@angular/forms/signals';
import { Field, I18n, Status, TranslatePipe } from '@datapoint/apiary-ui';
import { ForwardedHeaders, ForwardedRequest, maximumForwardedAddresses, resolveRequest } from './forwarded-request';

@Component({
  selector: 'ap-try-request',
  imports: [Field, FormField, Status, TranslatePipe],
  templateUrl: './try-request.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TryRequest {
  readonly ranges = input.required<readonly string[]>();
  private readonly i18n = inject(I18n);
  private readonly model = signal<ForwardedHeaders>({
    connection: '173.245.48.10',
    forwardedFor: '198.51.100.23, 10.20.30.4',
    forwardedProto: 'https',
  });
  protected readonly headers = form(this.model);
  protected readonly result = computed(() => resolveRequest(this.model(), this.ranges()));
  protected readonly isIgnored = computed(() => {
    const reason = this.result()?.reason;
    return reason === 'tooManyAddresses' || reason === 'notAnAddress';
  });
  protected readonly why = computed(() => {
    const result = this.result();
    return result ? this.explain(result) : '';
  });
  protected readonly hint = computed(() =>
    this.model().connection.trim()
      ? this.i18n.t('Enter an IPv4 or IPv6 address, such as 173.245.48.10.')
      : this.i18n.t('Enter the address the connection comes from.'),
  );

  private explain(result: ForwardedRequest): string {
    switch (result.reason) {
      case 'untrusted':
        return this.i18n.t('The connection isn’t from a trusted proxy, so its own address is the client’s.');
      case 'untrustedWithHeaders':
        return this.i18n.t('The connection isn’t from a trusted proxy, so Apiary ignores the headers it received and sends new ones.');
      case 'tooManyAddresses':
        return this.i18n.t('X-Forwarded-For has more than {count} addresses, so Apiary ignores the headers and uses the proxy’s own address.', {
          count: maximumForwardedAddresses,
        });
      case 'notAnAddress':
        return this.i18n.t('X-Forwarded-For has something that isn’t an address, so Apiary ignores the headers and uses the proxy’s own address.');
      case 'noForwardedFor':
        return this.withProtoNote(result, this.i18n.t('The proxy sent no X-Forwarded-For, so Apiary uses the proxy’s own address.'));
      case 'trustedChain':
        return this.withProtoNote(result, this.trustedChain(result.skipped));
    }
  }

  private trustedChain(skipped: number): string {
    if (skipped === 0) {
      return this.i18n.t(
        'The connection is from a trusted proxy. Reading X-Forwarded-For from the right, Apiary takes the first address it doesn’t trust.',
      );
    }
    return this.i18n.plural(
      skipped,
      'The connection is from a trusted proxy. Reading X-Forwarded-For from the right, Apiary skips {count} more trusted address and takes the first address it doesn’t trust.',
      'The connection is from a trusted proxy. Reading X-Forwarded-For from the right, Apiary skips {count} more trusted addresses and takes the first address it doesn’t trust.',
    );
  }

  private withProtoNote(result: ForwardedRequest, text: string): string {
    return result.ignoredProto ? `${text} ${this.i18n.t('X-Forwarded-Proto isn’t http or https, so it counts as http.')}` : text;
  }
}
