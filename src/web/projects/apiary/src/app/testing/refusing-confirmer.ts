import { Confirmation } from '@datapoint/apiary-ui';

export class RefusingConfirmer {
  readonly asked: Confirmation[] = [];

  async confirm(confirmation: Confirmation): Promise<boolean> {
    this.asked.push(confirmation);
    return false;
  }
}
