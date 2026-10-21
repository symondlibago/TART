import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Loader2, Search, Users, MapPin, Archive as ArchiveIcon, RotateCcw, Trash2,
  CheckCircle2, XCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { Card, CardContent } from '@/components/ui/card.jsx';
import { getEvents, deleteEvent, updateEventStatus } from '../utils/auth';
import { statusBadge, statusColor, AUTO } from '../lib/eventStatus';
import { ConfirmDialog } from './ConfirmDialog';
import { LoadMoreBar } from './LoadMoreBar';
import { usePagedList } from '../lib/usePagedList';

const TABS = [
  { value: 'Completed', label: 'Completed', icon: CheckCircle2 },
  { value: 'Cancelled', label: 'Cancelled', icon: XCircle },
];

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatTime(value) {
  if (!value) return '';
  const [hours, minutes] = String(value).split(':');
  const h = Number(hours);
  if (Number.isNaN(h)) return value;
  const suffix = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 === 0 ? 12 : h % 12}:${minutes} ${suffix}`;
}

export default function Archive() {
  const [tab, setTab] = useState('Completed');
  const [searchTerm, setSearchTerm] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const filters = useMemo(
    () => ({ status: tab, search: searchTerm }),
    [tab, searchTerm]
  );

  const {
    items: events, meta, loading, loadingMore, loadMore,
    reload: fetchEvents, removeItem,
  } = usePagedList(getEvents, filters);

  const filteredEvents = events;

  const totalPax = useMemo(
    () => events.reduce((sum, ev) => sum + (Number(ev.pax) || 0), 0),
    [events]
  );

  // Hand the event back to the calendar; it reappears on the Events page
  const handleRestore = async (event) => {
    setBusyId(event.id);
    try {
      const response = await updateEventStatus(event.id, AUTO);
      const data = await response.json();
      if (data.success) removeItem(event.id);
    } catch (error) {
      console.error(error);
    } finally {
      setBusyId(null);
    }
  };

  const confirmDelete = async () => {
    const event = confirmTarget;
    if (!event) return;

    setDeleting(true);
    try {
      await deleteEvent(event.id);
      removeItem(event.id);
      setConfirmTarget(null);
    } catch (error) {
      console.error(error);
      fetchEvents();
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="p-8 bg-gray-50 min-h-screen space-y-6">
      {/* Header */}
      <div className="flex flex-wrap gap-4 justify-between items-center">
        <div>
          <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">Archive</h1>
          <p className="text-sm text-gray-500 mt-1">
            {meta.total.toLocaleString()} {meta.total === 1 ? "event" : "events"}
            {totalPax > 0 && <> · {totalPax.toLocaleString()} total pax</>}
          </p>
        </div>

        {/* Toggle: a sliding pill marks the active tab */}
        <div className="relative flex bg-gray-200/70 rounded-xl p-1 gap-1">
          {TABS.map(({ value, label, icon: Icon }) => {
            const active = tab === value;
            return (
              <button
                key={value}
                onClick={() => setTab(value)}
                className="relative px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors z-10 flex items-center gap-2"
                style={{ color: active ? statusColor(value) : '#6b7280' }}
              >
                {active && (
                  <motion.span
                    layoutId="archiveTabPill"
                    transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                    className="absolute inset-0 bg-white rounded-lg shadow-sm -z-10"
                  />
                )}
                <Icon className="h-4 w-4" />
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Search */}
      <div className="max-w-md">
        <label className="text-[11px] font-bold text-gray-500 uppercase ml-1">Search</label>
        <div className="relative mt-1.5">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            className="pl-10 pr-4 py-2.5 w-full border border-gray-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-200"
            placeholder="Event, contact person or location..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      <Card className="border-none shadow-xl rounded-2xl overflow-hidden">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-20 flex justify-center">
              <Loader2 className="animate-spin text-indigo-700 h-8 w-8" />
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="p-20 flex flex-col items-center text-center">
              <div className="h-14 w-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
                <ArchiveIcon className="h-7 w-7 text-gray-400" />
              </div>
              <p className="font-bold text-gray-900">
                {searchTerm ? 'Nothing matches your search' : `No ${tab.toLowerCase()} events`}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                {searchTerm
                  ? 'Try a different name, person or place.'
                  : tab === 'Completed'
                    ? 'Tick the check button on an event to complete it.'
                    : 'Set an event to Cancelled from its edit form.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="p-5 text-[11px] font-bold text-gray-500 uppercase">Date &amp; Time</th>
                    <th className="p-5 text-[11px] font-bold text-gray-500 uppercase">Event</th>
                    <th className="p-5 text-[11px] font-bold text-gray-500 uppercase">Pax</th>
                    <th className="p-5 text-[11px] font-bold text-gray-500 uppercase">Contact Person</th>
                    <th className="p-5 text-[11px] font-bold text-gray-500 uppercase">Location</th>
                    <th className="p-5 text-[11px] font-bold text-gray-500 uppercase">Status</th>
                    <th className="p-5 text-[11px] font-bold text-gray-500 uppercase">Remarks</th>
                    <th className="p-5 text-[11px] font-bold text-gray-500 uppercase text-right">Actions</th>
                  </tr>
                </thead>
                <motion.tbody className="divide-y" layout>
                  <AnimatePresence initial={false}>
                    {filteredEvents.map((ev, i) => (
                      <motion.tr
                        key={ev.id}
                        layout
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -12 }}
                        transition={{ duration: 0.18, delay: Math.min(i * 0.025, 0.2) }}
                        className="hover:bg-indigo-50/30"
                      >
                        <td className="p-5 whitespace-nowrap">
                          <div className="font-bold text-gray-900 text-sm">{formatDate(ev.event_date)}</div>
                          <div className="text-xs text-gray-500 mt-0.5">{formatTime(ev.event_time)}</div>
                        </td>
                        <td className="p-5 font-bold text-gray-900">{ev.event_name}</td>
                        <td className="p-5">
                          <span className="inline-flex items-center gap-1.5 text-sm text-gray-700">
                            <Users className="h-3.5 w-3.5 text-gray-400" />
                            {Number(ev.pax).toLocaleString()}
                          </span>
                        </td>
                        <td className="p-5 text-sm text-gray-600">{ev.contact_person}</td>
                        <td className="p-5 text-sm text-gray-600">
                          <span className="inline-flex items-start gap-1.5">
                            <MapPin className="h-3.5 w-3.5 text-gray-400 mt-0.5 flex-shrink-0" />
                            {ev.location}
                          </span>
                        </td>
                        <td className="p-5">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${statusBadge(ev.status)}`}>
                            {ev.status}
                          </span>
                        </td>
                        <td className="p-5 text-sm text-gray-500 max-w-[220px]">
                          <span className="line-clamp-2">{ev.remarks || '—'}</span>
                        </td>
                        <td className="p-5 text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              onClick={() => handleRestore(ev)}
                              disabled={busyId === ev.id}
                              variant="ghost"
                              size="sm"
                              title="Move back to Events"
                              aria-label={`Move ${ev.event_name} back to Events`}
                              className="text-indigo-600 bg-indigo-50 hover:bg-indigo-600 hover:text-white rounded-lg"
                            >
                              {busyId === ev.id
                                ? <Loader2 className="h-4 w-4 animate-spin" />
                                : <RotateCcw className="h-4 w-4" />}
                            </Button>
                            <Button
                              onClick={() => setConfirmTarget(ev)}
                              variant="ghost"
                              size="sm"
                              title="Delete permanently"
                              className="text-red-600 bg-red-50 hover:bg-red-600 hover:text-white rounded-lg"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </motion.tbody>
              </table>

              <LoadMoreBar
                shown={events.length}
                total={meta.total}
                hasMore={meta.has_more}
                loading={loadingMore}
                onLoadMore={loadMore}
              />
            </div>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={Boolean(confirmTarget)}
        loading={deleting}
        title="Delete this event?"
        description="This permanently removes the event from your records. It cannot be undone."
        confirmLabel="Delete event"
        onCancel={() => setConfirmTarget(null)}
        onConfirm={confirmDelete}
        detail={confirmTarget && (
          <>
            <p className="font-bold text-gray-900 text-sm">{confirmTarget.event_name}</p>
            <p className="text-xs text-gray-500 mt-1">
              {formatDate(confirmTarget.event_date)} · {formatTime(confirmTarget.event_time)}
              {confirmTarget.location && <> · {confirmTarget.location}</>}
            </p>
          </>
        )}
      />
    </div>
  );
}
