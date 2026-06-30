import { useState, useCallback, useEffect } from 'react';
import CalendarSection from '@/sections/CalendarSection';
import { trpc } from '@/providers/trpc';
import type { MarketEvent, MeetingLink, ExtractedScheduleInfo } from '@/types';
import { seedEvents } from '@/data/seedEvents';

const LS_KEY = 'market_events_v2';

function lsLoad(): MarketEvent[] | null {
  try {
    const r = localStorage.getItem(LS_KEY);
    return r ? JSON.parse(r) : null;
  } catch { return null; }
}
function lsSave(v: MarketEvent[]) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(v)); } catch { /* noop */ }
}

function App() {
  const utils = trpc.useUtils();

  // DB query with loading state
  const { data: dbEvents = [], isLoading: dbLoading, error: dbError } = trpc.event.list.useQuery(undefined, {
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

  // Local state
  const [localEvents, setLocalEvents] = useState<MarketEvent[]>([]);
  const [pendingEvents, setPendingEvents] = useState<MarketEvent[] | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [dbHasData, setDbHasData] = useState(false);

  // ===== Determine initial data source =====
  // Priority: DB > imported data > localStorage > seedEvents
  useEffect(() => {
    if (dbLoading) return; // Wait for DB query

    // DB has data → use DB (source of truth)
    if (dbEvents.length > 0) {
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
      setLocalEvents(converted);
      setDbHasData(true);
      lsSave(converted);
      return;
    }

    // DB is empty → try localStorage (for returning users)
    const lsData = lsLoad();
    if (lsData && lsData.length > 0) {
      // Check if localStorage has real data (not just seeds)
      const hasRealData = lsData.some(e => !e.id.startsWith('seed-'));
      if (hasRealData) {
        setLocalEvents(lsData);
        // Save to DB silently
        fetch('/api/events/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ events: lsData }),
        }).catch(() => {});
        return;
      }
    }

    // Nothing found → use seed events as fallback
    // But mark them as "imported" so they can be saved to DB
    const seedWithNewIds = seedEvents.map(e => ({
      ...e,
      id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    }));
    setLocalEvents(seedWithNewIds);
    setDbHasData(false);
  }, [dbLoading, dbEvents]);

  const savedEvents = pendingEvents !== null ? pendingEvents : localEvents;

  const handleImport = useCallback((events: MarketEvent[]) => {
    setPendingEvents(events);
    setHasChanges(true);
    lsSave(events);
  }, []);

  const handleUpdateLinks = useCallback((eventId: string, links: MeetingLink[]) => {
    const base = pendingEvents !== null ? pendingEvents : localEvents;
    const updated = base.map(e => e.id === eventId ? { ...e, links } : e);
    if (pendingEvents !== null) {
      setPendingEvents(updated);
    } else {
      setLocalEvents(updated);
    }
    lsSave(updated);

    if (pendingEvents === null) {
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

    // 1. Save to localStorage
    lsSave(toSave);
    setLocalEvents(toSave);
    setPendingEvents(null);
    setHasChanges(false);

    // 2. Save to DB
    fetch('/api/events/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ events: toSave }),
    }).then(r => r.json()).then(data => {
      console.log('[handleSave] DB result:', data);
      if (data.count > 0) {
        utils.event.list.invalidate();
        setDbHasData(true);
      }
    }).catch(err => console.error('[handleSave] Error:', err));
  }, [pendingEvents, localEvents, utils]);

  const handleDiscard = useCallback(() => {
    setPendingEvents(null);
    setHasChanges(false);
  }, []);

  const handleDeletePage = useCallback((year: number, month: number) => {
    const remaining = localEvents.filter(e => {
      const d = e.date;
      return !(d.startsWith(`${year}-${String(month).padStart(2, '0')}`)));
    });
    setLocalEvents(remaining);
    lsSave(remaining);
    setHasChanges(true);
    deleteByMonth.mutate({ year, month });
  }, [localEvents, deleteByMonth]);

  const handleDeleteAll = useCallback(() => {
    setLocalEvents([]);
    setPendingEvents([]);
    lsSave([]);
    setHasChanges(true);
  }, []);

  // ---- Merged AI result update ----
  const handleUpdateAIResult = useCallback((eventId: string, newLinks: MeetingLink[], newSpeakers: string[], extractedInfo: ExtractedScheduleInfo, scheduleImage?: string) => {
    const base = pendingEvents !== null ? pendingEvents : localEvents;
    const updated = base.map(e => {
      if (e.id !== eventId) return e;
      const existingSpeakers = new Set(e.speakers || []);
      const mergedSpeakers = [...(e.speakers || [])];
      for (const name of newSpeakers) {
        if (!existingSpeakers.has(name)) mergedSpeakers.push(name);
      }
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
      const cleanedLinks = (e.links || []).filter(l => !l.id.startsWith('link-ai-'));
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
