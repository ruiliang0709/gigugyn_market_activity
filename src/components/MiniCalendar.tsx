import { ChevronLeft, ChevronRight } from 'lucide-react';

interface MiniCalendarProps {
  year: number;
  month: number; // 1-12
  daysWithEvents: Set<string>;
  onSelectDate: (d: { year: number; month: number }) => void;
}

const WEEKDAYS_SHORT = ['日', '一', '二', '三', '四', '五', '六'];

export default function MiniCalendar({ year, month, daysWithEvents, onSelectDate }: MiniCalendarProps) {
  const firstDay = new Date(year, month - 1, 1);
  const daysInMonth = new Date(year, month, 0).getDate();
  const startDay = firstDay.getDay(); // 0=Sun

  const today = new Date();
  const isTodayMonth = today.getFullYear() === year && today.getMonth() + 1 === month;
  const todayDate = today.getDate();

  const days: Array<{ num: number; hasEvents: boolean; isToday: boolean } | null> = [];

  for (let i = 0; i < startDay; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    days.push({
      num: d,
      hasEvents: daysWithEvents.has(dateStr),
      isToday: isTodayMonth && d === todayDate,
    });
  }

  return (
    <div className="rounded-xl p-3" style={{ backgroundColor: '#ffffff', boxShadow: '0 1px 4px rgba(3,45,66,0.06)', width: 210 }}>
      {/* Month nav */}
      <div className="flex items-center justify-between mb-2">
        <button
          onClick={() => onSelectDate({ year: month === 1 ? year - 1 : year, month: month === 1 ? 12 : month - 1 })}
          className="w-5 h-5 flex items-center justify-center rounded hover:bg-gray-100 transition-colors"
        >
          <ChevronLeft className="w-3 h-3" style={{ color: '#657f94' }} />
        </button>
        <span className="text-xs font-bold" style={{ color: '#032d42' }}>
          {year}年{month}月
        </span>
        <button
          onClick={() => onSelectDate({ year: month === 12 ? year + 1 : year, month: month === 12 ? 1 : month + 1 })}
          className="w-5 h-5 flex items-center justify-center rounded hover:bg-gray-100 transition-colors"
        >
          <ChevronRight className="w-3 h-3" style={{ color: '#657f94' }} />
        </button>
      </div>

      {/* Week headers */}
      <div className="grid grid-cols-7 gap-0.5 mb-1">
        {WEEKDAYS_SHORT.map((d) => (
          <div key={d} className="text-center text-[9px] font-medium py-0.5" style={{ color: '#657f94' }}>
            {d}
          </div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7 gap-0.5">
        {days.map((day, idx) => {
          if (!day) return <div key={`e-${idx}`} className="w-6 h-6" />;
          return (
            <div
              key={day.num}
              className="w-6 h-6 flex items-center justify-center rounded text-[10px] font-medium relative"
              style={{
                color: day.isToday ? '#ffffff' : '#032d42',
                backgroundColor: day.isToday ? '#f65834' : 'transparent',
              }}
            >
              {day.num}
              {day.hasEvents && !day.isToday && (
                <span
                  className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full"
                  style={{ backgroundColor: '#f65834' }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
