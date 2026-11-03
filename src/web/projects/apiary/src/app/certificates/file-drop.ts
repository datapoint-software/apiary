import { Directive, output, signal } from '@angular/core';

@Directive({
  selector: '[apFileDrop]',
  host: {
    '[attr.data-over]': 'over() ? "" : null',
    '(dragenter)': 'enter($event)',
    '(dragover)': 'enter($event)',
    '(dragleave)': 'over.set(false)',
    '(drop)': 'drop($event)',
  },
})
export class FileDrop {
  readonly apFileDrop = output<File>();
  protected readonly over = signal(false);

  protected enter(event: DragEvent): void {
    if (event.dataTransfer?.types.includes('Files')) {
      event.preventDefault();
      this.over.set(true);
    }
  }

  protected drop(event: DragEvent): void {
    this.over.set(false);
    const file = event.dataTransfer?.files[0];
    if (file) {
      event.preventDefault();
      this.apFileDrop.emit(file);
    }
  }
}
