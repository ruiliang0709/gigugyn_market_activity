import { X, AlertTriangle } from 'lucide-react';

interface ConfirmModalProps {
  title: string; message: string; confirmText: string; cancelText?: string;
  onConfirm: () => void; onCancel: () => void;
}

export default function ConfirmModal({ title, message, confirmText, cancelText = '取消', onConfirm, onCancel }: ConfirmModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-fade backdrop-swiss" onClick={onCancel}>
      <div className="relative w-full max-w-sm modal-swiss modal-enter overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg, #D62B1E, #B3333B, #D62B1E)' }} />
        <div className="flex justify-center pt-6 pb-2">
          <div className="w-14 h-14 rounded-full flex items-center justify-center relative card-inner-swiss" style={{ color: '#D62B1E' }}>
            <AlertTriangle className="w-7 h-7" />
            <span className="absolute inset-0 rounded-full" style={{ border: '1px solid #D62B1E', animation: 'pulse-ring 1.8s ease-out infinite', opacity: 0.2 }} />
          </div>
        </div>
        <h3 className="text-center text-lg font-bold px-6" style={{ color: 'var(--oxford-blue)' }}>{title}</h3>
        <p className="text-center text-sm px-8 mt-2 leading-relaxed" style={{ color: 'var(--midnight-blue)' }}>{message}</p>
        <div className="flex gap-3 px-6 py-6 mt-2">
          <button onClick={onCancel} className="flex-1 py-2.5 rounded-lg text-xs font-bold btn-swiss" style={{ color: 'var(--midnight-blue)' }}>{cancelText}</button>
          <button onClick={onConfirm} className="flex-1 py-2.5 rounded-lg text-xs font-bold btn-primary-swiss">{confirmText}</button>
        </div>
        <button onClick={onCancel} className="absolute top-4 right-4 w-7 h-7 flex items-center justify-center btn-swiss rounded-full" style={{ color: 'var(--slate-gray)' }}>
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
