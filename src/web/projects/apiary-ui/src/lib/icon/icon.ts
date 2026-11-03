import { ChangeDetectionStrategy, Component, ElementRef, effect, inject, input } from '@angular/core';
import type { IconNode } from 'lucide';

const svgNamespace = 'http://www.w3.org/2000/svg';
const svgAttributes: Record<string, string> = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  'stroke-width': '2',
  'stroke-linecap': 'round',
  'stroke-linejoin': 'round',
  'aria-hidden': 'true',
  focusable: 'false',
  class: 'ap-icon',
};

function draw(node: IconNode): SVGElement {
  const svg = document.createElementNS(svgNamespace, 'svg');
  Object.entries(svgAttributes).forEach(([name, value]) => svg.setAttribute(name, value));
  for (const [tag, attributes] of node) {
    const child = document.createElementNS(svgNamespace, tag);
    Object.entries(attributes).forEach(([name, value]) => child.setAttribute(name, String(value)));
    svg.appendChild(child);
  }
  return svg;
}

@Component({
  selector: 'ap-icon',
  template: '',
  host: { style: 'display: contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Icon {
  readonly icon = input.required<IconNode>();
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  constructor() {
    effect(() => this.host.nativeElement.replaceChildren(draw(this.icon())));
  }
}
