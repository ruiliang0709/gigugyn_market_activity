import { useState, useCallback } from 'react';
import { X, Upload, CheckCircle, AlertCircle, FileText } from 'lucide-react';
import type { MarketEvent } from '@/types';
import { parseUserCSV } from '@/lib/csvParser';

interface ImportModalProps { onClose: () => void; onImport: (events: MarketEvent[]) => void; existingEvents: MarketEvent[]; }

export default function ImportModal({ onClose, onImport, existingEvents }: ImportModalProps) {
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [importStats, setImportStats] = useState<{ success: number; total: number; errors: string[] } | null>(null);
  const [detectedCols, setDetectedCols] = useState<string[] | null>(null);

  const processFile = useCallback((file: File) => {
    setError(null); setSuccess(false); setImportStats(null); setDetectedCols(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        if (file.name.endsWith('.json')) {
          const data = JSON.parse(content); const arr = Array.isArray(data) ? data : [data];
          if (arr.length === 0) { setError('JSON 数据为空'); return; }
          mergeAndImport(arr);
        } else if (file.name.endsWith('.csv') || file.name.endsWith('.txt')) {
          const result = parseUserCSV(content);
          if (result.errors.length > 0 && result.events.length === 0) {
            const lines = content.split(/\r?\n/).filter((l) => l.trim());
            if (lines.length > 0) { const delim = lines[0].includes('\t') ? '\t' : ','; const headers = lines[0].split(delim).map((h) => h.trim()); setDetectedCols(headers); }
          }
          setImportStats({ success: result.events.length, total: result.events.length + result.errors.length, errors: result.errors });
          if (result.events.length === 0) { setError(`未能导入任何数据。\n${result.errors.slice(0, 5).join('\n')}`); return; }
          mergeAndImport(result.events);
        } else { setError('不支持的文件格式'); }
      } catch { setError('文件解析失败'); }
    };
    reader.readAsText(file);
  }, [existingEvents, onImport]);

  const mergeAndImport = (newEvents: any[]) => {
    const merged = [...existingEvents];
    newEvents.forEach((newEvt: any) => {
      const normalized = { ...newEvt, id: newEvt.id || `imported-${Date.now()}-${Math.random().toString(36).slice(2,8)}`, scale: newEvt.scale || '中型' };
      const dupIndex = merged.findIndex((e) => e.title === normalized.title && e.date === normalized.date);
      if (dupIndex >= 0) merged[dupIndex] = normalized as MarketEvent; else merged.push(normalized as MarketEvent);
    });
    onImport(merged); setSuccess(true);
  };

  const handleDrop = (e: React.DragEvent) => { e.preventDefault(); setDragOver(false); const file = e.dataTransfer.files[0]; if (file) processFile(file); };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-fade backdrop-swiss" onClick={onClose}>
      <div className="relative w-full max-w-lg modal-swiss modal-enter overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg, #007A80, #003A70, #007A80)' }} />
        <div className="px-6 pt-5 pb-4">
          <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center btn-swiss rounded-full" style={{ color: 'var(--midnight-blue)' }}><X className="w-4 h-4" /></button>
          <h3 className="text-xl font-bold pr-8" style={{ color: 'var(--oxford-blue)' }}>导入活动数据</h3>
          <p className="text-sm mt-1" style={{ color: 'var(--slate-gray)' }}>支持 CSV 或 JSON 格式</p>
        </div>
        <div className="px-6">
          {success ? (
            <div className="flex flex-col items-center py-10 modal-enter">
              <div className="w-14 h-14 rounded-full flex items-center justify-center mb-3 card-inner-swiss" style={{ color: '#007A80' }}><CheckCircle className="w-7 h-7" /></div>
              <p className="text-base font-bold" style={{ color: 'var(--oxford-blue)' }}>导入成功！</p>
              {importStats && <p className="text-xs mt-1" style={{ color: 'var(--slate-gray)' }}>共 {importStats.total} 条数据</p>}
            </div>
          ) : (
            <>
              <label onDrop={handleDrop} onDragOver={(e) => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)}
                className="cursor-pointer border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center transition-all block"
                style={{ borderColor: dragOver ? '#D62B1E' : 'var(--cloud-gray)', backgroundColor: dragOver ? 'rgba(214,43,30,0.02)' : 'transparent' }}>
                <div className="w-12 h-12 rounded-full flex items-center justify-center mb-3 transition-all card-inner-swiss" style={{ color: dragOver ? '#D62B1E' : 'var(--slate-gray)' }}>
                  <Upload className="w-5 h-5" />
                </div>
                <p className="text-sm font-bold" style={{ color: 'var(--oxford-blue)' }}>点击或拖拽文件到此处</p>
                <p className="text-xs mt-1" style={{ color: 'var(--slate-gray)' }}>支持 .csv / .json</p>
                <input type="file" accept=".json,.csv,.txt" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) processFile(file); }} />
              </label>
              {error && (
                <div className="mt-3 p-3 rounded-lg card-inner-swiss">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" style={{ color: '#D62B1E' }} />
                    <p className="text-xs whitespace-pre-line" style={{ color: '#D62B1E' }}>{error}</p>
                  </div>
                  {detectedCols && (
                    <div className="mt-2 pt-2" style={{ borderTop: '1px solid var(--cloud-gray)' }}>
                      <p className="text-xs font-bold mb-1" style={{ color: '#D62B1E' }}>检测到的表头:</p>
                      <div className="flex flex-wrap gap-1">{detectedCols.map((h, i) => <span key={i} className="px-1.5 py-0.5 rounded text-[10px]" style={{ backgroundColor: 'rgba(214,43,30,0.08)', color: '#D62B1E' }}>{h || '(空)'}</span>)}</div>
                    </div>
                  )}
                </div>
              )}
              <div className="mt-4 p-3 rounded-lg" style={{ background: 'rgba(0,122,128,0.06)', border: '1px solid rgba(0,122,128,0.15)' }}>
                <p className="text-[11px] leading-relaxed" style={{ color: '#007A80' }}>
                  备注：请把 Tina 的市场活动模板文件转成 CSV 文件后，删除前两行空白列后导入，或者直接使用下载模板进行填写。
                </p>
              </div>
              <div className="mt-4 pb-6">
                <p className="text-xs font-bold mb-2" style={{ color: 'var(--slate-gray)' }}>下载模板</p>
                <div className="flex flex-wrap gap-2">
                  <DownloadButton label="CSV 模板" icon={<FileText className="w-3.5 h-3.5" />} />
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function DownloadButton({ label, icon }: { label: string; icon: React.ReactNode }) {
  const handleClick = () => {
    const rows = [
      ['序号','中央','主要负责人','活动负责人','是否由区域执行','总监区域','大区','TA','学术策略','活动名称','月份','日期','省份','城市','活动类型','Exp Category','On/Offline/Combine','医院','KOL','覆盖客户数','金额'],
      ['1','中央区域合办','郭也','卢艳秋','Y','中区','中区','EC','S1:国际认证，全线医保，晚期食管癌治疗首选','食管癌质控','4','11','湖北','随州','线下系列会 1','三方系列会','Offline','武汉协和医院','李宝生','30','75000']
    ];
    const csv = '\uFEFF' + rows.map((r) => r.map(c => '"' + String(c).replace(/"/g, '""') + '"').join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '活动导入模板.csv';
    a.click();
    URL.revokeObjectURL(url);
  };
  return <button onClick={handleClick} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold btn-swiss" style={{ color: 'var(--midnight-blue)' }}>{icon}{label}</button>;
}
