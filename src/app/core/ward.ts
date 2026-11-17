/** The ward this dashboard is about. v1 is single-ward by design. */
export const WARD = '11';

/** Attributes the city publishes on each Ward Boundaries feature. */
export interface WardProperties {
  WARD: string;
  COUNCILLOR: string;
  /** Local number without area code, e.g. "896-5011". */
  PHONE: string;
  URL: string;
  IMAGE_URL: string | null;
}

/** Just enough GeoJSON typing for public/data/wards.geojson. */
export interface WardCollection {
  type: 'FeatureCollection';
  features: {
    type: 'Feature';
    properties: WardProperties;
    geometry: { type: 'Polygon' | 'MultiPolygon'; coordinates: unknown };
  }[];
}

/** Provenance written by scripts/fetch-data.mts. */
export interface DataMeta {
  ward: number;
  sources: Record<string, { file: string; source: string; fetchedAt: string }>;
}

const MISSISSAUGA_AREA_CODE = '905';

/**
 * The city publishes councillor phone numbers without an area code
 * ("896-5011"). Returns a display form and a tel: href.
 */
export function formatPhone(raw: string): { display: string; href: string } {
  const digits = raw.replace(/\D/g, '');
  const full = digits.length === 7 ? MISSISSAUGA_AREA_CODE + digits : digits;
  if (full.length !== 10) return { display: raw, href: `tel:${digits}` };
  return {
    display: `${full.slice(0, 3)}-${full.slice(3, 6)}-${full.slice(6)}`,
    href: `tel:+1${full}`,
  };
}
