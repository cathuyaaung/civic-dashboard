import { DatePipe, DecimalPipe } from '@angular/common';
import { httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, signal, viewChild } from '@angular/core';
import {
  applicationType,
  cityNow,
  DevApplicationCollection,
  formatMeetingTime,
  MeetingsData,
  upcomingMeetings,
} from '../../core/activity';
import { DataMeta, WARD, WardCollection } from '../../core/ward';
import { StatTile } from '../../shared/stat-tile';
import { MapApplication, WardMap } from './ward-map';

/** Meetings shown before "Show more". */
const MEETINGS_PREVIEW = 6;

@Component({
  selector: 'app-activity',
  imports: [DatePipe, DecimalPipe, StatTile, WardMap],
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
  private readonly wardsData = httpResource<WardCollection>(() => 'data/wards.geojson');
  private readonly meta = httpResource<DataMeta>(() => 'data/meta.json');

  private readonly map = viewChild(WardMap);

  protected readonly applicationsStatus = computed(() => this.applicationsData.status());
  protected readonly meetingsStatus = computed(() => this.meetingsData.status());
  protected readonly wards = computed(() =>
    this.wardsData.hasValue() ? this.wardsData.value() : undefined,
  );

  /** Newest submission first. */
  protected readonly applications = computed(() => {
    if (!this.applicationsData.hasValue()) return [];
    return this.applicationsData
      .value()
      .features.map(({ properties: p, geometry: g }) => ({
        ...p,
        type: applicationType(p.ApplicationNumber),
        uses: p.ProposedUse.split(/\s*;\s*/).join(', '),
        point: g ? { lon: g.coordinates[0], lat: g.coordinates[1] } : null,
      }))
      .sort((a, b) => b.SubmissionDate.localeCompare(a.SubmissionDate));
  });

  protected readonly mapApplications = computed<MapApplication[]>(() =>
    this.applications().flatMap((a) =>
      a.point
        ? [
            {
              id: a.ApplicationNumber,
              ...a.point,
              title: a.SiteAddress,
              description: a.ApplicationDescription,
              details: [
                `${a.type} · ${a.ApplicationNumber}`,
                ...(a.ResidentialUnits ? [`${a.ResidentialUnits.toLocaleString()} homes`] : []),
                `Status: ${a.ApplicationStatus}`,
              ],
              homes: a.ResidentialUnits ?? 0,
            },
          ]
        : [],
    ),
  );

  /** The application proposing the most homes, if any propose homes. */
  protected readonly largest = computed(() => {
    const apps = this.applications();
    if (!apps.length) return undefined;
    const best = apps.reduce((b, a) =>
      (a.ResidentialUnits ?? 0) > (b.ResidentialUnits ?? 0) ? a : b,
    );
    return best.ResidentialUnits ? best : undefined;
  });

  protected readonly scope = signal<'key' | 'all'>('key');
  protected readonly expanded = signal(false);

  private readonly now = cityNow();

  private readonly upcoming = computed(() =>
    this.meetingsData.hasValue()
      ? upcomingMeetings(this.meetingsData.value().meetings, this.now, this.scope())
      : [],
  );

  protected readonly nextCouncil = computed(() =>
    this.meetingsData.hasValue()
      ? upcomingMeetings(this.meetingsData.value().meetings, this.now, 'key').find((m) =>
          /council$/i.test(m.name.trim()),
        )
      : undefined,
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

  protected showOnMap(id: string): void {
    this.map()?.focus(id);
  }
}
