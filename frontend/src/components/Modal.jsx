import { X } from 'lucide-react';

const Modal = ({ open, onClose, title, children, footer, maxWidth = 'max-w-lg' }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ledger-950/50 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative bg-white rounded-2xl shadow-xl w-full ${maxWidth} fade-up max-h-[90vh] flex flex-col`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-ledger-100">
          <h3 className="font-display text-lg text-ledger-900">{title}</h3>
          <button onClick={onClose} className="text-ledger-400 hover:text-ledger-900 transition-colors">
            <X size={18} />
          </button>
        </div>
        <div className="px-6 py-5 overflow-y-auto scrollbar-thin">{children}</div>
        {footer && <div className="px-6 py-4 border-t border-ledger-100 flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
};

export default Modal;
