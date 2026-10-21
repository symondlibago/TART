import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Check } from 'lucide-react';

/**
 * Dropdown to replace the native <select>, which cannot be styled or animated.
 *
 * The panel renders in a portal so it is never clipped by a scrolling modal,
 * and it is positioned against the trigger's viewport rect.
 */
export function AnimatedSelect({
  value,
  onChange,
  options,
  placeholder = 'Select...',
  className = '',
  error = false,
}) {
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const [rect, setRect] = useState(null);
  const triggerRef = useRef(null);
  const panelRef = useRef(null);

  const selected = options.find((o) => o.value === value);

  const measure = useCallback(() => {
    if (triggerRef.current) {
      setRect(triggerRef.current.getBoundingClientRect());
    }
  }, []);

  const openMenu = () => {
    measure();
    setHighlight(options.findIndex((o) => o.value === value));
    setOpen(true);
  };

  // Close on outside click, and keep the panel glued to the trigger while
  // the page scrolls or resizes underneath it.
  useEffect(() => {
    if (!open) return;

    const onPointerDown = (e) => {
      if (
        !triggerRef.current?.contains(e.target) &&
        !panelRef.current?.contains(e.target)
      ) {
        setOpen(false);
      }
    };

    window.addEventListener('mousedown', onPointerDown);
    window.addEventListener('scroll', measure, true);
    window.addEventListener('resize', measure);
    return () => {
      window.removeEventListener('mousedown', onPointerDown);
      window.removeEventListener('scroll', measure, true);
      window.removeEventListener('resize', measure);
    };
  }, [open, measure]);

  const choose = (option) => {
    onChange(option.value);
    setOpen(false);
    triggerRef.current?.focus();
  };

  const onKeyDown = (e) => {
    if (!open) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        openMenu();
      }
      return;
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight((i) => (i + 1) % options.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((i) => (i - 1 + options.length) % options.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (options[highlight]) choose(options[highlight]);
    } else if (e.key === 'Tab') {
      setOpen(false);
    }
  };

  // Flip above the trigger when there is not enough room below
  const panelHeight = Math.min(options.length * 44 + 12, 280);
  const spaceBelow = rect ? window.innerHeight - rect.bottom : 0;
  const dropUp = rect && spaceBelow < panelHeight + 12 && rect.top > panelHeight;

  return (
    <div className={`relative ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => (open ? setOpen(false) : openMenu())}
        onKeyDown={onKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`w-full flex items-center justify-between gap-2 px-4 py-2.5 border rounded-xl text-sm bg-white text-left outline-none transition
          focus:ring-2 focus:ring-indigo-200
          ${error ? 'border-red-400 bg-red-50' : open ? 'border-indigo-400' : 'border-gray-300 hover:border-gray-400'}`}
      >
        <span className={`flex items-center gap-2 truncate ${selected ? 'text-gray-900' : 'text-gray-400'}`}>
          {selected?.color && (
            <span
              className="h-2.5 w-2.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: selected.color }}
            />
          )}
          {selected ? selected.label : placeholder}
        </span>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="flex-shrink-0 text-gray-400"
        >
          <ChevronDown className="h-4 w-4" />
        </motion.span>
      </button>

      {createPortal(
        <AnimatePresence>
          {open && rect && (
            <motion.ul
              ref={panelRef}
              role="listbox"
              initial={{ opacity: 0, y: dropUp ? 6 : -6, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: dropUp ? 4 : -4, scale: 0.98 }}
              transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
              style={{
                position: 'fixed',
                top: dropUp ? undefined : rect.bottom + 6,
                bottom: dropUp ? window.innerHeight - rect.top + 6 : undefined,
                left: rect.left,
                width: rect.width,
                maxHeight: 280,
                zIndex: 90,
              }}
              className="overflow-auto rounded-xl bg-white border border-gray-200 shadow-2xl p-1.5"
            >
              {options.map((option, i) => {
                const isSelected = option.value === value;
                return (
                  <motion.li
                    key={option.value}
                    role="option"
                    aria-selected={isSelected}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03, duration: 0.16 }}
                    onMouseEnter={() => setHighlight(i)}
                    onClick={() => choose(option)}
                    className={`flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg text-sm cursor-pointer select-none transition-colors
                      ${highlight === i ? 'bg-indigo-50 text-indigo-900' : 'text-gray-700'}`}
                  >
                    <span className="flex items-center gap-2.5 truncate">
                      {option.color && (
                        <span
                          className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: option.color }}
                        />
                      )}
                      <span className={isSelected ? 'font-semibold' : ''}>{option.label}</span>
                    </span>
                    {isSelected && (
                      <motion.span
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 28 }}
                      >
                        <Check className="h-4 w-4 text-indigo-600" />
                      </motion.span>
                    )}
                  </motion.li>
                );
              })}
            </motion.ul>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}

export default AnimatedSelect;
