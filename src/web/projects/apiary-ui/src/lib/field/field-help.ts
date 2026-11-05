import { Directive } from '@angular/core';

/** Marks content that `<ap-field>` shows as its help, after any `help` text, for help that needs markup such as a link. */
@Directive({ selector: '[apFieldHelp]' })
export class FieldHelp {}
