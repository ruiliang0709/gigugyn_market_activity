import { useState, useCallback, useEffect } from 'react';
import CalendarSection from '@/sections/CalendarSection';
import { trpc } from '@/providers/trpc';
import type { MarketEvent, MeetingLink, ExtractedScheduleInfo } from '@/types';
import { seedEvents } from '@/data/seedEvents';

const LS_KEY = 'market_events_v2';
const SEED_LOADED_KEY = 'market_events_seed_loaded';

function lsLoad(): MarketEvent[] {
  try {
    const r = localStorage.getItem(LS_KEY);
    if (r) return JSON.parse(r);
    // If no local data, load seed events as default
    const seedLoaded = localStorage.getItem(SEED_LOADED_KEY);
    if (!seedLoaded) {
      localStorage.setItem(SEED_LOADED_KEY, 'true');
      localStorage.setItem(LS_KEY, JSON.stringify(seedEvents));
    }
    return seedEvents;
  } catch { return seedEvents; }
}
function lsSave(v: MarketEvent[]) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(v)); } catch { /* noop */ }
}

function App() {
  const utils = trpc.useUtils();

  // DB query - background, never blocks rendering
  // refetchInterval polls every 10s for cross-device sync (phone <-> desktop)
  const { data: dbEvents = [] } = trpc.event.list.useQuery(undefined, {
    staleTime: 5_000,
    retry: 1,
    refetchInterval: 10_000,
  });

  const bulkCreate = trpc.event.bulkCreate.useMutation({
    onSuccess: () => utils.event.list.invalidate(),
  });

  const deleteByMonth = trpc.event.deleteByMonth.useMutation({
    onSuccess: () => utils.event.list.invalidate(),
  });

  // Local state: always primary source of truth
  const [localEvents, setLocalEvents] = useState<MarketEvent[]>(lsLoad);
  const [pendingEvents, setPendingEvents] = useState<MarketEvent[] | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // ===== Sync DB data to local state (cross-device) =====
  // DB is source of truth. When DB data differs from local, update local.
  // This enables cross-device sync: data saved on device A appears on device B.
  useEffect(() => {
    if (dbEvents.length === 0) return; // Keep local data when DB is empty

    const converted: MarketEvent[] = dbEvents.map((e) => ({
      id: e.id.toString(), title: e.title, date: e.date,
      tumorType: e.tumorType as MarketEvent['tumorType'],
      location: e.location, scale: e.scale as MarketEvent['scale'],
      type: e.type, description: e.description || '',
      speakers: e.speakers || undefined, attendees: e.attendees || undefined,
      budget: e.budget || undefined, onlineOffline: e.onlineOffline as MarketEvent['onlineOffline'] || undefined,
      ta: e.ta || undefined, expCategory: e.expCategory || undefined,
      region: e.region || undefined, province: e.province || undefined,
      city: e.city || undefined, hospital: e.hospital || undefined,
      kol: e.kol || undefined, links: e.links || undefined,
      scheduleText: e.scheduleText || undefined,
      scheduleImage: e.scheduleImage || undefined,
      extractedInfo: e.extractedInfo || undefined,
    }));

    // Check if DB data differs from local (compare by JSON stringify)
    const dbJson = JSON.stringify(converted);
    const localJson = JSON.stringify(localEvents);
    if (dbJson !== localJson) {
      console.log('[Sync] DB data differs from local, updating...');
      setLocalEvents(converted);
      // Don't save large scheduleImage to localStorage (QuotaExceededError)
      const forLs = converted.map(e => ({
        ...e,
        scheduleImage: e.scheduleImage && e.scheduleImage.length > 100 ? '[IMAGE_IN_DB]' as any : e.scheduleImage,
      }));
      lsSave(forLs);
    }
  }, [dbEvents]); // Re-run when DB data changes (content or count)

  const savedEvents = pendingEvents !== null ? pendingEvents : localEvents;

  const handleImport = useCallback((events: MarketEvent[]) => {
    setPendingEvents(events);
    setHasChanges(true);
    lsSave(events);
  }, []);

  const handleUpdateLinks = useCallback((eventId: string, links: MeetingLink[]) => {
    // 1. Update display state
    const base = pendingEvents !== null ? pendingEvents : localEvents;
    const updated = base.map(e => e.id === eventId ? { ...e, links } : e);
    if (pendingEvents !== null) {
      setPendingEvents(updated);
    } else {
      setLocalEvents(updated);
    }
    lsSave(updated);

    // 2. Auto-save to DB only when NOT in pending import state
    // When user has imported data pending, link changes are saved together
    // with the import data when they click the Save button
    if (pendingEvents === null) {
      // Use direct fetch (not tRPC bulkCreate) to handle large scheduleImage base64
      fetch('/api/events/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events: updated }),
      }).then(r => r.json()).then(data => {
        console.log('[saveEvents] Result:', data);
        if (data.count > 0) utils.event.list.invalidate();
      }).catch(err => console.error('[saveEvents] Error:', err));
    }
  }, [pendingEvents, localEvents, bulkCreate, utils]);

  const handleSave = useCallback(() => {
    const toSave = pendingEvents !== null ? pendingEvents : localEvents;

    // 1. Save to localStorage (reliable)
    lsSave(toSave);
    setLocalEvents(toSave);
    setPendingEvents(null);
    setHasChanges(false);

    // 2. Save to DB via direct fetch (bypasses tRPC batch for large images)
    fetch('/api/events/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ events: toSave }),
    }).then(r => r.json()).then(data => {
      console.log('[handleSave] DB result:', data);
      if (data.count > 0) utils.event.list.invalidate();
    }).catch(err => console.error('[handleSave] Error:', err));
  }, [pendingEvents, localEvents, utils]);

  const handleDiscard = useCallback(() => {
    setPendingEvents(null);
    setHasChanges(false);
  }, []);

  const handleDeletePage = useCallback((year: number, month: number) => {
    // Delete from local state immediately
    const remaining = localEvents.filter(e => {
      const d = e.date;
      return !(d.startsWith(`${year}-${String(month).padStart(2, '0')}`));
    });
    setLocalEvents(remaining);
    lsSave(remaining);
    setHasChanges(true);
    // Also try DB
    deleteByMonth.mutate({ year, month });
  }, [localEvents, deleteByMonth]);

  const handleDeleteAll = useCallback(() => {
    setLocalEvents([]);
    setPendingEvents([]);
    lsSave([]);
    setHasChanges(true);
    // DB clear handled by backend bulkCreate with empty array on next save
  }, []);

  // ---- Merged AI result update: updates links + speakers + extractedInfo + image in one go ----
  const handleUpdateAIResult = useCallback((eventId: string, newLinks: MeetingLink[], newSpeakers: string[], extractedInfo: ExtractedScheduleInfo, scheduleImage?: string) => {
    const base = pendingEvents !== null ? pendingEvents : localEvents;
    const updated = base.map(e => {
      if (e.id !== eventId) return e;
      // Merge speakers (dedup)
      const existingSpeakers = new Set(e.speakers || []);
      const mergedSpeakers = [...(e.speakers || [])];
      for (const name of newSpeakers) {
        if (!existingSpeakers.has(name)) mergedSpeakers.push(name);
      }
      // Merge links (dedup by url)
      const existingUrls = new Set((e.links || []).map(l => l.url));
      const mergedLinks = [...(e.links || [])];
      for (const link of newLinks) {
        if (!existingUrls.has(link.url)) mergedLinks.push(link);
      }
      return { ...e, speakers: mergedSpeakers, links: mergedLinks, scheduleText: '[图片识别]', scheduleImage, extractedInfo };
    });
    if (pendingEvents !== null) {
      setPendingEvents(updated);
    } else {
      setLocalEvents(updated);
    }
    lsSave(updated);

    if (pendingEvents === null) {
      // Use direct fetch (not tRPC bulkCreate) to handle large scheduleImage base64
      fetch('/api/events/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events: updated }),
      }).then(r => r.json()).then(data => {
        console.log('[saveEvents] Result:', data);
        if (data.count > 0) utils.event.list.invalidate();
      }).catch(err => console.error('[saveEvents] Error:', err));
    }
  }, [pendingEvents, localEvents, bulkCreate, utils]);

  // ---- Clear AI recognition result ----
  const handleClearAIResult = useCallback((eventId: string) => {
    const base = pendingEvents !== null ? pendingEvents : localEvents;
    const updated = base.map(e => {
      if (e.id !== eventId) return e;
      // Remove AI-added links (those with id starting with 'link-ai-')
      const cleanedLinks = (e.links || []).filter(l => !l.id.startsWith('link-ai-'));
      // Remove speakers that were added by AI (those in extractedInfo)
      const aiSpeakers = new Set([...(e.extractedInfo?.chairmen || []), ...(e.extractedInfo?.speakers || [])]);
      const cleanedSpeakers = (e.speakers || []).filter(s => !aiSpeakers.has(s));
      return {
        ...e,
        links: cleanedLinks,
        speakers: cleanedSpeakers,
        scheduleText: undefined,
        scheduleImage: undefined,
        extractedInfo: undefined,
      };
    });
    if (pendingEvents !== null) {
      setPendingEvents(updated);
    } else {
      setLocalEvents(updated);
    }
    lsSave(updated);

    if (pendingEvents === null) {
      // Use direct fetch (not tRPC bulkCreate) to handle large scheduleImage base64
      fetch('/api/events/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events: updated }),
      }).then(r => r.json()).then(data => {
        console.log('[saveEvents] Result:', data);
        if (data.count > 0) utils.event.list.invalidate();
      }).catch(err => console.error('[saveEvents] Error:', err));
    }
  }, [pendingEvents, localEvents, bulkCreate, utils]);

  return (
    <div className="relative w-full min-h-screen" style={{ backgroundColor: '#FFFFFF' }}>
      <CalendarSection
        events={savedEvents}
        savedEvents={localEvents}
        onImport={handleImport}
        onSave={handleSave}
        onDiscard={handleDiscard}
        onDeletePage={handleDeletePage}
        onDeleteAll={handleDeleteAll}
        onUpdateLinks={handleUpdateLinks}
        onUpdateAIResult={handleUpdateAIResult}
        onClearAIResult={handleClearAIResult}
        hasChanges={hasChanges}
      />
    </div>
  );
}

export default App;
