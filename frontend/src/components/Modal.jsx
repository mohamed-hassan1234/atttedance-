import { X } from 'lucide-react';

// Bottom sheet on phones, centered dialog from sm: up.
const Modal = ({ open, onClose, title, children, footer, maxWidth = 'max-w-lg' }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-ledger-950/50 backdrop-blur-sm" onClick={onClose} />
      <div role="dialog" aria-modal="true" aria-label={title} className={`relative flex max-h-[92vh] w-full ${maxWidth} fade-up flex-col rounded-t-2xl bg-white shadow-xl sm:max-h-[90vh] sm:rounded-xl`}>
        <div className="flex items-center justify-between border-b border-ledger-100 px-5 py-4 sm:px-6">
          <h3 className="font-display text-lg font-semibold tracking-tight text-brand-dark">{title}</h3>
          <button onClick={onClose} aria-label="Close" className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100">
            <X size={18} />
          </button>
        </div>
        <div className="scrollbar-thin overflow-y-auto px-5 py-5 sm:px-6">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-ledger-100 bg-slate-50/60 px-5 py-4 sm:px-6">{footer}</div>}
      </div>
    </div>
  );
};

export default Modal;
