import { useState, useMemo, useCallback, useEffect } from 'react';
import {
  ChevronLeft, ChevronRight, ChevronDown, ChevronUp,
  CalendarDays, Download, Upload, Save, RotateCcw,
  Trash2, FileX, Sparkles
} from 'lucide-react';
import type { MarketEvent, MeetingLink, ExtractedScheduleInfo } from '@/types';
import { SCALE_CONFIG } from '@/types';
import EventModal from '@/components/EventModal';
import ImportModal from '@/components/ImportModal';
import ConfirmModal from '@/components/ConfirmModal';
import DayEventsSheet from '@/components/DayEventsSheet';
import MobileEventList from '@/components/MobileEventList';
import AIChatPanel from '@/components/AIChatPanel';
import { useAIChat } from '@/hooks/useAIChat';

interface CalendarSectionProps {
  events: MarketEvent[];
  savedEvents: MarketEvent[];
  onImport: (events: MarketEvent[]) => void;
  onSave: () => void;
  onDiscard: () => void;
  onDeletePage: (year: number, month: number) => void;
  onDeleteAll: () => void;
  onUpdateLinks: (eventId: string, links: MeetingLink[]) => void;
  onUpdateAIResult: (eventId: string, newLinks: MeetingLink[], newSpeakers: string[], extractedInfo: ExtractedScheduleInfo, scheduleImage?: string) => void;
  onClearAIResult: (eventId: string) => void;
  hasChanges: boolean;
}

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];
const MONTH_NAMES = ['一月','二月','三月','四月','五月','六月','七月','八月','九月','十月','十一月','十二月'];
const SCALE_OPTIONS = ['全部', '小型', '中型', '大型', '超大型'];

// Get today's date as YYYY-MM-DD string (local time, no Date objects)
function getTodayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

// Extract day number from YYYY-MM-DD string
function getDayNum(dateStr: string): number {
  return parseInt(dateStr.slice(8, 10), 10);
}

const TODAY_STR = getTodayStr();

type DeleteTarget = 'page' | 'all' | null;

