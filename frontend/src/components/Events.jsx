import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Loader2, Search, Edit2, Trash2, CalendarDays, Users, MapPin, CalendarX, Check
} from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { Card, CardContent } from '@/components/ui/card.jsx';
import { getEvents, deleteEvent, updateEventStatus } from '../utils/auth';
import { statusBadge, activeStatusOptions } from '../lib/eventStatus';
import { usePagedList } from '../lib/usePagedList';
import { EventModal } from './EventModal';
import { LoadMoreBar } from './LoadMoreBar';
import { ConfirmDialog } from './ConfirmDialog';
import { AnimatedSelect } from './AnimatedSelect';
import { AnimatedDatePicker } from './AnimatedDatePicker';

function StatusBadge({ status }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${statusBadge(status)}`}>
      {status}
    </span>
  );
}

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
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${minutes} ${suffix}`;
}

export default function Events() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [completingId, setCompletingId] = useState(null);
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterDate, setFilterDate] = useState('');

  // The server does the filtering, so results are never limited to whatever
  // happens to be on the current page.
  const filters = useMemo(
    () => ({ search: searchTerm, status: filterStatus, date: filterDate }),
    [searchTerm, filterStatus, filterDate]
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

  const handleEdit = (event) => { setSelectedEvent(event); setIsModalOpen(true); };
  const handleAddNew = () => { setSelectedEvent(null); setIsModalOpen(true); };

  const confirmDelete = async () => {
    const event = confirmTarget;
    if (!event) return;

    setDeleting(true);
    try {
      await deleteEvent(event.id);
      // Drop it locally instead of refetching the whole list - one request, not two
      removeItem(event.id);
      setConfirmTarget(null);
    } catch (error) {
      console.error(error);
      fetchEvents();
    } finally {
      setDeleting(false);
    }
  };

  // Marking complete moves the event to the Archive page, so it leaves this list
  const handleComplete = async (event) => {
    setCompletingId(event.id);
    try {
      const response = await updateEventStatus(event.id, 'Completed');
      const data = await response.json();
      if (data.success) {
        removeItem(event.id);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setCompletingId(null);
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setFilterStatus('All');
    setFilterDate('');
  };

  const hasFilters = searchTerm || filterStatus !== 'All' || filterDate;

  return (
    <div className="p-8 bg-gray-50 min-h-screen space-y-6">
      {/* Header */}
      <div className="flex flex-wrap gap-4 justify-between items-center">
        <div>
          <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">Event Tracker</h1>
          <p className="text-sm text-gray-500 mt-1">
            {meta.total.toLocaleString()} {meta.total === 1 ? 'event' : 'events'}
            {totalPax > 0 && <> · {totalPax.toLocaleString()} pax loaded</>}
          </p>
        </div>
        <Button onClick={handleAddNew} className="bg-indigo-700 hover:bg-indigo-800 h-12 rounded-xl px-6">
          <Plus className="mr-2 h-5 w-5" /> Add Event
        </Button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
        <div className="space-y-1.5 md:col-span-2">
          <label className="text-[11px] font-bold text-gray-500 uppercase ml-1">Search</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              className="pl-10 pr-4 py-2.5 w-full border border-gray-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-200"
              placeholder="Event, contact person or location..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-gray-500 uppercase ml-1">Status</label>
          <AnimatedSelect
            value={filterStatus}
            onChange={setFilterStatus}
            options={activeStatusOptions([{ value: 'All', label: 'All statuses' }])}
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-gray-500 uppercase ml-1">Date</label>
          <AnimatedDatePicker
            value={filterDate}
            onChange={setFilterDate}
            placeholder="Any date"
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
                {hasFilters
                  ? <CalendarX className="h-7 w-7 text-gray-400" />
                  : <CalendarDays className="h-7 w-7 text-gray-400" />}
              </div>
              <p className="font-bold text-gray-900">
                {hasFilters ? 'No events match your filters' : 'No events yet'}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                {hasFilters
                  ? 'Try changing the search, status or date.'
                  : 'Click "Add Event" to record your first one.'}
              </p>
              {hasFilters && (
                <Button variant="ghost" onClick={clearFilters} className="mt-4 rounded-xl text-indigo-700 hover:bg-indigo-50 hover:text-indigo-800">
                  Clear filters
                </Button>
              )}
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
                      <td className="p-5"><StatusBadge status={ev.status} /></td>
                      <td className="p-5 text-sm text-gray-500 max-w-[220px]">
                        <span className="line-clamp-2">{ev.remarks || '—'}</span>
                      </td>
                      <td className="p-5 text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            onClick={() => handleComplete(ev)}
                            disabled={completingId === ev.id}
                            variant="ghost"
                            size="sm"
                            title="Mark as completed"
                            aria-label={`Mark ${ev.event_name} as completed`}
                            className="text-emerald-600 bg-emerald-50 hover:bg-emerald-600 hover:text-white rounded-lg"
                          >
                            {completingId === ev.id
                              ? <Loader2 className="h-4 w-4 animate-spin" />
                              : <Check className="h-4 w-4" />}
                          </Button>
                          <Button
                            onClick={() => handleEdit(ev)}
                            variant="ghost"
                            size="sm"
                            title="Edit event"
                            className="text-indigo-600 bg-indigo-50 hover:bg-indigo-600 hover:text-white rounded-lg"
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            onClick={() => setConfirmTarget(ev)}
                            variant="ghost"
                            size="sm"
                            title="Delete event"
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

      <EventModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onRefresh={fetchEvents}
        eventData={selectedEvent}
      />

      <ConfirmDialog
        open={Boolean(confirmTarget)}
        loading={deleting}
        title="Delete this event?"
        description="This permanently removes the event and everything recorded against it. It cannot be undone."
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
