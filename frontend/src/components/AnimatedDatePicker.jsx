import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/** 'YYYY-MM-DD' -> local Date (never parse with new Date(str), that is UTC). */
const parseISO = (value) => {
  if (!value) return null;
  const [y, m, d] = String(value).slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
};

const toISO = (date) => {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

const isSameDay = (a, b) =>
  a && b && a.getFullYear() === b.getFullYear()
  && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

/**
 * Calendar popover replacing <input type="date">, which renders differently in
 * every browser and cannot be animated. Value in/out is a 'YYYY-MM-DD' string.
 */
export function AnimatedDatePicker({
  value,
  onChange,
  placeholder = 'Pick a date',
  className = '',
  error = false,
  allowClear = true,
}) {
  const selected = useMemo(() => parseISO(value), [value]);
  const today = useMemo(() => {
    const t = new Date();
    return new Date(t.getFullYear(), t.getMonth(), t.getDate());
  }, []);

  const [open, setOpen] = useState(false);
  const [rect, setRect] = useState(null);
  const [cursor, setCursor] = useState(selected ?? today);
  const [direction, setDirection] = useState(0);

  const triggerRef = useRef(null);
  const panelRef = useRef(null);

  const measure = useCallback(() => {
    if (triggerRef.current) setRect(triggerRef.current.getBoundingClientRect());
  }, []);

  useEffect(() => {
    if (open) setCursor(selected ?? today);
  }, [open, selected, today]);

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

  // Leading blanks + every day of the displayed month
  const cells = useMemo(() => {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const firstWeekday = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    return [
      ...Array.from({ length: firstWeekday }, () => null),
      ...Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1)),
    ];
  }, [cursor]);

  const shiftMonth = (delta) => {
    setDirection(delta);
    setCursor((c) => new Date(c.getFullYear(), c.getMonth() + delta, 1));
  };

  const choose = (date) => {
    onChange(toISO(date));
    setOpen(false);
  };

  const PANEL_HEIGHT = 348;
  const spaceBelow = rect ? window.innerHeight - rect.bottom : 0;
  const dropUp = rect && spaceBelow < PANEL_HEIGHT + 12 && rect.top > PANEL_HEIGHT;

  const label = selected
    ? selected.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
    : placeholder;

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
        <span className={`truncate ${selected ? 'text-gray-900' : 'text-gray-400'}`}>{label}</span>
        <CalendarIcon className="h-4 w-4 flex-shrink-0 text-gray-400" />
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
                left: Math.min(rect.left, window.innerWidth - 312),
                width: 300,
                zIndex: 90,
              }}
              className="rounded-2xl bg-white border border-gray-200 shadow-2xl p-4"
            >
              {/* Month header */}
              <div className="flex items-center justify-between mb-3">
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => shiftMonth(-1)}
                  className="h-8 w-8 rounded-lg flex items-center justify-center text-gray-500 hover:bg-gray-100"
                >
                  <ChevronLeft className="h-4 w-4" />
                </motion.button>

                <div className="relative h-6 flex-1 overflow-hidden">
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.div
                      key={`${cursor.getFullYear()}-${cursor.getMonth()}`}
                      initial={{ opacity: 0, x: direction > 0 ? 18 : -18 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: direction > 0 ? -18 : 18 }}
                      transition={{ duration: 0.18 }}
                      className="absolute inset-0 text-center font-bold text-gray-900 text-sm leading-6"
                    >
                      {MONTHS[cursor.getMonth()]} {cursor.getFullYear()}
                    </motion.div>
                  </AnimatePresence>
                </div>

                <motion.button
                  type="button"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => shiftMonth(1)}
                  className="h-8 w-8 rounded-lg flex items-center justify-center text-gray-500 hover:bg-gray-100"
                >
                  <ChevronRight className="h-4 w-4" />
                </motion.button>
              </div>

              {/* Weekday row */}
              <div className="grid grid-cols-7 mb-1">
                {WEEKDAYS.map((d) => (
                  <div key={d} className="text-center text-[10px] font-bold text-gray-400 uppercase py-1">
                    {d}
                  </div>
                ))}
              </div>

              {/* Day grid */}
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={`grid-${cursor.getFullYear()}-${cursor.getMonth()}`}
                  initial={{ opacity: 0, x: direction > 0 ? 24 : -24 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: direction > 0 ? -24 : 24 }}
                  transition={{ duration: 0.18, ease: 'easeOut' }}
                  className="grid grid-cols-7 gap-0.5"
                >
                  {cells.map((date, i) => {
                    if (!date) return <div key={`blank-${i}`} />;

                    const isSelected = isSameDay(date, selected);
                    const isToday = isSameDay(date, today);

                    return (
                      <motion.button
                        key={date.getDate()}
                        type="button"
                        whileHover={{ scale: 1.12 }}
                        whileTap={{ scale: 0.92 }}
                        onClick={() => choose(date)}
                        className={`relative h-9 rounded-lg text-sm transition-colors
                          ${isSelected
                            ? 'bg-indigo-700 text-white font-bold shadow-md'
                            : isToday
                              ? 'text-indigo-700 font-bold hover:bg-indigo-50'
                              : 'text-gray-700 hover:bg-gray-100'}`}
                      >
                        {date.getDate()}
                        {isToday && !isSelected && (
                          <span className="absolute bottom-1 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-indigo-600" />
                        )}
                      </motion.button>
                    );
                  })}
                </motion.div>
              </AnimatePresence>

              {/* Quick actions */}
              <div className="flex items-center justify-between mt-3 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => choose(today)}
                  className="text-xs font-semibold text-indigo-700 hover:underline"
                >
                  Today
                </button>
                {allowClear && value && (
                  <button
                    type="button"
                    onClick={() => { onChange(''); setOpen(false); }}
                    className="text-xs font-semibold text-gray-400 hover:text-gray-600"
                  >
                    Clear
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}

export default AnimatedDatePicker;
