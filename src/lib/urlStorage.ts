import type { MarketEvent } from '@/types';

const HASH_PREFIX = 'data=';

/**
 * Compress events array to a compact string for URL storage
 */
export function eventsToHash(events: MarketEvent[]): string {
  if (events.length === 0) return '';

  // Pick only essential fields to keep URL short
  const compact = events.map((e) => ({
    t: e.title,
    d: e.date,
    tt: e.tumorType,
    l: e.location,
    s: e.scale,
    ty: e.type,
    ds: e.description || undefined,
    sp: e.speakers || undefined,
    a: e.attendees || undefined,
    b: e.budget || undefined,
    oo: e.onlineOffline || undefined,
    ta: e.ta || undefined,
    ec: e.expCategory || undefined,
    r: e.region || undefined,
    p: e.province || undefined,
    c: e.city || undefined,
    h: e.hospital || undefined,
    k: e.kol || undefined,
  }));

  try {
    const json = JSON.stringify(compact);
    // Use base64 encoding (no compression to avoid external deps)
    const encoded = btoa(encodeURIComponent(json));
    return HASH_PREFIX + encoded;
  } catch {
    return '';
  }
}

/**
 * Parse events from URL hash
 */
export function hashToEvents(hash: string): MarketEvent[] {
  if (!hash || !hash.startsWith(HASH_PREFIX)) return [];

  try {
    const encoded = hash.slice(HASH_PREFIX.length);
    const json = decodeURIComponent(atob(encoded));
    const compact = JSON.parse(json);

    if (!Array.isArray(compact)) return [];

    return compact.map((c: any, idx: number) => ({
      id: `shared-${idx}`,
      title: c.t || '',
      date: c.d || '',
      tumorType: c.tt || '食管癌',
      location: c.l || '待定',
      scale: c.s || '中型',
      type: c.ty || '其他',
      description: c.ds || '',
      speakers: c.sp || undefined,
      attendees: c.a || undefined,
      budget: c.b || undefined,
      onlineOffline: c.oo || undefined,
      ta: c.ta || undefined,
      expCategory: c.ec || undefined,
      region: c.r || undefined,
      province: c.p || undefined,
      city: c.c || undefined,
      hospital: c.h || undefined,
      kol: c.k || undefined,
    }));
  } catch {
    return [];
  }
}

/**
 * Read events from current URL hash
 */
export function readFromUrl(): MarketEvent[] {
  const hash = window.location.hash.slice(1); // remove leading #
  return hashToEvents(hash);
}

/**
 * Write events to URL hash
 */
export function writeToUrl(events: MarketEvent[]) {
  const hash = eventsToHash(events);
  if (hash) {
    window.location.hash = hash;
  } else {
    // Clear hash if no events
    history.replaceState(null, '', window.location.pathname + window.location.search);
  }
}
