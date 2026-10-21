// Single source of truth for event statuses.
// Must stay in sync with App\Models\Event in the Laravel backend.

/** Decided by the calendar, never stored as a final answer. */
export const AUTO_STATUSES = ['Not Yet Started', 'Ongoing', 'Pending'];

/** Decided by a person; the calendar never overwrites these. */
export const TERMINAL_STATUSES = ['Completed', 'Cancelled'];

export const EVENT_STATUSES = [...AUTO_STATUSES, ...TERMINAL_STATUSES];

/** Sent to the API to mean "let the date decide". */
export const AUTO = 'Auto';

// hex for inline dots/charts, tailwind classes for badges
export const STATUS_META = {
  'Not Yet Started': {
    color: '#64748b',
    badge: 'bg-slate-50 text-slate-700 ring-slate-600/20',
  },
  Ongoing: {
    color: '#3b82f6',
    badge: 'bg-blue-50 text-blue-700 ring-blue-600/20',
  },
  Pending: {
    color: '#f59e0b',
    badge: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  },
  Completed: {
    color: '#10b981',
    badge: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  },
  Cancelled: {
    color: '#ef4444',
    badge: 'bg-red-50 text-red-700 ring-red-600/20',
  },
};

export const FALLBACK_BADGE = 'bg-gray-50 text-gray-600 ring-gray-500/20';

export const statusColor = (status) => STATUS_META[status]?.color ?? '#9ca3af';
export const statusBadge = (status) => STATUS_META[status]?.badge ?? FALLBACK_BADGE;

const toOption = (s) => ({ value: s, label: s, color: STATUS_META[s].color });

/** Filter options for the active Events page. */
export const activeStatusOptions = (extra = []) => [
  ...extra,
  ...AUTO_STATUSES.map(toOption),
];

/**
 * What the modal offers. The three automatic statuses are not listed,
 * because picking one would only be overridden by the date anyway.
 */
export const editableStatusOptions = () => [
  { value: AUTO, label: 'Automatic (by date)', color: '#a1a1aa' },
  ...TERMINAL_STATUSES.map(toOption),
];
