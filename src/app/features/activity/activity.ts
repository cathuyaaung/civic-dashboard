import { DatePipe, DecimalPipe } from '@angular/common';
import { httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import {
  applicationType,
  cityNow,
  DevApplicationCollection,
  formatMeetingTime,
  mapLink,
  MeetingsData,
  upcomingMeetings,
} from '../../core/activity';
import { DataMeta, WARD } from '../../core/ward';

/** Meetings shown before "Show more". */
const MEETINGS_PREVIEW = 6;

@Component({
  selector: 'app-activity',
  imports: [DatePipe, DecimalPipe],
  templateUrl: './activity.html',
  styleUrl: './activity.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Activity {
  protected readonly wardNumber = WARD;

  private readonly applicationsData = httpResource<DevApplicationCollection>(
    () => 'data/development-applications.geojson',
  );
  private readonly meetingsData = httpResource<MeetingsData>(() => 'data/meetings.json');
  private readonly meta = httpResource<DataMeta>(() => 'data/meta.json');

  protected readonly applicationsStatus = computed(() => this.applicationsData.status());
  protected readonly meetingsStatus = computed(() => this.meetingsData.status());

  /** Newest submission first. */
  protected readonly applications = computed(() => {
    if (!this.applicationsData.hasValue()) return [];
    return this.applicationsData
      .value()
      .features.map(({ properties: p, geometry: g }) => ({
        ...p,
        type: applicationType(p.ApplicationNumber),
        uses: p.ProposedUse.split(/\s*;\s*/).join(', '),
        map: g ? mapLink(g.coordinates[0], g.coordinates[1]) : null,
      }))
      .sort((a, b) => b.SubmissionDate.localeCompare(a.SubmissionDate));
  });

  protected readonly scope = signal<'key' | 'all'>('key');
  protected readonly expanded = signal(false);

  private readonly upcoming = computed(() =>
    this.meetingsData.hasValue()
      ? upcomingMeetings(this.meetingsData.value().meetings, cityNow(), this.scope())
      : [],
  );

  protected readonly meetings = computed(() =>
    this.expanded() ? this.upcoming() : this.upcoming().slice(0, MEETINGS_PREVIEW),
  );
  protected readonly hiddenMeetings = computed(
    () => this.upcoming().length - this.meetings().length,
  );

  protected readonly fetchedAt = computed(() => {
    if (!this.meta.hasValue()) return undefined;
    const s = this.meta.value().sources;
    return {
      applications: s['developmentApplications']?.fetchedAt,
      meetings: s['meetings']?.fetchedAt,
    };
  });

  protected readonly formatMeetingTime = formatMeetingTime;

  protected setScope(scope: 'key' | 'all'): void {
    this.scope.set(scope);
    this.expanded.set(false);
  }
}
