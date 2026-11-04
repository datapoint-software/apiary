import { httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Banner, PageHead, Status, TranslatePipe } from '@datapoint/apiary-ui';
import { Api } from '../api/api';
import { RootKeyStatus } from '../api/models';
import { timeAgo, utcDateTime } from '../api/time-ago';
import { CopyText } from '../auth/copy-text';
import { version } from '../version';

const stalledAfter = 30 * 60_000;

@Component({
  selector: 'ap-root-key-page',
  imports: [PageHead, Banner, Status, CopyText, TranslatePipe],
  templateUrl: './root-key-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RootKeyPage {
  private readonly api = inject(Api);
  protected readonly status = httpResource<RootKeyStatus>(() => this.api.query('keys.status'));
  protected readonly timeAgo = timeAgo;
  protected readonly utcDateTime = utcDateTime;
  protected readonly saveCommand = 'docker exec <apiary container> cat /run/secrets/apiary_root_key';
  protected readonly createCommand = `(umask 077 && docker run --rm datapointsoftware/apiary:${version} secrets init > apiary_root_key_2) && docker secret create apiary_root_key_2 apiary_root_key_2`;
  protected readonly onCurrent = computed(() => this.count(this.status.value()?.current));
  protected readonly onTarget = computed(() => this.count(this.status.value()?.target));
  protected readonly total = computed(() => this.status.value()?.replicas.length ?? 0);
  protected readonly behind = computed(() => {
    const status = this.status.value();
    return status?.target ? status.replicas.filter((r) => r.rootKeyId !== status.target) : [];
  });
  protected readonly behindNodes = computed(() =>
    this.behind()
      .map((r) => r.node)
      .join(', '),
  );
  protected readonly stalled = computed(() => {
    const since = this.status.value()?.targetSince;
    return !!since && Date.now() - Date.parse(since) > stalledAfter;
  });

  private count(id: string | undefined): number {
    return this.status.value()?.replicas.filter((r) => id && r.rootKeyId === id).length ?? 0;
  }
}
