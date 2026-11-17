import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** A headline number with a label and an optional supporting line. */
@Component({
  selector: 'app-stat-tile',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p class="label">{{ label() }}</p>
    <p class="value">{{ value() }}</p>
    @if (detail()) {
      <p class="detail">{{ detail() }}</p>
    }
  `,
  styles: `
    :host {
      display: block;
      padding: 1rem 1.125rem;
      border: 1px solid var(--border);
      border-radius: 8px;
      background: var(--surface);
      min-width: 0;
    }
    p {
      margin: 0;
    }
    .label {
      font-size: 0.8125rem;
      color: var(--muted);
    }
    .value {
      margin: 0.125rem 0;
      font-size: 1.75rem;
      font-weight: 600;
      line-height: 1.2;
    }
    .detail {
      font-size: 0.8125rem;
      color: var(--muted);
      overflow-wrap: anywhere;
    }
  `,
})
export class StatTile {
  readonly label = input.required<string>();
  readonly value = input.required<string>();
  readonly detail = input<string>();
}
