import { X } from 'lucide-react';
import type { MarketEvent } from '@/types';
import { SCALE_CONFIG, TUMOR_COLORS } from '@/types';

interface DayEventsSheetProps { date: string; events: MarketEvent[]; onSelectEvent: (evt: MarketEvent) => void; onClose: () => void; }

export default function DayEventsSheet({ date, events, onSelectEvent, onClose }: DayEventsSheetProps) {
  const [y, m, d] = date.split('-');
  const weekdays = ['周日','周一','周二','周三','周四','周五','周六'];
  const weekday = weekdays[new Date(date + 'T00:00:00').getDay()];
  const label = `${y}年${m}月${d}日 ${weekday}`;

  return (
    <div className="fixed inset-0 z-[60] flex flex-col justify-end backdrop-fade backdrop-swiss" onClick={onClose}>
      <div className="w-full sheet-swiss sheet-up" onClick={(e) => e.stopPropagation()} style={{ maxHeight: '75vh' }}>
        <div className="flex justify-center pt-3 pb-1"><div className="drag-handle-swiss" /></div>
        <div className="flex items-center justify-between px-5 pb-3" style={{ borderBottom: '1px solid var(--cloud-gray)' }}>
          <div>
            <h3 className="text-base font-bold" style={{ color: 'var(--oxford-blue)' }}>{label}</h3>
            <p className="text-xs" style={{ color: 'var(--slate-gray)' }}>共 {events.length} 场活动</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center btn-swiss rounded-full" style={{ color: 'var(--midnight-blue)' }}><X className="w-4 h-4" /></button>
        </div>
        <div className="overflow-y-auto px-4 py-3 space-y-3" style={{ maxHeight: 'calc(75vh - 80px)' }}>
          {events.map((evt, i) => {
            const cfg = SCALE_CONFIG[evt.scale]; const tumorColor = TUMOR_COLORS[evt.tumorType];
            return (
              <button key={evt.id} onClick={() => { onSelectEvent(evt); onClose(); }} className="w-full text-left rounded-xl p-4 stagger-child card-swiss-hover" style={{ animationDelay: `${i * 0.05}s` }}>
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold" style={{ backgroundColor: cfg.color + '12', color: cfg.color }}>{evt.scale}</span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold" style={{ backgroundColor: tumorColor + '10', color: tumorColor }}>{evt.tumorType}</span>
                  {evt.ta && <span className="px-2 py-0.5 rounded text-[10px] font-medium" style={{ backgroundColor: '#F5F5F3', color: 'var(--slate-gray)' }}>{evt.ta}</span>}
                </div>
                <p className="text-sm font-bold leading-snug" style={{ color: 'var(--oxford-blue)' }}>{evt.title}</p>
                <div className="flex items-center gap-3 mt-2 flex-wrap">
                  <span className="text-[11px]" style={{ color: 'var(--slate-gray)' }}>{evt.location}</span>
                  {evt.attendees && <span className="text-[11px]" style={{ color: 'var(--slate-gray)' }}>{evt.attendees}人</span>}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
