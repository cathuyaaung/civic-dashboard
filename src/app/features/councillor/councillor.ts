import { DatePipe } from '@angular/common';
import { httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import { DataMeta, formatPhone, WARD, WardCollection } from '../../core/ward';

@Component({
  selector: 'app-councillor',
  imports: [DatePipe],
  templateUrl: './councillor.html',
  styleUrl: './councillor.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Councillor {
  protected readonly wardNumber = WARD;

  private readonly wards = httpResource<WardCollection>(() => 'data/wards.geojson');
  private readonly meta = httpResource<DataMeta>(() => 'data/meta.json');

  protected readonly status = computed(() => this.wards.status());

  protected readonly ward = computed(() => {
    if (!this.wards.hasValue()) return undefined;
    return this.wards.value().features.find((f) => f.properties.WARD === WARD)?.properties;
  });

  protected readonly phone = computed(() => {
    const ward = this.ward();
    return ward ? formatPhone(ward.PHONE) : undefined;
  });

  /** IMAGE_URL sometimes holds the profile page URL instead of an image. */
  protected readonly photo = computed(() => {
    const url = this.ward()?.IMAGE_URL;
    return url && /\.(jpe?g|png|webp|gif)$/i.test(url) ? url : undefined;
  });

  protected readonly fetchedAt = computed(() =>
    this.meta.hasValue() ? this.meta.value().sources['wards']?.fetchedAt : undefined,
  );
}
