import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { TestBed } from '@angular/core/testing';
import { byRole, settle, textOf } from '../testing/dom';
import { RecordingDialogRef } from '../testing/recording-dialog-ref';
import { InviteLinkData, InviteLinkDialog } from './invite-link-dialog';

const link: InviteLinkData = {
  heading: 'Invite Eva Lima',
  email: 'eva@example.com',
  url: 'https://apiary.example.com/invite/token-9',
  renewed: false,
};

async function render(data: InviteLinkData) {
  const ref = new RecordingDialogRef();
  TestBed.configureTestingModule({
    providers: [
      { provide: DIALOG_DATA, useValue: data },
      { provide: DialogRef, useValue: ref },
    ],
  });
  const fixture = TestBed.createComponent(InviteLinkDialog);
  await settle(fixture);
  return { fixture, ref };
}

describe('InviteLinkDialog', () => {
  it('says who to send the link to', async () => {
    const { fixture } = await render(link);

    expect(textOf(fixture)).toContain(
      'Send this link to eva@example.com over a channel you trust.',
    );
  });

  it('shows the link to copy', async () => {
    const { fixture } = await render(link);

    expect(textOf(fixture)).toContain('https://apiary.example.com/invite/token-9');
  });

  it('copies the link', async () => {
    const writeText = vi.fn(async () => undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    const { fixture } = await render(link);

    byRole(fixture, 'button', 'Copy').click();
    await settle(fixture);

    expect([writeText.mock.calls[0], byRole(fixture, 'button', 'Copied')]).toEqual([
      ['https://apiary.example.com/invite/token-9'],
      expect.anything(),
    ]);
  });

  it('says the previous link no longer works', async () => {
    const { fixture } = await render({ ...link, renewed: true });

    expect(textOf(fixture)).toContain('The previous link no longer works.');
  });

  it('closes when done', async () => {
    const { fixture, ref } = await render(link);

    byRole(fixture, 'button', 'Done').click();

    expect(ref.results).toEqual([undefined]);
  });
});
