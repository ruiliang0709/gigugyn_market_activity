import { useState, useCallback, useEffect } from 'react';
import {
  X, MapPin, Users, Calendar, Stethoscope, Sparkles, User, Wallet, Tag, FileText,
  Link as LinkIcon, ExternalLink, Plus, ChevronDown, ChevronUp,
  Trash2
} from 'lucide-react';
import type { MarketEvent, MeetingLink, ExtractedScheduleInfo } from '@/types';
import { SCALE_CONFIG, TUMOR_COLORS } from '@/types';

interface EventModalProps {
  event: MarketEvent;
  onClose: () => void;
  onUpdateLinks: (eventId: string, links: MeetingLink[]) => void;
}

export default function EventModal({ event, onClose, onUpdateLinks }: EventModalProps) {
  const scaleConfig = SCALE_CONFIG[event.scale];
  const tumorColor = TUMOR_COLORS[event.tumorType];

  // ---- Links state (synced from event prop) ----
  const [links, setLinks] = useState<MeetingLink[]>(event.links || []);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newUrl, setNewUrl] = useState('');

  // ---- Lightbox for enlarged image view ----
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [lightboxTitle, setLightboxTitle] = useState('');
  const [lightboxZoom, setLightboxZoom] = useState(1);

  // Sync links from event prop when it changes
  useEffect(() => {
    setLinks(event.links || []);
  }, [event.links]);

  // ---- Link handlers ----
  const handleAddLink = () => {
    if (!newUrl.trim()) return;
    let url = newUrl.trim();
    if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
    const link: MeetingLink = {
      id: `link-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      label: newLabel.trim() || '链接',
      url,
    };
    const updated = [...links, link];
    setLinks(updated);
    onUpdateLinks(event.id, updated);
    setNewLabel('');
    setNewUrl('');
    setShowAddForm(false);
  };

  const handleDeleteLink = (id: string) => {
    const updated = links.filter(l => l.id !== id);
    setLinks(updated);
    onUpdateLinks(event.id, updated);
  };



  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(15,37,59,0.35)', backdropFilter: 'blur(12px)' }} onClick={onClose}>
      <div className="relative w-full max-w-lg modal-enter overflow-hidden flex flex-col" style={{ background: '#fff', borderRadius: '16px', boxShadow: '0 24px 80px rgba(15,37,59,0.15)', border: '1px solid #D9D9D6', maxHeight: '85vh' }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="shrink-0">
          <div className="h-1 w-full" style={{ background: scaleConfig.gradientTop }} />
          <div className="relative px-6 pt-5 pb-4" style={{ background: `linear-gradient(135deg, ${scaleConfig.bgColor} 0%, rgba(255,255,255,0.9) 60%)` }}>
            <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full" style={{ background: '#fff', border: '1px solid #D9D9D6', color: '#28334A' }}>
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold" style={{ backgroundColor: tumorColor + '12', color: tumorColor }}>
                <Stethoscope className="w-3 h-3" />{event.tumorType}{event.ta && <span className="opacity-50">({event.ta})</span>}
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold" style={{ backgroundColor: scaleConfig.color + '10', color: scaleConfig.color }}>
                <Sparkles className="w-3 h-3" />{event.scale}
              </span>
              {event.onlineOffline && <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium" style={{ backgroundColor: '#F5F5F3', color: '#96A3AD' }}>{event.onlineOffline}</span>}
            </div>
            <h3 className="text-lg font-bold leading-snug pr-8" style={{ color: '#0F253B' }}>{event.title}</h3>
          </div>

        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {
            <div className="px-6 py-5 space-y-4">
              {/* Info grid */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { icon: Calendar, label: '活动日期', value: event.date },
                  { icon: MapPin, label: '会议地点', value: event.location },
                  { icon: Users, label: '预计规模', value: `${event.attendees || 0} 人 (${scaleConfig.label})` },
                  { icon: Sparkles, label: '活动类型', value: event.type },
                  ...(event.budget ? [{ icon: Wallet, label: '预算金额', value: `¥${event.budget.toLocaleString()}` }] : []),
                  ...(event.expCategory ? [{ icon: Tag, label: '费用类别', value: event.expCategory }] : []),
                  ...(event.hospital ? [{ icon: MapPin, label: '医院', value: event.hospital }] : []),
                  ...(event.region || event.province || event.city ? [{ icon: FileText, label: '区域信息', value: [event.region, event.province, event.city].filter(Boolean).join(' · ') }] : []),
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-2.5 p-3 rounded-lg stagger-child" style={{ background: '#fff', border: '1px solid #D9D9D6', borderRadius: '10px', animationDelay: `${i * 0.04}s` }}>
                    <item.icon className="w-4 h-4 mt-0.5 shrink-0" style={{ color: '#96A3AD' }} />
                    <div>
                      <p className="text-xs font-medium" style={{ color: '#96A3AD' }}>{item.label}</p>
                      <p className="text-sm font-semibold mt-0.5" style={{ color: '#0F253B' }}>{item.value}</p>
                    </div>
                  </div>
                ))}
              </div>

              {event.description && (
                <div className="stagger-child" style={{ animationDelay: '0.2s' }}>
                  <p className="text-xs font-bold mb-1.5" style={{ color: '#96A3AD' }}>学术策略</p>
                  <p className="text-sm leading-relaxed" style={{ color: '#28334A' }}>{event.description}</p>
                </div>
              )}

              {/* KOL / Experts */}
              {(event.speakers && event.speakers.length > 0) ? (
                <div className="stagger-child" style={{ animationDelay: '0.24s' }}>
                  <p className="text-xs font-bold mb-2" style={{ color: '#96A3AD' }}>
                    KOL / 专家
                    {event.extractedInfo && <span className="font-normal ml-1" style={{ color: '#007A80' }}>(含 AI 识别)</span>}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {event.speakers.map((s, i) => (
                      <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold" style={{ background: '#fff', border: '1px solid #D9D9D6', borderRadius: '9999px', color: '#28334A' }}>
                        <User className="w-3 h-3" />{s}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}

              {/* Scale indicator */}
              <div className="pt-1 stagger-child" style={{ animationDelay: '0.28s' }}>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold" style={{ color: '#96A3AD' }}>规模等级</span>
                  <div className="flex-1 flex items-center gap-1.5 px-2 py-1.5 rounded-full" style={{ background: '#fff', border: '1px solid #D9D9D6', borderRadius: '10px' }}>
                    {(['小型','中型','大型','超大型'] as const).map(s => (
                      <div key={s} className="h-2 flex-1 rounded-full transition-all" style={{ backgroundColor: s === event.scale ? SCALE_CONFIG[s].color : '#D9D9D6', opacity: s === event.scale ? 1 : 0.3, transform: s === event.scale ? 'scaleY(1.4)' : 'scaleY(1)' }} />
                    ))}
                  </div>
                  <span className="text-xs font-bold" style={{ color: scaleConfig.color }}>{event.scale}</span>
                </div>
              </div>

              {/* ===== Links Section ===== */}
              <div className="relative py-1">
                <div className="absolute inset-0 flex items-center"><div className="w-full" style={{ borderTop: '1px solid #D9D9D6' }} /></div>
                <div className="relative flex justify-center"><span className="px-3 text-[10px] font-bold" style={{ backgroundColor: '#fff', color: '#96A3AD' }}>会议链接</span></div>
              </div>

              <div className="stagger-child" style={{ animationDelay: '0.32s' }}>
                {links.length > 0 && (
                  <div className="space-y-2 mb-3">
                    {links.map(link => (
                      <div key={link.id} className="flex items-center gap-2 p-2.5 rounded-lg" style={{ background: '#fff', border: '1px solid #D9D9D6', borderRadius: '10px' }}>
                        <LinkIcon className="w-3.5 h-3.5 shrink-0" style={{ color: '#007A80' }} />
                        <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold truncate flex-1 hover:underline" style={{ color: '#003A70' }}>{link.label}</a>
                        <ExternalLink className="w-3 h-3 shrink-0" style={{ color: '#96A3AD' }} />
                        <button onClick={() => handleDeleteLink(link.id)} className="w-5 h-5 flex items-center justify-center" style={{ color: '#96A3AD' }}><X className="w-3 h-3" /></button>
                      </div>
                    ))}
                  </div>
                )}

                {showAddForm ? (
                  <div className="p-3 rounded-xl space-y-2" style={{ background: '#F5F5F3' }}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold" style={{ color: '#0F253B' }}>添加链接</span>
                      <button onClick={() => setShowAddForm(false)} className="w-5 h-5 flex items-center justify-center" style={{ color: '#96A3AD' }}><X className="w-3.5 h-3.5" /></button>
                    </div>
                    <input type="text" placeholder="标签，如：直播链接" value={newLabel} onChange={e => setNewLabel(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg text-xs border outline-none" style={{ borderColor: '#D9D9D6', color: '#0F253B' }}
                      onKeyDown={e => e.key === 'Enter' && handleAddLink()} />
                    <input type="text" placeholder="https://..." value={newUrl} onChange={e => setNewUrl(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg text-xs border outline-none" style={{ borderColor: '#D9D9D6', color: '#0F253B' }}
                      onKeyDown={e => e.key === 'Enter' && handleAddLink()} />
                    <button onClick={handleAddLink} disabled={!newUrl.trim()} className="w-full py-2 rounded-lg text-xs font-bold disabled:opacity-40" style={{ background: '#D62B1E', color: '#fff' }}>添加</button>
                  </div>
                ) : (
                  <button onClick={() => setShowAddForm(true)} className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-semibold" style={{ background: '#fff', border: '1px solid #D9D9D6', color: '#003A70' }}>
                    <Plus className="w-3.5 h-3.5" />添加直播 / 回放链接
                  </button>
                )}
              </div>

              {/* ===== Schedule Image — thumbnail with click to enlarge ===== */}
              {event.scheduleImage && (
                <>
                  <div className="relative py-1">
                    <div className="absolute inset-0 flex items-center"><div className="w-full" style={{ borderTop: '1px solid #D9D9D6' }} /></div>
                    <div className="relative flex justify-center"><span className="px-3 text-[10px] font-bold" style={{ backgroundColor: '#fff', color: '#96A3AD' }}>日程原图</span></div>
                  </div>
                  <button
                    onClick={() => { setLightboxImage(event.scheduleImage || null); setLightboxTitle('日程原图'); }}
                    className="w-full rounded-xl overflow-hidden relative group"
                    style={{ border: '1px solid #D9D9D6' }}
                  >
                    <img src={event.scheduleImage} alt="日程" className="w-full max-h-[200px] object-contain" style={{ background: '#F5F5F3' }} />
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: 'rgba(15,37,59,0.4)' }}>
                      <span className="text-xs font-bold text-white">点击查看大图</span>
                    </div>
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ===== Lightbox for enlarged image view ===== */}
      {lightboxImage && (
        <div className="fixed inset-0 z-[60] flex flex-col" style={{ background: 'rgba(15,37,59,0.9)', backdropFilter: 'blur(12px)' }} onClick={(e) => e.stopPropagation()}>
          {/* Top bar — title + close */}
          <div className="shrink-0 flex items-center justify-between px-4 py-3" style={{ background: 'rgba(15,37,59,0.6)' }} onClick={(e) => e.stopPropagation()}>
            <p className="text-xs font-bold text-white truncate pr-4" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.5)' }}>{lightboxTitle}</p>
            <button onClick={() => { setLightboxImage(null); setLightboxZoom(1); }} className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'rgba(255,255,255,0.15)', color: '#fff' }}>
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Image — fills available space */}
          <div className="flex-1 overflow-auto flex items-center justify-center min-h-0" onClick={(e) => { e.stopPropagation(); if (e.target === e.currentTarget) { setLightboxImage(null); setLightboxZoom(1); } }}>
            <img
              src={lightboxImage}
              alt={lightboxTitle}
              onClick={(e) => e.stopPropagation()}
              className="rounded-lg"
              style={{
                width: lightboxZoom === 1 ? 'auto' : `${lightboxZoom * 100}%`,
                height: lightboxZoom === 1 ? '100%' : 'auto',
                maxWidth: lightboxZoom === 1 ? '100%' : 'none',
                maxHeight: lightboxZoom === 1 ? '100%' : 'none',
                objectFit: 'contain',
                padding: '8px',
              }}
            />
          </div>

          {/* Bottom toolbar — zoom controls (always visible on mobile) */}
          <div className="shrink-0 flex items-center justify-center gap-3 px-4 py-3" style={{ background: 'rgba(15,37,59,0.6)', paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }} onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setLightboxZoom(z => Math.max(0.5, Math.round((z - 0.1) * 100) / 100))} className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-lg font-bold" style={{ background: 'rgba(255,255,255,0.2)' }}>−</button>
            <span className="text-xs font-bold text-white w-12 text-center">{Math.round(lightboxZoom * 100)}%</span>
            <button onClick={() => setLightboxZoom(z => Math.min(1.5, Math.round((z + 0.1) * 100) / 100))} className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-lg font-bold" style={{ background: 'rgba(255,255,255,0.2)' }}>+</button>
            <button onClick={() => setLightboxZoom(1)} className="px-3 h-10 rounded-xl flex items-center justify-center text-white text-xs font-bold" style={{ background: 'rgba(255,255,255,0.2)' }}>还原</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---- Collapsible Section Block ----
function SectionBlock({ icon: Icon, title, color, children }: {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  title: string;
  color: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div className="rounded-xl overflow-hidden" style={{ background: '#F5F5F3', border: '1px solid #D9D9D6' }}>
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between px-3.5 py-2.5">
        <div className="flex items-center gap-2">
          <Icon className="w-3.5 h-3.5" style={{ color }} />
          <span className="text-xs font-bold" style={{ color: '#0F253B' }}>{title}</span>
        </div>
        {open ? <ChevronUp className="w-3.5 h-3.5" style={{ color: '#96A3AD' }} /> : <ChevronDown className="w-3.5 h-3.5" style={{ color: '#96A3AD' }} />}
      </button>
      {open && <div className="px-3.5 pb-3.5">{children}</div>}
    </div>
  );
}


