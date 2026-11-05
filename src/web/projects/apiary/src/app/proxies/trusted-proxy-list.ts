import { Dialog } from '@angular/cdk/dialog';
import { httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Banner, Button, Confirmer, EmptyState, I18n, Icon, PageHead, Toaster, TranslatePipe } from '@datapoint/apiary-ui';
import { Plus } from 'lucide';
import { Api } from '../api/api';
import { TrustedProxyView } from '../api/models';
import { reloadEvery } from '../api/reload-every';
import { timeAgo } from '../api/time-ago';
import { Auth } from '../auth/auth';
import { WriteLock } from '../cluster/write-lock';
import { openDialog } from '../shell/open-dialog';
import { isQuiet } from './proxy-activity';
import { ProxyDialogData, SavedProxy, TrustedProxyDialog } from './trusted-proxy-dialog';
import { ProxyRow, TrustedProxyTable } from './trusted-proxy-table';
import { TryRequest } from './try-request';

const hour = 60 * 60_000;

@Component({
  selector: 'ap-trusted-proxy-list',
  imports: [WriteLock, PageHead, Banner, EmptyState, Icon, Button, TrustedProxyTable, TryRequest, TranslatePipe],
  templateUrl: './trusted-proxy-list.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TrustedProxyList {
  private readonly api = inject(Api);
  private readonly dialog = inject(Dialog);
  private readonly confirmer = inject(Confirmer);
  private readonly toaster = inject(Toaster);
  private readonly i18n = inject(I18n);
  protected readonly auth = inject(Auth);
  protected readonly addIcon = Plus;
  protected readonly proxies = httpResource<TrustedProxyView[]>(() => this.api.query('trusted-proxies.list'), { defaultValue: [] });
  private readonly refresh = reloadEvery(this.proxies);
  protected readonly isLoading = computed(() => this.proxies.isLoading() && this.proxies.value().length === 0);
  protected readonly ranges = computed(() => this.proxies.value().map((p) => p.range));
  protected readonly rows = computed<ProxyRow[]>(() => {
    const now = Date.now();
    return this.proxies.value().map((proxy) => ({
      proxy,
      lastRequest: proxy.lastRequestAt ? timeAgo(proxy.lastRequestAt, now) : '',
      isQuiet: isQuiet(proxy, now),
    }));
  });
  protected readonly quietRanges = computed(() => this.rows().filter((row) => row.isQuiet).map((row) => row.proxy.range));
  protected readonly quietHeading = computed(() =>
    this.i18n.plural(
      this.quietRanges().length,
      '{count} range hasn’t sent a request for a day',
      '{count} ranges haven’t sent a request for a day',
    ),
  );

  protected async edit(proxy: TrustedProxyView | null): Promise<void> {
    const data: ProxyDialogData = { proxy, proxies: this.proxies.value() };
    const saved = await openDialog<SavedProxy, ProxyDialogData>(this.dialog, TrustedProxyDialog, data);
    if (saved) {
      this.toaster.show(this.i18n.t('Requests from {range} now keep their X-Forwarded-For, on every replica.', { range: saved.range }), {
        heading: saved.added ? this.i18n.t('Proxy added') : this.i18n.t('Saved'),
      });
    }
  }

  protected async remove(proxy: TrustedProxyView): Promise<void> {
    const removed = await this.confirmer.confirm({
      heading: this.i18n.t('Stop trusting {range}?', { range: proxy.range }),
      text: this.removeText(proxy),
      confirm: this.i18n.t('Remove proxy'),
      busy: this.i18n.t('Removing…'),
      action: () => this.api.send('trusted-proxies.remove', { id: proxy.id }),
    });
    if (removed) {
      this.toaster.show(this.i18n.t('{range} is no longer trusted.', { range: proxy.range }));
    }
  }

  private removeText(proxy: TrustedProxyView, now = Date.now()): string {
    const text = this.i18n.t(
      'Requests from it will count as coming from the proxy itself: route allowlists see the proxy’s address, everyone behind it shares one rate limit, and Apiary replaces the X-Forwarded-For it sends on.',
    );
    const at = proxy.lastRequestAt;
    const isRecent = at !== null && now - Date.parse(at) < hour;
    return isRecent ? `${text} ${this.i18n.t('It sent a request {ago}.', { ago: timeAgo(at, now) })}` : text;
  }
}
