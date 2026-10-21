import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';

const TONES = {
  danger: {
    icon: Trash2,
    iconWrap: 'bg-red-50 text-red-600',
    confirm: 'bg-red-600 hover:bg-red-700 text-white',
    ring: 'focus-visible:ring-red-300',
  },
  warning: {
    icon: AlertTriangle,
    iconWrap: 'bg-amber-50 text-amber-600',
    confirm: 'bg-amber-500 hover:bg-amber-600 text-white',
    ring: 'focus-visible:ring-amber-300',
  },
};

/**
 * Replacement for window.confirm().
 *
 * Cancel is focused on open, so hitting Enter by reflex does not destroy
 * anything. Escape and a click on the backdrop both cancel.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  detail,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  tone = 'danger',
  loading = false,
  onConfirm,
  onCancel,
}) {
  const cancelRef = useRef(null);
  const { icon: Icon, iconWrap, confirm, ring } = TONES[tone] ?? TONES.danger;

  useEffect(() => {
    if (!open) return;

    const onKey = (e) => {
      if (e.key === 'Escape' && !loading) onCancel?.();
    };
    window.addEventListener('keydown', onKey);

    // Let the entrance animation start before stealing focus
    const id = requestAnimationFrame(() => cancelRef.current?.focus());

    return () => {
      window.removeEventListener('keydown', onKey);
      cancelAnimationFrame(id);
    };
  }, [open, loading, onCancel]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16 }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !loading) onCancel?.();
          }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
        >
          <motion.div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 340, damping: 28 }}
            className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden"
          >
            <div className="p-7">
              <div className="flex gap-4">
                <motion.div
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.08, type: 'spring', stiffness: 400, damping: 20 }}
                  className={`h-12 w-12 rounded-xl flex items-center justify-center flex-shrink-0 ${iconWrap}`}
                >
                  <Icon className="h-6 w-6" />
                </motion.div>

                <div className="min-w-0 pt-0.5">
                  <h2 id="confirm-title" className="text-lg font-extrabold text-gray-900">
                    {title}
                  </h2>
                  {description && (
                    <p className="text-sm text-gray-500 mt-1.5 leading-relaxed">
                      {description}
                    </p>
                  )}
                </div>
              </div>

              {detail && (
                <div className="mt-4 ml-16 rounded-xl bg-gray-50 border border-gray-200 px-4 py-3">
                  {detail}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 px-7 py-4 bg-gray-50 border-t">
              <Button
                ref={cancelRef}
                variant="ghost"
                onClick={onCancel}
                disabled={loading}
                className="h-11 rounded-xl px-6 text-gray-600 hover:bg-gray-200 hover:text-gray-900"
              >
                {cancelLabel}
              </Button>
              <Button
                onClick={onConfirm}
                disabled={loading}
                className={`h-11 rounded-xl px-7 ${confirm} ${ring}`}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {confirmLabel}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default ConfirmDialog;
