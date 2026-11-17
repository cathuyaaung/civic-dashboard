import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  viewChild,
  ViewEncapsulation,
} from '@angular/core';
import * as L from 'leaflet';
import { WardCollection } from '../../core/ward';

export interface MapApplication {
  id: string;
  lat: number;
  lon: number;
  title: string;
  description: string;
  details: string[];
  homes: number;
}

/**
 * OpenStreetMap's standard tiles: keyless, but subject to the OSMF tile usage
 * policy (attribution shown, light use). Fine for a personal dashboard; switch
 * to a hosted tile provider if this ever gets real traffic.
 */
const TILES = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

/** Circle radius in px: area grows with homes, with a floor for non-residential. */
export function markerRadius(homes: number, maxHomes: number): number {
  const MIN = 5;
  const MAX = 18;
  if (homes <= 0 || maxHomes <= 0) return MIN;
  return MIN + (MAX - MIN) * Math.sqrt(homes / maxHomes);
}

/**
 * Leaflet map of one ward's boundary, its neighbours for context, and
 * development applications sized by proposed homes.
 */
@Component({
  selector: 'app-ward-map',
  changeDetection: ChangeDetectionStrategy.OnPush,
  // Leaflet creates its DOM outside Angular's view, so styles can't be scoped.
  // Every class below is prefixed `wm-`.
  encapsulation: ViewEncapsulation.None,
  template: `<div #host class="wm-map" role="region" [attr.aria-label]="ariaLabel()"></div>`,
  styles: `
    app-ward-map {
      display: block;
    }
    .wm-map {
      height: 420px;
      border: 1px solid var(--border);
      border-radius: 8px;
      background: var(--surface);
      z-index: 0;
    }
    .wm-ward {
      stroke: var(--accent);
      stroke-width: 2.5;
      fill: var(--accent);
      fill-opacity: 0.08;
    }
    .wm-neighbour {
      stroke: var(--muted);
      stroke-width: 1;
      stroke-opacity: 0.5;
      fill: none;
    }
    .wm-app {
      fill: var(--accent);
      fill-opacity: 0.85;
      stroke: var(--bg);
      stroke-width: 2;
      cursor: pointer;
    }
    .wm-app:hover,
    .wm-app.wm-active {
      fill-opacity: 1;
      stroke: var(--text);
    }
    .wm-map .leaflet-popup-content-wrapper,
    .wm-map .leaflet-popup-tip {
      background: var(--bg);
      color: var(--text);
    }
    .wm-map .leaflet-popup-content {
      margin: 0.75rem 1rem;
      font: inherit;
      font-size: 0.875rem;
      line-height: 1.4;
    }
    .wm-popup strong {
      display: block;
      margin-bottom: 0.125rem;
    }
    .wm-popup p {
      margin: 0.25rem 0;
    }
    .wm-popup .wm-muted {
      color: var(--muted);
    }
    .wm-map .leaflet-control-attribution {
      background: color-mix(in srgb, var(--bg) 80%, transparent);
      color: var(--muted);
    }
    .wm-map .leaflet-control-attribution a {
      color: var(--link);
    }
    .wm-map .leaflet-bar {
      border-color: var(--border);
    }
    .wm-map .leaflet-bar a {
      background: var(--bg);
      color: var(--text);
      border-bottom-color: var(--border);
    }
    .wm-map .leaflet-bar a:hover {
      background: var(--surface);
    }
    /* Desaturate the busy OSM basemap so the ward and applications stand out. */
    .wm-map .leaflet-tile-pane {
      filter: grayscale(0.85) contrast(0.9) brightness(1.04);
    }
    @media (prefers-color-scheme: dark) {
      .wm-map .leaflet-tile-pane {
        filter: grayscale(1) invert(1) brightness(0.85) contrast(0.85);
      }
    }
    @media (max-width: 560px) {
      .wm-map {
        height: 320px;
      }
    }
  `,
})
export class WardMap {
  readonly ward = input.required<string>();
  readonly wards = input.required<WardCollection>();
  readonly applications = input<MapApplication[]>([]);
  readonly ariaLabel = input('Map');

  private readonly host = viewChild.required<ElementRef<HTMLDivElement>>('host');
  private map?: L.Map;
  private overlay?: L.LayerGroup;
  private markers = new Map<string, L.CircleMarker>();

  constructor() {
    const destroyRef = inject(DestroyRef);

    afterNextRender(() => {
      const map = L.map(this.host().nativeElement, {
        scrollWheelZoom: false, // don't hijack page scrolling
        zoomSnap: 0.25,
      });
      this.map = map;
      this.overlay = L.layerGroup().addTo(map);

      // Dark mode darkens these same tiles with a CSS filter (see styles).
      L.tileLayer(TILES, { attribution: ATTRIBUTION, maxZoom: 19 }).addTo(map);

      this.draw();
      destroyRef.onDestroy(() => map.remove());
    });

    // Redraw when inputs change after the map exists.
    effect(() => {
      this.ward();
      this.wards();
      this.applications();
      this.draw();
    });
  }

  /** Pan to an application and open its popup. */
  focus(id: string): void {
    const marker = this.markers.get(id);
    if (!marker || !this.map) return;
    this.map.flyTo(marker.getLatLng(), Math.max(this.map.getZoom(), 15), { duration: 0.6 });
    marker.openPopup();
    this.host().nativeElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  private draw(): void {
    const map = this.map;
    const overlay = this.overlay;
    if (!map || !overlay) return;
    overlay.clearLayers();
    this.markers.clear();

    const features = this.wards().features;
    const target = features.filter((f) => f.properties.WARD === this.ward());

    L.geoJSON(
      { type: 'FeatureCollection', features: features.filter((f) => !target.includes(f)) } as never,
      { interactive: false, style: () => ({ className: 'wm-neighbour' }) },
    ).addTo(overlay);

    const wardLayer = L.geoJSON({ type: 'FeatureCollection', features: target } as never, {
      interactive: false,
      style: () => ({ className: 'wm-ward' }),
    }).addTo(overlay);

    const apps = this.applications();
    const maxHomes = Math.max(0, ...apps.map((a) => a.homes));
    // Largest first so small circles draw on top and stay clickable.
    for (const a of [...apps].sort((x, y) => y.homes - x.homes)) {
      const marker = L.circleMarker([a.lat, a.lon], {
        radius: markerRadius(a.homes, maxHomes),
        className: 'wm-app',
      })
        .bindPopup(() => popup(a), { maxWidth: 280 })
        .bindTooltip(a.title, { direction: 'top', offset: [0, -6] })
        .on('popupopen', () => marker.getElement()?.classList.add('wm-active'))
        .on('popupclose', () => marker.getElement()?.classList.remove('wm-active'))
        .addTo(overlay);
      this.markers.set(a.id, marker);
    }

    const bounds = wardLayer.getBounds();
    if (bounds.isValid()) map.fitBounds(bounds, { padding: [16, 16] });
  }
}

/** Popup content built with textContent: application text is untrusted data. */
function popup(a: MapApplication): HTMLElement {
  const el = document.createElement('div');
  el.className = 'wm-popup';
  const title = el.appendChild(document.createElement('strong'));
  title.textContent = a.title;
  const desc = el.appendChild(document.createElement('p'));
  desc.textContent = a.description;
  for (const d of a.details) {
    const p = el.appendChild(document.createElement('p'));
    p.className = 'wm-muted';
    p.textContent = d;
  }
  return el;
}
