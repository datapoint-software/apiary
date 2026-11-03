import { ChangeDetectionStrategy, Component, ElementRef, afterNextRender, inject, signal, viewChild, Injector } from '@angular/core';
import { Button, Icon } from '@datapoint/apiary-ui';
import { Accessibility } from 'lucide';
import { DisplaySettings, displayChoices } from './display-settings';

@Component({
  selector: 'ap-display-menu',
  imports: [Button, Icon],
  host: {
    style: 'position: relative',
    '(document:mousedown)': 'closeOutside($event)',
    '(keydown.escape)': 'close(true)',
  },
  template: `
    <button
      #trigger
      apButton="ghost"
      [iconOnly]="true"
      type="button"
      aria-label="Display and accessibility"
      aria-haspopup="dialog"
      aria-controls="display"
      [attr.aria-expanded]="open()"
      (click)="toggle()"
    >
      <ap-icon [icon]="icon" />
    </button>
    @if (open()) {
      <div #panel class="ap-popover" role="dialog" aria-modal="false" aria-labelledby="display-title" id="display" style="right: 0; top: calc(100% + 8px)">
        <h2 class="ap-h ap-h-3" id="display-title">Display and accessibility</h2>
        @for (choice of choices; track choice.setting) {
          <div class="ap-setting">
            <span class="ap-label" [id]="'display-' + choice.setting">{{ choice.label }}</span>
            <div class="ap-seg" role="group" [attr.aria-labelledby]="'display-' + choice.setting">
              @for (option of choice.options; track option[0]) {
                <button type="button" [attr.aria-pressed]="settings.value(choice) === option[0]" (click)="settings.set(choice.setting, option[0])">
                  {{ option[1] }}
                </button>
              }
            </div>
          </div>
        }
        <p class="ap-caption" style="margin: 0">Automatic follows your device settings. Saved in this browser only.</p>
      </div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DisplayMenu {
  protected readonly settings = inject(DisplaySettings);
  private readonly injector = inject(Injector);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly trigger = viewChild.required<ElementRef<HTMLButtonElement>>('trigger');
  private readonly panel = viewChild<ElementRef<HTMLElement>>('panel');
  protected readonly choices = displayChoices;
  protected readonly icon = Accessibility;
  protected readonly open = signal(false);

  protected toggle(): void {
    if (this.open()) {
      this.close(true);
      return;
    }
    this.open.set(true);
    afterNextRender(() => this.panel()?.nativeElement.querySelector<HTMLElement>('[aria-pressed="true"]')?.focus(), {
      injector: this.injector,
    });
  }

  close(refocus: boolean): void {
    if (!this.open()) {
      return;
    }
    this.open.set(false);
    if (refocus) {
      this.trigger().nativeElement.focus();
    }
  }

  protected closeOutside(event: MouseEvent): void {
    if (!this.host.nativeElement.contains(event.target as Node)) {
      this.close(false);
    }
  }
}
