import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { TestBed } from '@angular/core/testing';
import { byRole, settle, textOf } from '../testing/dom';
import { RecordingDialogRef } from '../testing/recording-dialog-ref';
import { RecoveryCodesDialog } from './recovery-codes-dialog';

async function render(codes: readonly string[]) {
  const ref = new RecordingDialogRef();
  TestBed.configureTestingModule({
    providers: [
      { provide: DIALOG_DATA, useValue: codes },
      { provide: DialogRef, useValue: ref },
    ],
  });
  const fixture = TestBed.createComponent(RecoveryCodesDialog);
  await settle(fixture);
  return { fixture, ref };
}

describe('RecoveryCodesDialog', () => {
  it('shows the new codes', async () => {
    const { fixture } = await render(['aaaa-bbbb-cccc-dddd', 'eeee-ffff-gggg-hhhh']);

    expect(textOf(fixture)).toContain('aaaa-bbbb-cccc-dddd eeee-ffff-gggg-hhhh');
  });

  it('closes once they are saved', async () => {
    const { fixture, ref } = await render(['aaaa-bbbb-cccc-dddd']);

    byRole(fixture, 'button', 'I saved them').click();

    expect(ref.results).toEqual([undefined]);
  });
});
