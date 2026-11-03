import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { TriangleAlert } from 'lucide';
import { Banner } from '../banner/banner';
import { Button } from '../button/button';
import { isApiProblem } from '../field/api-problem';
import { Icon } from '../icon/icon';
import { ErrorMessages } from '../messages/error-messages';
import { Confirmation } from './confirmation';

@Component({
  selector: 'ap-confirm-dialog',
  imports: [Icon, Button, Banner],
  templateUrl: './confirm-dialog.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfirmDialog {
  protected readonly data = inject<Confirmation>(DIALOG_DATA);
  private readonly dialog = inject<DialogRef<boolean>>(DialogRef);
  private readonly messages = inject(ErrorMessages);
  protected readonly icon = TriangleAlert;
  protected readonly typed = signal('');
  protected readonly working = signal(false);
  protected readonly failure = signal('');
  protected readonly isBlocked = computed(
    () => this.working() || (this.data.typeToConfirm !== undefined && this.typed().trim() !== this.data.typeToConfirm),
  );

  protected cancel(): void {
    if (!this.working()) {
      this.dialog.close(false);
    }
  }

  protected async confirm(): Promise<void> {
    this.working.set(true);
    this.failure.set('');
    try {
      await this.data.action();
      this.dialog.close(true);
    } catch (error) {
      this.failure.set(this.messages.describe(isApiProblem(error) ? error.code : 'network.offline'));
    } finally {
      this.working.set(false);
    }
  }
}
