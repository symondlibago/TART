import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock } from 'lucide-react';

/** '18:30' or '18:30:00' -> { hour12, minute, period } */
const parseTime = (value) => {
  if (!value) return null;
  const [h, m] = String(value).split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return {
    hour12: h % 12 === 0 ? 12 : h % 12,
    minute: m,
    period: h >= 12 ? 'PM' : 'AM',
  };
};

const to24h = ({ hour12, minute, period }) => {
  let h = hour12 % 12;
  if (period === 'PM') h += 12;
  return `${String(h).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
};

const HOURS = Array.from({ length: 12 }, (_, i) => i + 1);
const BASE_MINUTES = Array.from({ length: 12 }, (_, i) => i * 5);

/**
 * Time popover replacing <input type="time">. Value in/out is 24h 'HH:MM'.
 * Minutes step by 5, but an existing off-step value stays selectable so
 * editing an event never silently changes its time.
 */
export function AnimatedTimePicker({
  value,
  onChange,
  placeholder = 'Pick a time',
  className = '',
  error = false,
}) {
  const parsed = useMemo(() => parseTime(value), [value]);
  const [open, setOpen] = useState(false);
  const [rect, setRect] = useState(null);

  const triggerRef = useRef(null);
  const panelRef = useRef(null);

  const minutes = useMemo(() => {
    if (parsed && !BASE_MINUTES.includes(parsed.minute)) {
      return [...BASE_MINUTES, parsed.minute].sort((a, b) => a - b);
    }
    return BASE_MINUTES;
  }, [parsed]);

  const measure = useCallback(() => {
    if (triggerRef.current) setRect(triggerRef.current.getBoundingClientRect());
  }, []);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e) => {
      if (!triggerRef.current?.contains(e.target) && !panelRef.current?.contains(e.target)) {
        setOpen(false);
      }
    };
    const onKey = (e) => e.key === 'Escape' && setOpen(false);

    window.addEventListener('mousedown', onPointerDown);
    window.addEventListener('keydown', onKey);
    window.addEventListener('scroll', measure, true);
    window.addEventListener('resize', measure);
    return () => {
      window.removeEventListener('mousedown', onPointerDown);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', measure, true);
      window.removeEventListener('resize', measure);
    };
  }, [open, measure]);

  // Default to 6:00 PM so a first click does not need all three columns
  const current = parsed ?? { hour12: 6, minute: 0, period: 'PM' };

  const patch = (changes) => onChange(to24h({ ...current, ...changes }));

  const PANEL_HEIGHT = 250;
  const spaceBelow = rect ? window.innerHeight - rect.bottom : 0;
  const dropUp = rect && spaceBelow < PANEL_HEIGHT + 12 && rect.top > PANEL_HEIGHT;

  const label = parsed
    ? `${parsed.hour12}:${String(parsed.minute).padStart(2, '0')} ${parsed.period}`
    : placeholder;

  const columnClass = 'flex-1 overflow-y-auto max-h-[190px] px-1 space-y-0.5 scroll-smooth';
  const cellClass = (active) =>
    `w-full rounded-lg py-1.5 text-sm transition-colors ${
      active ? 'bg-indigo-700 text-white font-bold' : 'text-gray-700 hover:bg-gray-100'
    }`;

  return (
    <div className={`relative ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => { if (!open) measure(); setOpen((o) => !o); }}
        className={`w-full flex items-center justify-between gap-2 px-4 py-2.5 border rounded-xl text-sm bg-white text-left outline-none transition
          focus:ring-2 focus:ring-indigo-200
          ${error ? 'border-red-400 bg-red-50' : open ? 'border-indigo-400' : 'border-gray-300 hover:border-gray-400'}`}
      >
        <span className={`truncate ${parsed ? 'text-gray-900' : 'text-gray-400'}`}>{label}</span>
        <Clock className="h-4 w-4 flex-shrink-0 text-gray-400" />
      </button>

      {createPortal(
        <AnimatePresence>
          {open && rect && (
            <motion.div
              ref={panelRef}
              initial={{ opacity: 0, y: dropUp ? 6 : -6, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: dropUp ? 4 : -4, scale: 0.98 }}
              transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
              style={{
                position: 'fixed',
                top: dropUp ? undefined : rect.bottom + 6,
                bottom: dropUp ? window.innerHeight - rect.top + 6 : undefined,
                left: Math.min(rect.left, window.innerWidth - 232),
                width: 220,
                zIndex: 90,
              }}
              className="rounded-2xl bg-white border border-gray-200 shadow-2xl p-3"
            >
              <div className="flex gap-1">
                {/* Hours */}
                <div className={columnClass}>
                  {HOURS.map((h) => (
                    <motion.button
                      key={h}
                      type="button"
                      whileTap={{ scale: 0.94 }}
                      onClick={() => patch({ hour12: h })}
                      className={cellClass(current.hour12 === h)}
                    >
                      {h}
                    </motion.button>
                  ))}
                </div>

                {/* Minutes */}
                <div className={columnClass}>
                  {minutes.map((m) => (
                    <motion.button
                      key={m}
                      type="button"
                      whileTap={{ scale: 0.94 }}
                      onClick={() => patch({ minute: m })}
                      className={cellClass(current.minute === m)}
                    >
                      {String(m).padStart(2, '0')}
                    </motion.button>
                  ))}
                </div>

                {/* AM / PM */}
                <div className="flex flex-col gap-0.5 px-1 w-14">
                  {['AM', 'PM'].map((p) => (
                    <motion.button
                      key={p}
                      type="button"
                      whileTap={{ scale: 0.94 }}
                      onClick={() => patch({ period: p })}
                      className={cellClass(current.period === p)}
                    >
                      {p}
                    </motion.button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end mt-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="text-xs font-semibold text-indigo-700 hover:underline"
                >
                  Done
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}

export default AnimatedTimePicker;
