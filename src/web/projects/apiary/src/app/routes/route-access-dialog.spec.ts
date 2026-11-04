import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { byRole, settle, textOf } from '../testing/dom';
import { RecordingDialogRef } from '../testing/recording-dialog-ref';
import { RouteAccessData, RouteAccessDialog } from './route-access-dialog';

const password = 'acorn-baker-cedar-delta-42';
const link = 'https://shop.example.com/.apiary/sign-in#key';

async function render(data: RouteAccessData): Promise<{
  readonly fixture: ComponentFixture<RouteAccessDialog>;
  readonly ref: RecordingDialogRef;
}> {
  const ref = new RecordingDialogRef();
  TestBed.configureTestingModule({
    providers: [
      { provide: DIALOG_DATA, useValue: data },
      { provide: DialogRef, useValue: ref },
    ],
  });
  const fixture = TestBed.createComponent(RouteAccessDialog);
  await settle(fixture);
  return { fixture, ref };
}

describe('RouteAccessDialog', () => {
  it('names the route saved', async () => {
    const { fixture } = await render({ label: 'shop.example.com', password, hasLink: false });

    expect(byRole(fixture, 'heading', 'shop.example.com saved')).toBeTruthy();
  });

  it.each([
    [
      { password, link, hasLink: true },
      'Visitors need the password now, or the sign-in link.',
      'Anyone who has either gets in until you set a new password or make a new link.',
    ],
    [
      { password, link, hasLink: false },
      'Visitors need the password now, or the sign-in link.',
      'Anyone who has either gets in until you set a new password.',
    ],
    [
      { link, hasLink: true },
      'Here’s the new sign-in link.',
      'Anyone who has it gets in until you set a new password or make a new link.',
    ],
    [
      { password, hasLink: false },
      'Visitors need the password now.',
      'Anyone who has it gets in until you set a new password.',
    ],
  ])('explains what to share for %o', async (data, intro, note) => {
    const { fixture } = await render({ label: 'shop.example.com', ...data });

    expect([textOf(fixture).includes(intro), textOf(fixture).includes(note)]).toEqual([true, true]);
  });

  it('shows the password and the link to copy', async () => {
    const { fixture } = await render({ label: 'shop.example.com', password, link, hasLink: true });

    expect(textOf(fixture)).toContain(link);
  });

  it('closes when done', async () => {
    const { fixture, ref } = await render({ label: 'shop.example.com', password, hasLink: false });

    byRole(fixture, 'button', 'Done').click();

    expect(ref.results).toEqual([undefined]);
  });
});