export default function CalendarSection({
  events, savedEvents, onImport, onSave, onDiscard,
  onDeletePage, onDeleteAll, onUpdateLinks, onUpdateAIResult, onClearAIResult, hasChanges
}: CalendarSectionProps) {
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [selectedEvent, setSelectedEvent] = useState<MarketEvent | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [filterTumor, setFilterTumor] = useState('全部');
  const [filterScale, setFilterScale] = useState('全部');
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget>(null);
  const [sheetDay, setSheetDay] = useState<{ date: string; events: MarketEvent[] } | null>(null);
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);
  const [showAI, setShowAI] = useState(false);

  // Sync selectedEvent when events prop updates (e.g. after AI result is deleted)
  useEffect(() => {
    if (selectedEvent) {
      const updated = events.find(e => e.id === selectedEvent.id);
      if (updated) {
        setSelectedEvent(updated);
      }
    }
  }, [events]);

  // ---- AI Chat ----
  const {
    messages: aiMessages,
    isStreaming: aiIsStreaming,
    inputValue: aiInputValue,
    setInputValue: setAiInputValue,
    sendMessage: sendAiMessage,
    stopStreaming: stopAiStreaming,
    clearMessages: clearAiMessages,
  } = useAIChat();

  // ---- Filtered by tumor + scale ----
  const filteredEvents = useMemo(() => {
    if (filterTumor === '全部' && filterScale === '全部') return events;
    return events.filter((e) => {
      return (filterTumor === '全部' || e.tumorType === filterTumor) &&
             (filterScale === '全部' || e.scale === filterScale);
    });
  }, [events, filterTumor, filterScale]);

  // ---- Current month events (string compare, no Date objects) ----
  const monthEvents = useMemo(() => {
    const prefix = `${year}-${String(month).padStart(2, '0')}`;
    return filteredEvents.filter((e) => e.date.startsWith(prefix));
  }, [filteredEvents, year, month]);

  // ---- Week breakdown ----
  const weeks = useMemo(() => {
    const firstDay = new Date(year, month - 1, 1).getDay();
    const daysInMonth = new Date(year, month, 0).getDate();
    const result: Array<{ weekNum: number; startDate: number; endDate: number; hasEvents: boolean }> = [];
    let wn = 1, cd = 1;
    const fe = Math.min(7 - firstDay, daysInMonth);
    result.push({ weekNum: wn, startDate: 1, endDate: fe, hasEvents: monthEvents.some(e => getDayNum(e.date) <= fe) });
    cd = fe + 1; wn++;
    while (cd + 6 <= daysInMonth) {
      const s = cd, e = cd + 6;
      result.push({ weekNum: wn, startDate: s, endDate: e, hasEvents: monthEvents.some(ev => { const d = getDayNum(ev.date); return d >= s && d <= e; }) });
      cd += 7; wn++;
    }
    if (cd <= daysInMonth) {
      result.push({ weekNum: wn, startDate: cd, endDate: daysInMonth, hasEvents: monthEvents.some(e => getDayNum(e.date) >= cd) });
    }
    return result;
  }, [year, month, monthEvents]);

  // ---- Week-filtered events ----
  const weekFilteredEvents = useMemo(() => {
    if (selectedWeek === null) return monthEvents;
    const w = weeks.find(x => x.weekNum === selectedWeek);
    if (!w) return monthEvents;
    return monthEvents.filter((e) => { const d = getDayNum(e.date); return d >= w.startDate && d <= w.endDate; });
  }, [monthEvents, selectedWeek, weeks]);

  // ---- Calendar grid data ----
  const calendarDays = useMemo(() => {
    const startDay = new Date(year, month - 1, 1).getDay();
    const daysInMonth = new Date(year, month, 0).getDate();
    const monthPrefix = `${year}-${String(month).padStart(2, '0')}`;
    const days: Array<{ date: number; events: MarketEvent[]; isToday: boolean }> = [];
    for (let i = 0; i < startDay; i++) days.push({ date: 0, events: [], isToday: false });
    for (let d = 1; d <= daysInMonth; d++) {
      const ds = `${monthPrefix}-${String(d).padStart(2, '0')}`;
      days.push({ date: d, events: weekFilteredEvents.filter(e => e.date === ds), isToday: ds === TODAY_STR });
    }
    return days;
  }, [year, month, weekFilteredEvents]);

  // Tumor types for filters
  const tumorTypes = useMemo(() => {
    const types = new Set(events.map(e => e.tumorType));
    return ['全部', ...Array.from(types).sort()];
  }, [events]);

  // ---- Handlers ----
  const toggleExpand = useCallback((key: string) => {
    setExpandedDays(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; });
  }, []);

  const prevMonth = useCallback(() => { if (month === 1) { setMonth(12); setYear(y => y - 1); } else { setMonth(m => m - 1); } setSelectedWeek(null); }, [month]);
  const nextMonth = useCallback(() => { if (month === 12) { setMonth(1); setYear(y => y + 1); } else { setMonth(m => m + 1); } setSelectedWeek(null); }, [month]);

  const exportData = useCallback(() => {
    const blob = new Blob([JSON.stringify(events, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `market-events-${year}-${String(month).padStart(2, '0')}.json`; a.click(); URL.revokeObjectURL(url);
  }, [events, year, month]);

  const currentMonthCount = monthEvents.length;
  const confirmDeletePage = useCallback(() => { onDeletePage(year, month); setDeleteTarget(null); }, [onDeletePage, year, month]);
  const confirmDeleteAll = useCallback(() => { onDeleteAll(); setDeleteTarget(null); }, [onDeleteAll]);

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#FFFFFF' }}>
      {/* Top Bar */}
      <div className="sticky top-0 z-30 px-3 sm:px-4 lg:px-6 py-2.5" style={{ background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderBottom: '1px solid #D9D9D6' }}>
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: '#D62B1E' }}>
              <CalendarDays className="w-4 h-4 text-white" />
            </div>
            <span className="text-xs sm:text-sm font-bold whitespace-nowrap" style={{ color: '#0F253B' }}>市场活动计划</span>
            {savedEvents.length > 0 && <span className="text-[9px] px-2 py-0.5 rounded-full font-semibold shrink-0" style={{ background: 'rgba(150,163,173,0.15)', color: '#96A3AD' }}>{savedEvents.length}</span>}
          </div>
          <div className="flex items-center gap-1.5">
            {hasChanges && (
              <>
                <button onClick={onSave} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] sm:text-xs font-bold text-white" style={{ background: '#D62B1E', boxShadow: '0 2px 8px rgba(214,43,30,0.25)' }} title="保存"><Save className="w-3 h-3" /><span className="hidden sm:inline">保存</span></button>
                <button onClick={onDiscard} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] sm:text-xs font-bold" style={{ background: '#fff', border: '1px solid #D9D9D6', color: '#96A3AD' }} title="撤销"><RotateCcw className="w-3 h-3" /><span className="hidden sm:inline">撤销</span></button>
              </>
            )}
            {savedEvents.length > 0 && !hasChanges && (
              <>
                <button onClick={() => setDeleteTarget('page')} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] sm:text-xs font-bold" style={{ background: '#fff', border: '1px solid #D9D9D6', color: '#D62B1E' }} title="删除本月"><FileX className="w-3 h-3" /><span className="hidden sm:inline">删本页</span></button>
                <button onClick={() => setDeleteTarget('all')} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] sm:text-xs font-bold" style={{ background: '#fff', border: '1px solid #D9D9D6', color: '#B3333B' }} title="删除全部"><Trash2 className="w-3 h-3" /><span className="hidden sm:inline">删全部</span></button>
              </>
            )}
            <button onClick={() => setShowImport(true)} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] sm:text-xs font-bold" style={{ background: '#fff', border: '1px solid #D9D9D6', color: '#003A70' }}><Upload className="w-3 h-3" /><span className="hidden sm:inline">导入</span></button>
            <button onClick={exportData} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] sm:text-xs font-bold" style={{ background: '#fff', border: '1px solid #D9D9D6', color: '#0F253B' }}><Download className="w-3 h-3" /><span className="hidden sm:inline">导出</span></button>
          </div>
        </div>
      </div>

      {/* Unsaved banner */}
      {hasChanges && (
        <div className="max-w-7xl mx-auto px-4 mt-4">
          <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl" style={{ background: 'rgba(255,199,43,0.15)' }}>
            <span className="text-xs" style={{ color: '#B8860B' }}>当前数据尚未保存，刷新页面后将丢失。请确认无误后点击「保存」。</span>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6">
        {/* Month selector - visible on ALL screen sizes */}
        <div className="flex items-center gap-2 mb-4">
          <button onClick={prevMonth} className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-full shrink-0" style={{ background: '#fff', border: '1px solid #D9D9D6' }}>
            <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: '#0F253B' }} />
          </button>
          <div className="text-center min-w-[100px]">
            <p className="text-base sm:text-xl font-bold whitespace-nowrap" style={{ color: '#0F253B' }}>{year}年 {MONTH_NAMES[month - 1]}</p>
          </div>
          <button onClick={nextMonth} className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-full shrink-0" style={{ background: '#fff', border: '1px solid #D9D9D6' }}>
            <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: '#0F253B' }} />
          </button>
          <span className="text-[11px] sm:text-xs ml-1 whitespace-nowrap font-medium" style={{ color: '#96A3AD' }}>{weekFilteredEvents.length} 场</span>
        </div>

        {/* Desktop Filters */}
        <div className="hidden sm:flex flex-wrap items-center gap-2 mb-5">
          <span className="text-xs font-semibold" style={{ color: '#96A3AD' }}>瘤种：</span>
          {tumorTypes.map((t) => (
            <button key={t} onClick={() => setFilterTumor(t)} className="px-3 py-1 rounded-full text-xs font-semibold transition-all"
              style={{ background: filterTumor === t ? '#D62B1E' : '#fff', color: filterTumor === t ? '#fff' : '#28334A', border: `1px solid ${filterTumor === t ? '#D62B1E' : '#D9D9D6'}` }}>{t}</button>
          ))}
          <div className="w-px h-4 mx-1" style={{ background: '#D9D9D6' }} />
          <span className="text-xs font-semibold" style={{ color: '#96A3AD' }}>规模：</span>
          {SCALE_OPTIONS.map((s) => (
            <button key={s} onClick={() => setFilterScale(s)} className="px-3 py-1 rounded-full text-xs font-semibold transition-all"
              style={{ background: filterScale === s ? '#0F253B' : '#fff', color: filterScale === s ? '#fff' : '#28334A', border: `1px solid ${filterScale === s ? '#0F253B' : '#D9D9D6'}` }}>{s}</button>
          ))}
        </div>

        {/* Mobile list */}
        <MobileEventList events={events} weekFilteredEvents={weekFilteredEvents} selectedWeek={selectedWeek} weeks={weeks}
          onSelectEvent={setSelectedEvent} onSelectWeek={setSelectedWeek} filterTumor={filterTumor} filterScale={filterScale}
          onFilterTumor={setFilterTumor} onFilterScale={setFilterScale} />

        {/* Desktop Empty */}
        {events.length === 0 && (
          <div className="hidden sm:flex flex-col items-center justify-center py-20">
            <div className="w-16 h-16 rounded-xl flex items-center justify-center mb-4" style={{ background: '#fff', border: '1px solid #D9D9D6', color: '#96A3AD' }}>
              <CalendarDays className="w-8 h-8" />
            </div>
            <p className="text-base font-semibold" style={{ color: '#28334A' }}>暂无活动数据</p>
            <p className="text-xs mt-1" style={{ color: '#96A3AD' }}>点击右上角「导入数据」上传你的活动计划</p>
          </div>
        )}

        {/* Desktop Calendar */}
        {events.length > 0 && (
          <div className="hidden sm:block overflow-hidden" style={{ background: '#fff', borderRadius: '12px', border: '1px solid #D9D9D6', boxShadow: '0 2px 12px rgba(15,37,59,0.06)' }}>
            <div className="grid grid-cols-7" style={{ borderBottom: '1px solid #D9D9D6' }}>
              {WEEKDAYS.map((d) => <div key={d} className="py-3 text-center text-xs font-bold" style={{ color: '#96A3AD' }}>周{d}</div>)}
            </div>
            <div className="grid grid-cols-7">
              {calendarDays.map((day, idx) => {
                if (day.date === 0) {
                  return <div key={`e${idx}`} className="min-h-[90px] lg:min-h-[110px]" style={{ borderRight: '1px solid #F0F1EE', borderBottom: '1px solid #F0F1EE', background: '#FAFAF9' }} />;
                }
                const hasEvents = day.events.length > 0;
                const dayKey = `${year}-${month}-${day.date}`;
                return (
                  <div key={day.date} className="min-h-[72px] sm:min-h-[90px] lg:min-h-[110px] p-1 sm:p-1.5 lg:p-2 relative group select-none"
                    style={{ borderRight: '1px solid #F0F1EE', borderBottom: '1px solid #F0F1EE', background: day.isToday ? 'rgba(214,43,30,0.03)' : 'transparent', cursor: hasEvents ? 'pointer' : 'default', borderRadius: 8, margin: 1 }}
                  >
                    <div className="flex items-center justify-between mb-0.5 sm:mb-1">
                      <span className={`text-[10px] sm:text-xs font-bold w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center rounded-full ${day.isToday ? 'text-white' : ''}`}
                        style={{ color: day.isToday ? '#fff' : '#0F253B', background: day.isToday ? '#D62B1E' : 'transparent' }}>{day.date}</span>
                      {hasEvents && <span className="text-[9px] sm:text-[10px] font-semibold hidden sm:inline" style={{ color: '#96A3AD' }}>{day.events.length}场</span>}
                    </div>
                    <div className="hidden sm:block space-y-0.5 sm:space-y-1">
                      {(expandedDays.has(dayKey) ? day.events : day.events.slice(0, 3)).map((evt) => {
                        const cfg = SCALE_CONFIG[evt.scale];
                        return (
                          <button key={evt.id} onClick={(e) => { e.stopPropagation(); setSelectedEvent(evt); }}
                            className="w-full text-left px-1.5 sm:px-2 py-0.5 rounded-md text-[10px] lg:text-xs font-semibold block"
                            style={{ background: cfg.bgColor, color: cfg.color, borderLeft: `3px solid ${cfg.color}` }}>
                            <span className="block leading-tight" style={{ wordBreak: 'break-all', overflowWrap: 'break-word' }}>{evt.tumorType} · {evt.title}</span>
                          </button>
                        );
                      })}
                      {day.events.length > 3 && (
                        <button onClick={(e) => { e.stopPropagation(); toggleExpand(dayKey); }}
                          className="w-full inline-flex items-center justify-center gap-0.5 text-[10px] py-0.5 rounded" style={{ color: '#96A3AD' }}>
                          {expandedDays.has(dayKey) ? <><ChevronUp className="w-3 h-3" /> 收起</> : <><ChevronDown className="w-3 h-3" /> +{day.events.length - 3}</>}
                        </button>
                      )}
                    </div>
                    <div className="flex sm:hidden flex-wrap gap-1 mt-0.5">
                      {day.events.slice(0, 4).map((evt, i) => <div key={i} className="rounded-full" style={{ width: 6, height: 6, background: SCALE_CONFIG[evt.scale].color }} />)}
                      {day.events.length > 4 && <span className="text-[8px]" style={{ color: '#96A3AD' }}>+{day.events.length - 4}</span>}
                    </div>
                    {hasEvents && (
                      <div className="absolute bottom-1 right-1 hidden sm:flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        {day.events.map((evt, i) => <div key={i} className="rounded-full" style={{ width: SCALE_CONFIG[evt.scale].dotSize * 0.5, height: SCALE_CONFIG[evt.scale].dotSize * 0.5, background: SCALE_CONFIG[evt.scale].color }} />)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Legend */}
        {events.length > 0 && (
          <div className="hidden sm:flex mt-5 flex-wrap items-center justify-center gap-5">
            <div className="flex items-center gap-3 px-5 py-2.5 rounded-xl" style={{ background: '#fff', border: '1px solid #D9D9D6', borderRadius: '10px' }}>
              {(['小型','中型','大型','超大型'] as const).map((s) => (
                <div key={s} className="flex items-center gap-1.5">
                  <div className="rounded-full" style={{ width: SCALE_CONFIG[s].dotSize, height: SCALE_CONFIG[s].dotSize, background: SCALE_CONFIG[s].color }} />
                  <span className="text-[11px] font-semibold" style={{ color: '#28334A' }}>{s}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Overlays */}
      {sheetDay && <DayEventsSheet date={sheetDay.date} events={sheetDay.events} onSelectEvent={setSelectedEvent} onClose={() => setSheetDay(null)} />}
      {selectedEvent && <EventModal event={selectedEvent} onClose={() => setSelectedEvent(null)} onUpdateLinks={onUpdateLinks} onUpdateAIResult={onUpdateAIResult} onClearAIResult={onClearAIResult} />}
      {showImport && <ImportModal onClose={() => setShowImport(false)} onImport={(evts) => { setShowImport(false); onImport(evts); }} existingEvents={events} />}
      {deleteTarget === 'page' && <ConfirmModal title="删除本页数据" message={`确定要删除 ${year}年${MONTH_NAMES[month - 1]} 的所有活动数据吗？共 ${currentMonthCount} 场活动。`} confirmText="确认删除" onConfirm={confirmDeletePage} onCancel={() => setDeleteTarget(null)} />}
      {deleteTarget === 'all' && <ConfirmModal title="删除所有数据" message={`确定要删除全部 ${savedEvents.length} 条活动数据吗？`} confirmText="确认删除全部" onConfirm={confirmDeleteAll} onCancel={() => setDeleteTarget(null)} />}

      {/* AI Assistant */}
      {!showAI && events.length > 0 && (
        <button
          onClick={() => setShowAI(true)}
          className="fixed bottom-5 right-5 z-40 w-12 h-12 rounded-xl flex items-center justify-center shadow-lg transition-all hover:scale-105 active:scale-95"
          style={{
            background: "linear-gradient(135deg, #003A70, #007A80)",
            boxShadow: "0 4px 16px rgba(0,58,112,0.3)",
          }}
          title="AI 智能助手"
        >
          <Sparkles className="w-5 h-5 text-white" />
        </button>
      )}
      {showAI && (
        <AIChatPanel
          isOpen={showAI}
          onClose={() => setShowAI(false)}
          messages={aiMessages}
          isStreaming={aiIsStreaming}
          inputValue={aiInputValue}
          onInputChange={setAiInputValue}
          onSend={sendAiMessage}
          onStop={stopAiStreaming}
          onClear={clearAiMessages}
        />
      )}
    </div>
  );
}
