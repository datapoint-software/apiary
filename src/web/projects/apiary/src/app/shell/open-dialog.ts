import { Dialog } from '@angular/cdk/dialog';
import { ComponentType } from '@angular/cdk/portal';
import { firstValueFrom } from 'rxjs';

export async function openDialog<TResult, TData>(
  dialog: Dialog,
  component: ComponentType<unknown>,
  data: TData,
): Promise<TResult | undefined> {
  const ref = dialog.open<TResult, TData>(component, {
    data,
    backdropClass: 'ap-dialog-backdrop',
    panelClass: 'ap-dialog-pane',
    ariaModal: true,
  });
  return firstValueFrom(ref.closed);
}
