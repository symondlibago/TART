import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import QRCode from 'qrcode';
import {
  Loader2, Search, Users, Clock, QrCode, HardDrive, Trash2, Download,
  CalendarCheck, ImageOff, Copy, Check, Clock3, Undo2
} from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { Card, CardContent } from '@/components/ui/card.jsx';
import {
  getAttendances, getPhotoUsage, purgePhotos, updateDayType, FULL_DAY, HALF_DAY,
} from '../utils/auth';
import { AnimatedDatePicker } from './AnimatedDatePicker';
import { ConfirmDialog } from './ConfirmDialog';
import { LoadMoreBar } from './LoadMoreBar';
import { usePagedList } from '../lib/usePagedList';

const TABS = [
  { value: 'records', label: 'Records', icon: CalendarCheck },
  { value: 'storage', label: 'QR & Storage', icon: QrCode },
];

const formatBytes = (bytes) => {
  const n = Number(bytes) || 0;
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
};

const formatDate = (value) => {
  if (!value) return '—';
  const d = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  return Number.isNaN(d.getTime())
    ? value
    : d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
};

const formatTime = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? '—'
    : d.toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Manila' });
};

/* ------------------------------------------------------------------ RECORDS */

function RecordsPanel() {
  const [date, setDate] = useState('');
  const [search, setSearch] = useState('');
  const [preview, setPreview] = useState(null);

  const filters = useMemo(() => ({ date, search }), [date, search]);

  const {
    items: filtered, meta, loading, loadingMore, loadMore, setItems,
  } = usePagedList(getAttendances, filters);

  const [savingId, setSavingId] = useState(null);

  // Updates the row in place rather than refetching the page: one request.
  const setDayType = async (record, dayType) => {
    setSavingId(record.id);
    try {
      const response = await updateDayType(record.id, dayType);
      const data = await response.json();
      if (data.success) {
        setItems((prev) => prev.map((r) =>
          r.id === record.id ? { ...r, day_type: dayType } : r
        ));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSavingId(null);
    }
  };

  const exportCsv = () => {
    const rows = [
      ['Date', 'Time In', 'Day Type', 'Code', 'Name', 'Position'],
      ...filtered.map((r) => [
        r.attendance_date, formatTime(r.timed_in_at), r.day_type ?? FULL_DAY,
        r.employee_code, r.employee_name, r.position ?? '',
      ]),
    ];
    const csv = rows
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance-${date || 'all'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
        <div className="space-y-1.5 md:col-span-2">
          <label className="text-[11px] font-bold text-gray-500 uppercase ml-1">Search</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              className="pl-10 pr-4 py-2.5 w-full border border-gray-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-200"
              placeholder="Name or employee code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-gray-500 uppercase ml-1">Date</label>
          <AnimatedDatePicker value={date} onChange={setDate} placeholder="Pick a day" />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {meta.total.toLocaleString()} {meta.total === 1 ? 'record' : 'records'}
          {date ? '' : ' today'}
        </p>
        <Button
          onClick={exportCsv}
          disabled={filtered.length === 0}
          variant="ghost"
          className="rounded-xl text-indigo-700 hover:bg-indigo-50 hover:text-indigo-800"
        >
          <Download className="mr-2 h-4 w-4" /> Export CSV
        </Button>
      </div>

      <Card className="border-none shadow-xl rounded-2xl overflow-hidden">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-20 flex justify-center"><Loader2 className="animate-spin text-indigo-700 h-8 w-8" /></div>
          ) : filtered.length === 0 ? (
            <div className="p-20 flex flex-col items-center text-center">
              <div className="h-14 w-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
                <Clock className="h-7 w-7 text-gray-400" />
              </div>
              <p className="font-bold text-gray-900">No attendance yet</p>
              <p className="text-sm text-gray-500 mt-1">Nobody has timed in for this day.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="p-5 text-[11px] font-bold text-gray-500 uppercase">Photo</th>
                    <th className="p-5 text-[11px] font-bold text-gray-500 uppercase">Employee</th>
                    <th className="p-5 text-[11px] font-bold text-gray-500 uppercase">Date</th>
                    <th className="p-5 text-[11px] font-bold text-gray-500 uppercase">Time In</th>
                    <th className="p-5 text-[11px] font-bold text-gray-500 uppercase">Day Type</th>
                    <th className="p-5 text-[11px] font-bold text-gray-500 uppercase">Size</th>
                    <th className="p-5 text-[11px] font-bold text-gray-500 uppercase text-right">Actions</th>
                  </tr>
                </thead>
                <motion.tbody className="divide-y" layout>
                  <AnimatePresence initial={false}>
                    {filtered.map((r, i) => (
                      <motion.tr
                        key={r.id}
                        layout
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.18, delay: Math.min(i * 0.02, 0.2) }}
                        className="hover:bg-indigo-50/30"
                      >
                        <td className="p-5">
                          {r.photo_url ? (
                            <button onClick={() => setPreview(r)} className="block">
                              <img
                                src={r.photo_url}
                                alt=""
                                loading="lazy"
                                className="h-14 w-14 rounded-xl object-cover ring-1 ring-gray-200 hover:ring-indigo-400 transition"
                              />
                            </button>
                          ) : (
                            <div className="h-14 w-14 rounded-xl bg-gray-100 flex items-center justify-center" title="Photo purged">
                              <ImageOff className="h-5 w-5 text-gray-400" />
                            </div>
                          )}
                        </td>
                        <td className="p-5">
                          <div className="font-bold text-gray-900">{r.employee_name}</div>
                          <div className="text-xs text-gray-500 mt-0.5">
                            {r.employee_code}{r.position ? ` · ${r.position}` : ''}
                          </div>
                        </td>
                        <td className="p-5 text-sm text-gray-600 whitespace-nowrap">{formatDate(r.attendance_date)}</td>
                        <td className="p-5">
                          <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset bg-emerald-50 text-emerald-700 ring-emerald-600/20 tabular-nums">
                            {formatTime(r.timed_in_at)}
                          </span>
                        </td>
                        <td className="p-5">
                          {(r.day_type ?? FULL_DAY) === HALF_DAY ? (
                            <motion.span
                              key="half"
                              initial={{ scale: 0.85, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              transition={{ type: 'spring', stiffness: 400, damping: 24 }}
                              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset bg-amber-50 text-amber-700 ring-amber-600/20"
                            >
                              <Clock3 className="h-3 w-3" /> Half Day
                            </motion.span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset bg-slate-50 text-slate-600 ring-slate-500/20">
                              Full Day
                            </span>
                          )}
                        </td>
                        <td className="p-5 text-xs text-gray-400 tabular-nums">{formatBytes(r.photo_bytes)}</td>
                        <td className="p-5 text-right">
                          {(r.day_type ?? FULL_DAY) === HALF_DAY ? (
                            <Button
                              onClick={() => setDayType(r, FULL_DAY)}
                              disabled={savingId === r.id}
                              variant="ghost"
                              size="sm"
                              title="Undo - back to full day"
                              className="text-gray-600 bg-gray-100 hover:bg-gray-600 hover:text-white rounded-lg"
                            >
                              {savingId === r.id
                                ? <Loader2 className="h-4 w-4 animate-spin" />
                                : <><Undo2 className="h-4 w-4 mr-1.5" /> Undo</>}
                            </Button>
                          ) : (
                            <Button
                              onClick={() => setDayType(r, HALF_DAY)}
                              disabled={savingId === r.id}
                              variant="ghost"
                              size="sm"
                              title="Mark as half day"
                              className="text-amber-700 bg-amber-50 hover:bg-amber-500 hover:text-white rounded-lg"
                            >
                              {savingId === r.id
                                ? <Loader2 className="h-4 w-4 animate-spin" />
                                : <><Clock3 className="h-4 w-4 mr-1.5" /> Half Day</>}
                            </Button>
                          )}
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </motion.tbody>
              </table>

              <LoadMoreBar
                shown={filtered.length}
                total={meta.total}
                hasMore={meta.has_more}
                loading={loadingMore}
                onLoadMore={loadMore}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Photo lightbox */}
      <AnimatePresence>
        {preview && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onMouseDown={(e) => { if (e.target === e.currentTarget) setPreview(null); }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 320, damping: 28 }}
              className="bg-white rounded-2xl overflow-hidden max-w-sm w-full shadow-2xl"
            >
              <img src={preview.photo_url} alt="" className="w-full" />
              <div className="p-5">
                <p className="font-extrabold text-gray-900">{preview.employee_name}</p>
                <p className="text-sm text-gray-500 mt-1">
                  {formatDate(preview.attendance_date)} · {formatTime(preview.timed_in_at)}
                </p>
                <Button
                  onClick={() => setPreview(null)}
                  className="w-full mt-4 h-11 rounded-xl bg-indigo-700 hover:bg-indigo-800"
                >
                  Close
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ------------------------------------------------------- QR CODE + STORAGE */

function StoragePanel() {
  const [qr, setQr] = useState('');
  const [copied, setCopied] = useState(false);
  const [usage, setUsage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState({ from: '', to: '' });
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [purging, setPurging] = useState(false);
  const [message, setMessage] = useState('');
  const qrRef = useRef(null);

  const kioskUrl = `${window.location.origin}/attendance`;

  useEffect(() => {
    QRCode.toDataURL(kioskUrl, { width: 480, margin: 2, errorCorrectionLevel: 'M' })
      .then(setQr)
      .catch(console.error);
  }, [kioskUrl]);

  const loadUsage = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getPhotoUsage();
      const data = await response.json();
      if (data.success) setUsage(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadUsage(); }, [loadUsage]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(kioskUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch (e) { console.error(e); }
  };

  const downloadQr = () => {
    const a = document.createElement('a');
    a.href = qr;
    a.download = 'attendance-qr.png';
    a.click();
  };

  const doPurge = async () => {
    setPurging(true);
    try {
      const response = await purgePhotos(range.from, range.to);
      const data = await response.json();
      setMessage(data.message || '');
      setConfirmOpen(false);
      loadUsage();
    } catch (e) {
      console.error(e);
      setMessage('Could not delete the photos.');
    } finally {
      setPurging(false);
    }
  };

  const FREE_TIER = 1024 * 1024 * 1024;
  const used = usage?.total_bytes ?? 0;
  const pct = Math.min(100, (used / FREE_TIER) * 100);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* QR */}
      <Card className="border-none shadow-xl rounded-2xl">
        <CardContent className="p-6">
          <h2 className="font-extrabold text-gray-900 mb-1">Attendance QR Code</h2>
          <p className="text-xs text-gray-500 mb-5">
            Print this once and stick it by the door. The link never changes.
          </p>

          <div className="flex justify-center">
            {qr ? (
              <motion.img
                ref={qrRef}
                src={qr}
                alt="Attendance QR code"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 24 }}
                className="w-56 h-56 rounded-xl ring-1 ring-gray-200"
              />
            ) : (
              <div className="w-56 h-56 rounded-xl bg-gray-100 flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              </div>
            )}
          </div>

          <div className="mt-5 flex items-center gap-2 rounded-xl bg-gray-50 border px-3 py-2.5">
            <code className="text-xs text-gray-600 truncate flex-1">{kioskUrl}</code>
            <button onClick={copyLink} className="text-gray-400 hover:text-indigo-700 flex-shrink-0">
              {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>

          <Button
            onClick={downloadQr}
            disabled={!qr}
            className="w-full mt-3 h-11 rounded-xl bg-indigo-700 hover:bg-indigo-800"
          >
            <Download className="mr-2 h-4 w-4" /> Download QR
          </Button>

          <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 mt-4 leading-relaxed">
            The camera only works over <strong>HTTPS</strong> (or on localhost). Once this is
            deployed the QR will work from any phone.
          </p>
        </CardContent>
      </Card>

      {/* Storage */}
      <Card className="border-none shadow-xl rounded-2xl">
        <CardContent className="p-6">
          <h2 className="font-extrabold text-gray-900 mb-1 flex items-center gap-2">
            <HardDrive className="h-4 w-4 text-gray-400" /> Photo Storage
          </h2>
          <p className="text-xs text-gray-500 mb-5">
            Delete old photos in bulk. Attendance records are always kept.
          </p>

          {loading ? (
            <div className="py-10 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-indigo-700" /></div>
          ) : (
            <>
              <div className="flex items-baseline justify-between mb-2">
                <span className="text-2xl font-extrabold text-gray-900">{formatBytes(used)}</span>
                <span className="text-xs text-gray-500">{usage?.total_photos ?? 0} photos · of 1 GB</span>
              </div>
              <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.max(pct, 0.4)}%` }}
                  transition={{ duration: 0.6, ease: 'easeOut' }}
                  className="h-full rounded-full bg-indigo-600"
                />
              </div>

              {usage?.data?.length > 0 && (
                <div className="mt-5 max-h-44 overflow-y-auto divide-y border rounded-xl">
                  {usage.data.map((d) => (
                    <div key={d.attendance_date} className="flex items-center justify-between px-3 py-2 text-sm">
                      <span className="text-gray-700">{formatDate(d.attendance_date)}</span>
                      <span className="text-gray-400 text-xs tabular-nums">
                        {d.photos} · {formatBytes(d.bytes)}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 mt-5">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-gray-500 uppercase ml-1">From</label>
                  <AnimatedDatePicker
                    value={range.from}
                    onChange={(v) => setRange((r) => ({ ...r, from: v }))}
                    placeholder="Start"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-gray-500 uppercase ml-1">To</label>
                  <AnimatedDatePicker
                    value={range.to}
                    onChange={(v) => setRange((r) => ({ ...r, to: v }))}
                    placeholder="End"
                  />
                </div>
              </div>

              <Button
                onClick={() => setConfirmOpen(true)}
                disabled={!range.from || !range.to}
                className="w-full mt-4 h-11 rounded-xl bg-red-600 hover:bg-red-700 text-white"
              >
                <Trash2 className="mr-2 h-4 w-4" /> Delete photos in range
              </Button>

              {message && <p className="text-sm text-gray-600 mt-3 text-center">{message}</p>}
            </>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={confirmOpen}
        loading={purging}
        title="Delete these photos?"
        description="The photos are removed from storage permanently. The attendance records themselves are kept, so you keep the history of who turned up."
        confirmLabel="Delete photos"
        onCancel={() => setConfirmOpen(false)}
        onConfirm={doPurge}
        detail={
          <p className="text-sm text-gray-700">
            <strong>{formatDate(range.from)}</strong> to <strong>{formatDate(range.to)}</strong>
          </p>
        }
      />
    </div>
  );
}

/* ---------------------------------------------------------------- CONTAINER */

export default function Attendance() {
  const [tab, setTab] = useState('records');

  return (
    <div className="p-8 bg-gray-50 min-h-screen space-y-6">
      <div className="flex flex-wrap gap-4 justify-between items-center">
        <div>
          <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">Attendance</h1>
          <p className="text-sm text-gray-500 mt-1">Daily time in records and the kiosk QR code</p>
        </div>

        <div className="relative flex bg-gray-200/70 rounded-xl p-1 gap-1">
          {TABS.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              onClick={() => setTab(value)}
              className={`relative px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors z-10 flex items-center gap-2 ${
                tab === value ? 'text-indigo-700' : 'text-gray-500'
              }`}
            >
              {tab === value && (
                <motion.span
                  layoutId="attendanceTabPill"
                  transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                  className="absolute inset-0 bg-white rounded-lg shadow-sm -z-10"
                />
              )}
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'records' ? <RecordsPanel /> : <StoragePanel />}
    </div>
  );
}
