import { Confirmation } from '@datapoint/apiary-ui';

export class AcceptingConfirmer {
  readonly asked: Confirmation[] = [];

  async confirm(confirmation: Confirmation): Promise<boolean> {
    this.asked.push(confirmation);
    await confirmation.action();
    return true;
  }
}
