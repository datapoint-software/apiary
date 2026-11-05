import { Dialog } from '@angular/cdk/dialog';
import { Service, inject } from '@angular/core';
import { Confirmer, I18n, Toaster } from '@datapoint/apiary-ui';
import { Api } from '../api/api';
import { NewPipelineToken, PipelineTokenView, StackView } from '../api/models';
import { openDialog } from '../shell/open-dialog';
import { AddStackDialog } from './add-stack-dialog';
import { declared } from './stack-text';
import { TokenDialog } from './token-dialog';
import { TokenValueDialog } from './token-value-dialog';

@Service()
export class StackActions {
  private readonly api = inject(Api);
  private readonly dialog = inject(Dialog);
  private readonly confirmer = inject(Confirmer);
  private readonly toaster = inject(Toaster);
  private readonly i18n = inject(I18n);

  async add(): Promise<NewPipelineToken | undefined> {
    const created = await openDialog<NewPipelineToken, null>(this.dialog, AddStackDialog, null);
    if (created) {
      await openDialog<void, NewPipelineToken>(this.dialog, TokenValueDialog, created);
    }
    return created;
  }

  async createToken(stack: string): Promise<void> {
    const created = await openDialog<NewPipelineToken, string>(this.dialog, TokenDialog, stack);
    if (created) {
      await openDialog<void, NewPipelineToken>(this.dialog, TokenValueDialog, created);
    }
  }

  async revoke(token: PipelineTokenView): Promise<void> {
    const revoked = await this.confirmer.confirm({
      heading: this.i18n.t('Revoke {name}?', { name: token.name }),
      text: this.i18n.t(
        'Pipelines that use it can’t apply {stack} anymore. The routes it applied stay as they are.',
        { stack: token.stack },
      ),
      confirm: this.i18n.t('Revoke token'),
      busy: this.i18n.t('Revoking…'),
      action: () => this.api.send('pipeline-tokens.revoke', { id: token.id }),
    });
    if (revoked) {
      this.toaster.show(this.i18n.t('{name} no longer works.', { name: token.name }));
    }
  }

  async remove(stack: StackView, tokens: number): Promise<boolean> {
    const items = declared(stack, this.i18n);
    const text = [
      items.length
        ? this.i18n.t(
            'Apiary deletes its {items} on every replica, and requests to them get a 404 at once.',
            { items: items.join(', ') },
          )
        : '',
      tokens
        ? this.i18n.plural(
            tokens,
            'Its pipeline token stops working.',
            'Its {count} pipeline tokens stop working.',
          )
        : '',
      this.i18n.t(
        'Do this after docker stack rm {stack}: Apiary never touches Docker, so the services keep running until you run it.',
        { stack: stack.name },
      ),
    ];
    const removed = await this.confirmer.confirm({
      heading: this.i18n.t('Remove stack {stack}?', { stack: stack.name }),
      text: text.filter((t) => t !== '').join(' '),
      confirm: this.i18n.t('Remove stack'),
      busy: this.i18n.t('Removing…'),
      typeToConfirm: stack.name,
      action: () => this.api.send('stacks.remove', { name: stack.name }),
    });
    if (removed) {
      this.toaster.show(this.i18n.t('Stack {stack} was removed.', { stack: stack.name }));
    }
    return removed;
  }
}
