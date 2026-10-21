import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User, Lock, Loader2, Check, AlertCircle, Eye, EyeOff, ShieldCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { Card, CardContent } from '@/components/ui/card.jsx';
import { getUser, setUser, updateProfile, updatePassword } from '../utils/auth';

const labelClass = 'text-[11px] font-bold text-gray-500 uppercase ml-1';

function Field({ label, error, children, hint }) {
  return (
    <div className="space-y-1.5">
      <label className={labelClass}>{label}</label>
      {children}
      {error && <p className="text-xs text-red-600 ml-1">{error}</p>}
      {!error && hint && <p className="text-xs text-gray-400 ml-1">{hint}</p>}
    </div>
  );
}

function PasswordInput({ value, onChange, placeholder, invalid }) {
  const [show, setShow] = useState(false);

  return (
    <div className="relative">
      <input
        type={show ? 'text' : 'password'}
        className={`w-full px-4 py-2.5 pr-11 border rounded-xl text-sm outline-none transition focus:ring-2 focus:ring-indigo-200 ${
          invalid ? 'border-red-400 bg-red-50' : 'border-gray-300'
        }`}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete="off"
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        tabIndex={-1}
        aria-label={show ? 'Hide password' : 'Show password'}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

/** Green flash that fades away on its own. */
function SuccessNote({ message }) {
  return (
    <AnimatePresence>
      {message && (
        <motion.div
          initial={{ opacity: 0, y: -6, height: 0 }}
          animate={{ opacity: 1, y: 0, height: 'auto' }}
          exit={{ opacity: 0, y: -6, height: 0 }}
          transition={{ duration: 0.2 }}
          className="overflow-hidden"
        >
          <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-800">
            <Check className="h-4 w-4 flex-shrink-0" /> {message}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function ErrorNote({ message }) {
  if (!message) return null;
  return (
    <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
      <AlertCircle className="h-4 w-4 flex-shrink-0" /> {message}
    </div>
  );
}

export default function Settings() {
  const current = getUser();

  // ----- account details -----
  const [profile, setProfile] = useState({
    name: '', username: '', email: '', current_password: '',
  });
  const [profileErrors, setProfileErrors] = useState({});
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileDone, setProfileDone] = useState('');

  // ----- password -----
  const [pw, setPw] = useState({ current_password: '', password: '', password_confirmation: '' });
  const [pwErrors, setPwErrors] = useState({});
  const [savingPw, setSavingPw] = useState(false);
  const [pwDone, setPwDone] = useState('');

  useEffect(() => {
    setProfile({
      name: current?.name ?? '',
      username: current?.username ?? '',
      email: current?.email ?? '',
      current_password: '',
    });
    // Only on mount: current comes from localStorage and is stable
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setProfileField = (k, v) => {
    setProfile((p) => ({ ...p, [k]: v }));
    setProfileErrors((p) => ({ ...p, [k]: undefined, _global: undefined }));
    setProfileDone('');
  };

  const setPwField = (k, v) => {
    setPw((p) => ({ ...p, [k]: v }));
    setPwErrors((p) => ({ ...p, [k]: undefined, _global: undefined }));
    setPwDone('');
  };

  const readErrors = (data) =>
    data.errors
      ? Object.fromEntries(Object.entries(data.errors).map(([k, v]) => [k, v[0]]))
      : { _global: data.message || 'Something went wrong.' };

  const saveProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileErrors({});
    setProfileDone('');

    try {
      const response = await updateProfile(profile);
      const data = await response.json();

      if (data.success) {
        setUser(data.user);               // keep the sidebar/role in step
        setProfile((p) => ({ ...p, current_password: '' }));
        setProfileDone('Account details updated.');
      } else {
        setProfileErrors(readErrors(data));
      }
    } catch (err) {
      console.error(err);
      setProfileErrors({ _global: 'Could not reach the server.' });
    } finally {
      setSavingProfile(false);
    }
  };

  const savePassword = async (e) => {
    e.preventDefault();
    setSavingPw(true);
    setPwErrors({});
    setPwDone('');

    try {
      const response = await updatePassword(pw);
      const data = await response.json();

      if (data.success) {
        setPw({ current_password: '', password: '', password_confirmation: '' });
        setPwDone(data.message || 'Password changed.');
      } else {
        setPwErrors(readErrors(data));
      }
    } catch (err) {
      console.error(err);
      setPwErrors({ _global: 'Could not reach the server.' });
    } finally {
      setSavingPw(false);
    }
  };

  const inputClass = (invalid) =>
    `w-full px-4 py-2.5 border rounded-xl text-sm outline-none transition focus:ring-2 focus:ring-indigo-200 ${
      invalid ? 'border-red-400 bg-red-50' : 'border-gray-300'
    }`;

  // Mirrors the backend rules so the button is not clickable into a 422
  const pwTooShort = pw.password.length > 0 && pw.password.length < 8;
  const pwMismatch =
    pw.password_confirmation.length > 0 && pw.password !== pw.password_confirmation;
  const canSavePw =
    pw.current_password && pw.password.length >= 8 && pw.password === pw.password_confirmation;

  return (
    <div className="p-8 bg-gray-50 min-h-screen space-y-6">
      <div>
        <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Your sign-in details</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start max-w-5xl">
        {/* ------------------------------------------------ ACCOUNT DETAILS */}
        <Card className="border-none shadow-xl rounded-2xl">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-1">
              <div className="h-10 w-10 rounded-xl bg-indigo-50 flex items-center justify-center">
                <User className="h-5 w-5 text-indigo-700" />
              </div>
              <h2 className="font-extrabold text-gray-900">Account Details</h2>
            </div>
            <p className="text-xs text-gray-500 mb-5 ml-13">
              You can sign in with either your username or your email.
            </p>

            <form onSubmit={saveProfile} className="space-y-5">
              <SuccessNote message={profileDone} />
              <ErrorNote message={profileErrors._global} />

              <Field label="Display Name" error={profileErrors.name}>
                <input
                  className={inputClass(profileErrors.name)}
                  placeholder="e.g. Symond Libago"
                  value={profile.name}
                  onChange={(e) => setProfileField('name', e.target.value)}
                />
              </Field>

              <Field
                label="Username"
                error={profileErrors.username}
                hint="Letters, numbers, dashes and underscores. No spaces."
              >
                <input
                  className={inputClass(profileErrors.username)}
                  placeholder="e.g. symond"
                  value={profile.username}
                  onChange={(e) => setProfileField('username', e.target.value.toLowerCase())}
                  autoCapitalize="none"
                  autoCorrect="off"
                  autoComplete="off"
                />
              </Field>

              <Field label="Email" error={profileErrors.email}>
                <input
                  type="email"
                  className={inputClass(profileErrors.email)}
                  placeholder="you@example.com"
                  value={profile.email}
                  onChange={(e) => setProfileField('email', e.target.value)}
                  autoComplete="off"
                />
              </Field>

              <Field
                label="Current Password"
                error={profileErrors.current_password}
                hint="Confirms it is really you making the change."
              >
                <PasswordInput
                  value={profile.current_password}
                  onChange={(v) => setProfileField('current_password', v)}
                  placeholder="Your current password"
                  invalid={Boolean(profileErrors.current_password)}
                />
              </Field>

              <Button
                type="submit"
                disabled={savingProfile || !profile.name || !profile.username || !profile.email || !profile.current_password}
                className="w-full bg-indigo-700 hover:bg-indigo-800 h-11 rounded-xl"
              >
                {savingProfile && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* ------------------------------------------------------- PASSWORD */}
        <Card className="border-none shadow-xl rounded-2xl">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-1">
              <div className="h-10 w-10 rounded-xl bg-amber-50 flex items-center justify-center">
                <Lock className="h-5 w-5 text-amber-600" />
              </div>
              <h2 className="font-extrabold text-gray-900">Change Password</h2>
            </div>
            <p className="text-xs text-gray-500 mb-5 ml-13">
              At least 8 characters.
            </p>

            <form onSubmit={savePassword} className="space-y-5">
              <SuccessNote message={pwDone} />
              <ErrorNote message={pwErrors._global} />

              <Field label="Current Password" error={pwErrors.current_password}>
                <PasswordInput
                  value={pw.current_password}
                  onChange={(v) => setPwField('current_password', v)}
                  placeholder="Your current password"
                  invalid={Boolean(pwErrors.current_password)}
                />
              </Field>

              <Field
                label="New Password"
                error={pwErrors.password || (pwTooShort ? 'Use at least 8 characters.' : '')}
              >
                <PasswordInput
                  value={pw.password}
                  onChange={(v) => setPwField('password', v)}
                  placeholder="New password"
                  invalid={Boolean(pwErrors.password) || pwTooShort}
                />
              </Field>

              <Field
                label="Confirm New Password"
                error={pwMismatch ? 'The two new passwords do not match.' : ''}
              >
                <PasswordInput
                  value={pw.password_confirmation}
                  onChange={(v) => setPwField('password_confirmation', v)}
                  placeholder="Repeat the new password"
                  invalid={pwMismatch}
                />
              </Field>

              <div className="flex items-start gap-2 rounded-xl bg-gray-50 border px-4 py-3">
                <ShieldCheck className="h-4 w-4 text-gray-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-gray-500 leading-relaxed">
                  Changing your password signs out every other device. This one stays
                  signed in.
                </p>
              </div>

              <Button
                type="submit"
                disabled={savingPw || !canSavePw}
                className="w-full bg-amber-500 hover:bg-amber-600 text-white h-11 rounded-xl"
              >
                {savingPw && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Change Password
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
