import { ChangeDetectionStrategy, Component, input } from '@angular/core';

let nextId = 0;

/**
 * A small ⓘ that reveals one or two sentences on hover, keyboard focus or tap.
 * For nuance that doesn't fit in a label — use sparingly, never as a footnote
 * substitute for something every reader needs.
 */
@Component({
  selector: 'app-info-tip',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button type="button" [attr.aria-label]="label()" [attr.aria-describedby]="id">i</button>
    <span class="tip" role="tooltip" [id]="id">{{ text() }}</span>
  `,
  styles: `
    :host {
      position: relative;
      display: inline-block;
      vertical-align: 0.05em;
      margin-left: 0.25rem;
    }
    button {
      display: grid;
      place-items: center;
      width: 17px;
      height: 17px;
      padding: 0;
      border: 1px solid var(--muted);
      border-radius: 50%;
      background: none;
      color: var(--muted);
      font:
        600 11px/1 system-ui,
        sans-serif;
      cursor: help;
    }
    button:focus-visible {
      outline: 2px solid var(--accent);
      outline-offset: 2px;
    }
    .tip {
      display: none;
      position: absolute;
      left: 50%;
      top: calc(100% + 6px);
      transform: translateX(-50%);
      width: max-content;
      max-width: min(18rem, 80vw);
      padding: 0.5rem 0.625rem;
      border: 1px solid var(--border);
      border-radius: 6px;
      background: var(--bg);
      box-shadow: 0 4px 14px rgb(0 0 0 / 0.14);
      color: var(--text);
      font-size: 0.8125rem;
      font-weight: 400;
      line-height: 1.4;
      text-align: left;
      white-space: normal;
      z-index: 10;
    }
    :host(:hover) .tip,
    :host(:focus-within) .tip {
      display: block;
    }
  `,
})
export class InfoTip {
  readonly text = input.required<string>();
  readonly label = input('More information');
  protected readonly id = `info-tip-${nextId++}`;
}
