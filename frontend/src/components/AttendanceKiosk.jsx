import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Camera, Check, X, Loader2, RefreshCw, UserCheck, AlertCircle, CameraOff
} from 'lucide-react';
import { kioskGetEmployees, kioskTimeIn } from '../utils/auth';

/** Longest edge sent to the server. Keeps uploads small on mobile data. */
const CAPTURE_EDGE = 640;

const STEPS = { PICK: 'pick', CAMERA: 'camera', REVIEW: 'review', DONE: 'done' };

function initials(name = '') {
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
}

export default function AttendanceKiosk() {
  const [employees, setEmployees] = useState([]);
  const [serverDate, setServerDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [step, setStep] = useState(STEPS.PICK);
  const [selected, setSelected] = useState(null);
  const [photo, setPhoto] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [cameraError, setCameraError] = useState('');
  const [result, setResult] = useState(null);

  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await kioskGetEmployees();
      const data = await response.json();
      if (data.success) {
        setEmployees(data.data);
        setServerDate(data.server_date);
      }
    } catch (e) {
      console.error(e);
      setError('Could not reach the server.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  // Always release the camera when leaving the page
  useEffect(() => stopCamera, [stopCamera]);

  const startCamera = async (employee) => {
    setSelected(employee);
    setPhoto(null);
    setError('');
    setCameraError('');
    setStep(STEPS.CAMERA);

    try {
      // facingMode 'user' asks for the selfie camera. getUserMedia only ever
      // opens a live camera - there is no way for it to return a gallery file.
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 960 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (e) {
      console.error(e);
      setCameraError(
        e?.name === 'NotAllowedError'
          ? 'Camera permission was denied. Allow camera access and try again.'
          : 'No camera available. This page needs a camera over HTTPS.'
      );
    }
  };

  const capture = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;

    const scale = Math.min(1, CAPTURE_EDGE / Math.max(video.videoWidth, video.videoHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);

    const ctx = canvas.getContext('2d');
    // Un-mirror: the preview is flipped so it feels like a mirror, but the
    // saved photo should read the right way round.
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    setPhoto(canvas.toDataURL('image/jpeg', 0.75));
    stopCamera();
    setStep(STEPS.REVIEW);
  };

  const retake = () => startCamera(selected);

  const submit = async () => {
    if (!selected || !photo) return;
    setSubmitting(true);
    setError('');

    try {
      const response = await kioskTimeIn(selected.id, photo);
      const data = await response.json();

      if (data.success) {
        setResult(data.data);
        setStep(STEPS.DONE);
        load(); // refresh so the name greys out
      } else {
        setError(data.message || 'Could not record your attendance.');
        if (data.already) { load(); setStep(STEPS.PICK); }
      }
    } catch (e) {
      console.error(e);
      setError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const reset = () => {
    stopCamera();
    setSelected(null);
    setPhoto(null);
    setResult(null);
    setError('');
    setStep(STEPS.PICK);
    setSearch('');
  };

  const filtered = useMemo(() => {
    const term = search.toLowerCase().trim();
    if (!term) return employees;
    return employees.filter((e) =>
      e.name.toLowerCase().includes(term) || e.employee_code.toLowerCase().includes(term)
    );
  }, [employees, search]);

  const remaining = employees.filter((e) => !e.timed_in).length;

  const prettyDate = serverDate
    ? new Date(`${serverDate}T00:00:00`).toLocaleDateString('en-PH', {
        weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
      })
    : '';

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-950 to-slate-900 text-white">
      <div className="max-w-3xl mx-auto px-4 py-8 pb-16">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Time In</h1>
          <p className="text-indigo-200/80 text-sm mt-2">{prettyDate}</p>
          {step === STEPS.PICK && !loading && (
            <p className="text-indigo-300/60 text-xs mt-1">
              {remaining} of {employees.length} still to time in
            </p>
          )}
        </div>

        <AnimatePresence mode="wait">
          {/* ---------------------------------------------------- PICK NAME */}
          {step === STEPS.PICK && (
            <motion.div
              key="pick"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
            >
              <div className="relative mb-5">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-indigo-300/60" />
                <input
                  autoFocus
                  className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white/10 border border-white/15 text-white placeholder:text-indigo-200/50 text-base outline-none focus:ring-2 focus:ring-indigo-400"
                  placeholder="Search your name..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              {error && (
                <div className="mb-4 flex items-center gap-2 rounded-xl bg-red-500/15 border border-red-400/30 px-4 py-3 text-sm text-red-200">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" /> {error}
                </div>
              )}

              {loading ? (
                <div className="py-20 flex justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-indigo-300" />
                </div>
              ) : filtered.length === 0 ? (
                <p className="text-center text-indigo-200/60 py-16">No one matches that name.</p>
              ) : (
                <div className="grid gap-2.5">
                  {filtered.map((emp, i) => (
                    <motion.button
                      key={emp.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(i * 0.025, 0.25), duration: 0.18 }}
                      whileTap={emp.timed_in ? undefined : { scale: 0.98 }}
                      disabled={emp.timed_in}
                      onClick={() => startCamera(emp)}
                      className={`flex items-center gap-4 w-full text-left px-4 py-4 rounded-2xl border transition
                        ${emp.timed_in
                          ? 'bg-white/5 border-white/5 opacity-45 cursor-not-allowed'
                          : 'bg-white/10 border-white/15 hover:bg-white/20 hover:border-indigo-400/50'}`}
                    >
                      <span className={`h-12 w-12 rounded-full flex items-center justify-center font-bold flex-shrink-0
                        ${emp.timed_in ? 'bg-emerald-500/20 text-emerald-300' : 'bg-indigo-500/30 text-indigo-100'}`}>
                        {emp.timed_in ? <Check className="h-6 w-6" /> : initials(emp.name)}
                      </span>

                      <span className="min-w-0 flex-1">
                        <span className="block font-bold truncate">{emp.name}</span>
                        <span className="block text-xs text-indigo-200/60 truncate">
                          {emp.employee_code}{emp.position ? ` · ${emp.position}` : ''}
                        </span>
                      </span>

                      {emp.timed_in && (
                        <span className="text-xs font-semibold text-emerald-300 whitespace-nowrap">
                          {emp.timed_in_at}
                        </span>
                      )}
                    </motion.button>
                  ))}
                </div>
              )}

              <button
                onClick={load}
                className="mt-6 mx-auto flex items-center gap-2 text-sm text-indigo-300/70 hover:text-white"
              >
                <RefreshCw className="h-4 w-4" /> Refresh list
              </button>
            </motion.div>
          )}

          {/* ------------------------------------------------------- CAMERA */}
          {step === STEPS.CAMERA && (
            <motion.div
              key="camera"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.2 }}
              className="text-center"
            >
              <p className="font-bold text-lg mb-1">{selected?.name}</p>
              <p className="text-indigo-200/60 text-sm mb-5">Take a photo to time in</p>

              {cameraError ? (
                <div className="rounded-2xl bg-red-500/15 border border-red-400/30 p-8">
                  <CameraOff className="h-10 w-10 mx-auto text-red-300 mb-3" />
                  <p className="text-sm text-red-200">{cameraError}</p>
                </div>
              ) : (
                <div className="relative rounded-3xl overflow-hidden bg-black aspect-[3/4] max-w-sm mx-auto border border-white/15">
                  <video
                    ref={videoRef}
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                    style={{ transform: 'scaleX(-1)' }}
                  />
                </div>
              )}

              <div className="flex items-center justify-center gap-4 mt-6">
                <button
                  onClick={reset}
                  className="px-6 py-3.5 rounded-2xl bg-white/10 border border-white/15 font-semibold hover:bg-white/20"
                >
                  Cancel
                </button>
                <motion.button
                  whileTap={{ scale: 0.94 }}
                  onClick={capture}
                  disabled={Boolean(cameraError)}
                  className="px-8 py-3.5 rounded-2xl bg-white text-indigo-950 font-bold flex items-center gap-2 disabled:opacity-40"
                >
                  <Camera className="h-5 w-5" /> Capture
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* ------------------------------------------------------- REVIEW */}
          {step === STEPS.REVIEW && (
            <motion.div
              key="review"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.2 }}
              className="text-center"
            >
              <p className="font-bold text-lg mb-1">{selected?.name}</p>
              <p className="text-indigo-200/60 text-sm mb-5">Happy with this photo?</p>

              <div className="rounded-3xl overflow-hidden aspect-[3/4] max-w-sm mx-auto border border-white/15">
                <img src={photo} alt="" className="w-full h-full object-cover" />
              </div>

              {error && (
                <div className="mt-4 mx-auto max-w-sm flex items-center gap-2 rounded-xl bg-red-500/15 border border-red-400/30 px-4 py-3 text-sm text-red-200">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" /> {error}
                </div>
              )}

              <div className="flex items-center justify-center gap-4 mt-6">
                <button
                  onClick={retake}
                  disabled={submitting}
                  className="px-6 py-3.5 rounded-2xl bg-white/10 border border-white/15 font-semibold hover:bg-white/20 disabled:opacity-40"
                >
                  Retake
                </button>
                <motion.button
                  whileTap={{ scale: 0.94 }}
                  onClick={submit}
                  disabled={submitting}
                  className="px-8 py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-600 font-bold flex items-center gap-2 disabled:opacity-60"
                >
                  {submitting
                    ? <><Loader2 className="h-5 w-5 animate-spin" /> Recording...</>
                    : <><UserCheck className="h-5 w-5" /> Time In</>}
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* --------------------------------------------------------- DONE */}
          {step === STEPS.DONE && (
            <motion.div
              key="done"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 24 }}
              className="text-center py-10"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.1, type: 'spring', stiffness: 400, damping: 18 }}
                className="h-24 w-24 rounded-full bg-emerald-500 flex items-center justify-center mx-auto mb-6"
              >
                <Check className="h-12 w-12" strokeWidth={3} />
              </motion.div>

              <h2 className="text-2xl font-extrabold">You're timed in!</h2>
              <p className="text-indigo-200 mt-2">{result?.employee}</p>
              <p className="text-4xl font-extrabold mt-4 tabular-nums">{result?.timed_in_at}</p>

              <button
                onClick={reset}
                className="mt-10 px-8 py-3.5 rounded-2xl bg-white/10 border border-white/15 font-semibold hover:bg-white/20"
              >
                Done
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
