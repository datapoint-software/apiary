import { ChangeDetectionStrategy, Component, output, signal } from '@angular/core';
import { FormField, form, validate } from '@angular/forms/signals';
import { Button, CalendarButton, Field, Form, TranslatePipe, dayMs, formatUtc, parseUtc, utcDateTime } from '@datapoint/apiary-ui';

export interface AuditRange {
  readonly from: number;
  readonly to: number;
}

const kept = 365 * dayMs;

@Component({
  selector: 'ap-custom-range',
  imports: [Form, Field, FormField, Button, CalendarButton, TranslatePipe],
  template: `
    <form class="ap-toolbar" style="align-items: flex-start" [apForm]="range" #rangeForm="apForm" (submit)="apply(rangeForm)">
      <div style="flex: 1 1 240px">
        <ap-field [label]="'From' | t" [field]="range.from">
          <div class="ap-dtp">
            <div class="ap-affix">
              <input #from class="ap-input ap-data" [formField]="range.from" placeholder="YYYY-MM-DD HH:MM" autocomplete="off" spellcheck="false" />
              <span class="ap-affix-text">UTC</span>
            </div>
            <ap-calendar-button [target]="from" [label]="'From' | t" [min]="earliest" [max]="now" />
          </div>
        </ap-field>
      </div>
      <div style="flex: 1 1 240px">
        <ap-field [label]="'Until' | t" [field]="range.to">
          <div class="ap-dtp">
            <div class="ap-affix">
              <input #to class="ap-input ap-data" [formField]="range.to" placeholder="YYYY-MM-DD HH:MM" autocomplete="off" spellcheck="false" />
              <span class="ap-affix-text">UTC</span>
            </div>
            <ap-calendar-button [target]="to" [label]="'Until' | t" [min]="earliest" [max]="now" />
          </div>
        </ap-field>
      </div>
      <button apButton="primary" type="submit" style="margin-top: 24px">{{ 'Apply' | t }}</button>
    </form>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CustomRange {
  readonly applied = output<AuditRange>();
  protected readonly now = Date.now();
  protected readonly earliest = this.now - kept;
  private readonly model = signal({ from: formatUtc(this.now - 7 * dayMs), to: formatUtc(this.now) });
  protected readonly range = form(this.model, (r) => {
    utcDateTime(r.from);
    utcDateTime(r.to);
    validate(r.from, ({ value }) => {
      const from = parseUtc(value());
      return from !== null && from < Date.now() - kept ? { kind: 'audit.beforeRetention' } : undefined;
    });
    validate(r.to, ({ value, valueOf }) => {
      const from = parseUtc(valueOf(r.from));
      const to = parseUtc(value());
      return from !== null && to !== null && to <= from ? { kind: 'audit.endBeforeStart' } : undefined;
    });
  });

  protected async apply(apForm: Form): Promise<void> {
    await apForm.submit(async () => {
      const from = parseUtc(this.model().from);
      const to = parseUtc(this.model().to);
      if (from !== null && to !== null) {
        this.applied.emit({ from, to });
      }
      return undefined;
    });
  }
}
