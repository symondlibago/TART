import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, CalendarDays } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { createEvent, updateEvent } from '../utils/auth';
import { editableStatusOptions, TERMINAL_STATUSES, AUTO } from '../lib/eventStatus';
import { AnimatedSelect } from './AnimatedSelect';
import { AnimatedDatePicker } from './AnimatedDatePicker';
import { AnimatedTimePicker } from './AnimatedTimePicker';

const EMPTY_FORM = {
  event_name: '',
  event_date: '',
  event_time: '',
  pax: '',
  contact_person: '',
  location: '',
  status: AUTO,
  remarks: '',
};

export function EventModal({ isOpen, onClose, onRefresh, eventData }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const isEditing = Boolean(eventData);

  // Reload the form whenever the modal opens, or a different event is picked
  useEffect(() => {
    if (!isOpen) return;

    if (eventData) {
      setForm({
        event_name: eventData.event_name ?? '',
        event_date: (eventData.event_date ?? '').slice(0, 10),
        event_time: (eventData.event_time ?? '').slice(0, 5), // "18:30:00" -> "18:30"
        pax: eventData.pax ?? '',
        contact_person: eventData.contact_person ?? '',
        location: eventData.location ?? '',
        // Anything the calendar manages shows as "Automatic"
        status: TERMINAL_STATUSES.includes(eventData.status) ? eventData.status : AUTO,
        remarks: eventData.remarks ?? '',
      });
    } else {
      setForm(EMPTY_FORM);
    }
    setErrors({});
  }, [isOpen, eventData]);

  const setField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrors({});

    try {
      const payload = { ...form, pax: Number(form.pax) || 0 };
      const response = isEditing
        ? await updateEvent(eventData.id, payload)
        : await createEvent(payload);
      const data = await response.json();

      if (data.success) {
        onRefresh();
        onClose();
      } else if (data.errors) {
        // Laravel returns { field: ["message"] }
        setErrors(
          Object.fromEntries(
            Object.entries(data.errors).map(([k, v]) => [k, v[0]])
          )
        );
      } else {
        setErrors({ _global: data.message || 'Something went wrong.' });
      }
    } catch (error) {
      console.error(error);
      setErrors({ _global: 'Could not reach the server. Is Laravel running?' });
    } finally {
      setSaving(false);
    }
  };

  const inputClass = (field) =>
    `w-full px-4 py-2.5 border rounded-xl text-sm outline-none transition focus:ring-2 focus:ring-indigo-200 ${
      errors[field] ? 'border-red-400 bg-red-50' : 'border-gray-300'
    }`;

  const labelClass = 'text-[11px] font-bold text-gray-500 uppercase ml-1';

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
        >
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 320, damping: 30 }}
            className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto"
          >
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-6 border-b sticky top-0 bg-white rounded-t-2xl z-10">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-indigo-50 flex items-center justify-center">
              <CalendarDays className="h-5 w-5 text-indigo-700" />
            </div>
            <h2 className="text-xl font-extrabold text-gray-900">
              {isEditing ? 'Edit Event' : 'Add New Event'}
            </h2>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} className="rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-900">
            <X className="h-5 w-5" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="px-8 py-6 space-y-5">
          {errors._global && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
              {errors._global}
            </div>
          )}

          {/* Event name */}
          <div className="space-y-1.5">
            <label className={labelClass}>Event Name *</label>
            <input
              className={inputClass('event_name')}
              placeholder="e.g. Santos Wedding Reception"
              value={form.event_name}
              onChange={(e) => setField('event_name', e.target.value)}
            />
            {errors.event_name && <p className="text-xs text-red-600 ml-1">{errors.event_name}</p>}
          </div>

          {/* Date + Time */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className={labelClass}>Date *</label>
              <AnimatedDatePicker
                value={form.event_date}
                onChange={(v) => setField('event_date', v)}
                error={Boolean(errors.event_date)}
              />
              {errors.event_date && <p className="text-xs text-red-600 ml-1">{errors.event_date}</p>}
            </div>
            <div className="space-y-1.5">
              <label className={labelClass}>Time *</label>
              <AnimatedTimePicker
                value={form.event_time}
                onChange={(v) => setField('event_time', v)}
                error={Boolean(errors.event_time)}
              />
              {errors.event_time && <p className="text-xs text-red-600 ml-1">{errors.event_time}</p>}
            </div>
          </div>

          {/* Pax + Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className={labelClass}>Pax (Headcount) *</label>
              <input
                type="number"
                min="0"
                className={inputClass('pax')}
                placeholder="e.g. 150"
                value={form.pax}
                onChange={(e) => setField('pax', e.target.value)}
              />
              {errors.pax && <p className="text-xs text-red-600 ml-1">{errors.pax}</p>}
            </div>
            <div className="space-y-1.5">
              <label className={labelClass}>Status</label>
              <AnimatedSelect
                value={form.status}
                onChange={(v) => setField('status', v)}
                options={editableStatusOptions()}
                error={Boolean(errors.status)}
              />
              {errors.status && <p className="text-xs text-red-600 ml-1">{errors.status}</p>}
            </div>
          </div>

          {/* Contact person */}
          <div className="space-y-1.5">
            <label className={labelClass}>Contact Person *</label>
            <input
              className={inputClass('contact_person')}
              placeholder="e.g. Maria Santos"
              value={form.contact_person}
              onChange={(e) => setField('contact_person', e.target.value)}
            />
            {errors.contact_person && <p className="text-xs text-red-600 ml-1">{errors.contact_person}</p>}
          </div>

          {/* Location */}
          <div className="space-y-1.5">
            <label className={labelClass}>Location *</label>
            <input
              className={inputClass('location')}
              placeholder="e.g. Grand Ballroom, Manila Hotel"
              value={form.location}
              onChange={(e) => setField('location', e.target.value)}
            />
            {errors.location && <p className="text-xs text-red-600 ml-1">{errors.location}</p>}
          </div>

          {/* Remarks */}
          <div className="space-y-1.5">
            <label className={labelClass}>Remarks</label>
            <textarea
              rows={3}
              className={`${inputClass('remarks')} resize-none`}
              placeholder="Setup notes, special requests, equipment needed..."
              value={form.remarks}
              onChange={(e) => setField('remarks', e.target.value)}
            />
            {errors.remarks && <p className="text-xs text-red-600 ml-1">{errors.remarks}</p>}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              className="h-11 rounded-xl px-6 text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-indigo-700 hover:bg-indigo-800 h-11 rounded-xl px-8"
              disabled={saving}
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? 'Save Changes' : 'Create Event'}
            </Button>
          </div>
        </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default EventModal;
