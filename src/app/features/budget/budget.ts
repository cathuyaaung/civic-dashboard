import { DatePipe } from '@angular/common';
import { httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import { BudgetData, foldSmallCategories, summarizeSpending } from '../../core/budget';
import { money, share, signedPercent } from '../../core/format';
import { DataMeta } from '../../core/ward';
import { Sparkline } from '../../shared/sparkline';

@Component({
  selector: 'app-budget',
  imports: [DatePipe, Sparkline],
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

  /** Ranked list: tiny categories folded into "Other". The table keeps them all. */
  protected readonly ranked = computed(() => {
    const s = this.summary();
    return s ? foldSmallCategories(s) : [];
  });

  /** Bars scale to the largest category so it fills the track. */
  protected readonly maxShare = computed(() => this.ranked()[0]?.share || 1);

  protected readonly fetchedAt = computed(() =>
    this.meta.hasValue() ? this.meta.value().sources['budget']?.fetchedAt : undefined,
  );

  protected readonly money = money;
  protected readonly share = share;
  protected readonly signedPercent = signedPercent;
}
