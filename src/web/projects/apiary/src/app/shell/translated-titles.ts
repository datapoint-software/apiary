import { Service, effect, inject } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterStateSnapshot, TitleStrategy } from '@angular/router';
import { I18n } from '@datapoint/apiary-ui';

@Service()
export class TranslatedTitles extends TitleStrategy {
  private readonly title = inject(Title);
  private readonly i18n = inject(I18n);
  private snapshot: RouterStateSnapshot | undefined;

  constructor() {
    super();
    effect(() => {
      this.i18n.language();
      if (this.snapshot) {
        this.apply(this.snapshot);
      }
    });
  }

  override updateTitle(snapshot: RouterStateSnapshot): void {
    this.snapshot = snapshot;
    this.apply(snapshot);
  }

  private apply(snapshot: RouterStateSnapshot): void {
    const title = this.buildTitle(snapshot);
    if (title) {
      this.title.setTitle(title.split(' · ').map((part) => this.i18n.t(part)).join(' · '));
    }
  }
}
