import { AlertTriangle } from 'lucide-react';
import Modal from './Modal';

// Reusable "are you sure?" dialog built on the existing Modal component, used
// in place of window.confirm() for consequential actions (delete, etc.) so
// confirmation looks and behaves like the rest of the app instead of a
// browser-native popup.
const ConfirmDialog = ({
  open,
  title = 'Are you sure?',
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'danger', // 'danger' | 'default'
  loading = false,
  onConfirm,
  onCancel,
}) => (
  <Modal
    open={open}
    onClose={onCancel}
    title={title}
    footer={
      <>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 rounded-xl text-sm font-medium text-ledger-500 hover:bg-ledger-100"
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={loading}
          className={`px-4 py-2 rounded-xl text-sm font-medium text-white disabled:opacity-60 ${
            tone === 'danger' ? 'bg-ineligible hover:bg-ineligible/90' : 'bg-brand hover:bg-brand-deep'
          }`}
        >
          {loading ? 'Working…' : confirmLabel}
        </button>
      </>
    }
  >
    <div className="flex items-start gap-3">
      {tone === 'danger' && <AlertTriangle size={20} className="mt-0.5 shrink-0 text-ineligible" aria-hidden="true" />}
      <p className="text-sm text-ledger-700">{message}</p>
    </div>
  </Modal>
);

export default ConfirmDialog;
