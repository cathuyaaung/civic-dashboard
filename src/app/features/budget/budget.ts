import { DatePipe, LowerCasePipe } from '@angular/common';
import { httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import {
  BudgetData,
  categoryColor,
  foldSmallCategories,
  summarizeSpending,
} from '../../core/budget';
import { money, share, signedPercent } from '../../core/format';
import { DataMeta } from '../../core/ward';
import { Donut, DonutSlice } from '../../shared/donut';
import { Sparkline } from '../../shared/sparkline';
import { StatTile } from '../../shared/stat-tile';

@Component({
  selector: 'app-budget',
  imports: [DatePipe, LowerCasePipe, Donut, Sparkline, StatTile],
  templateUrl: './budget.html',
  styleUrl: './budget.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Budget {
  private readonly data = httpResource<BudgetData>(() => 'data/budget.json');
  private readonly meta = httpResource<DataMeta>(() => 'data/meta.json');

  protected readonly status = computed(() => this.data.status());

  protected readonly summary = computed(() =>
    this.data.hasValue() ? summarizeSpending(this.data.value()) : undefined,
  );

  /** Ranked services with their colours; tiny ones folded into "Other". The table keeps them all. */
  protected readonly ranked = computed(() => {
    const s = this.summary();
    return s ? foldSmallCategories(s).map((c) => ({ ...c, color: categoryColor(c.line) })) : [];
  });

  protected readonly slices = computed<DonutSlice[]>(() =>
    this.ranked().map((c) => ({
      id: c.line,
      // The donut centre is narrow; "Other (health, …)" is spelled out in the list.
      label: c.line === 'Other' ? 'Other' : c.label,
      value: c.amount,
      color: c.color.fill,
      ink: c.color.ink,
    })),
  );

  protected readonly top = computed(() => this.ranked()[0]);

  /** Fastest-growing service since the first year (ignores the folded "Other"). */
  protected readonly fastest = computed(() =>
    this.ranked()
      .filter((c) => c.line !== 'Other' && c.change !== null)
      .reduce<ReturnType<typeof this.ranked>[number] | undefined>(
        (best, c) => (!best || (c.change ?? 0) > (best.change ?? 0) ? c : best),
        undefined,
      ),
  );

  /** Bars scale to the largest category so it fills the track. */
  protected readonly maxShare = computed(() => this.ranked()[0]?.share || 1);

  /** Service highlighted in both the donut and the list. */
  protected readonly active = signal<string | null>(null);

  protected readonly fetchedAt = computed(() =>
    this.meta.hasValue() ? this.meta.value().sources['budget']?.fetchedAt : undefined,
  );

  protected readonly money = money;
  protected readonly share = share;
  protected readonly signedPercent = signedPercent;
  protected readonly cents = (fraction: number) => Math.round(fraction * 100);
}
