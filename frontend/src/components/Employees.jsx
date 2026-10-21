import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Loader2, Search, Edit2, Trash2, Users, X, UserX, UserCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { Card, CardContent } from '@/components/ui/card.jsx';
import {
  getEmployees, createEmployee, updateEmployee, deleteEmployee
} from '../utils/auth';
import { ConfirmDialog } from './ConfirmDialog';

const EMPTY = { employee_code: '', name: '', position: '', is_active: true };

function EmployeeModal({ isOpen, onClose, onSaved, employee }) {
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const isEditing = Boolean(employee);

  useEffect(() => {
    if (!isOpen) return;
    setForm(employee ? {
      employee_code: employee.employee_code ?? '',
      name: employee.name ?? '',
      position: employee.position ?? '',
      is_active: employee.is_active ?? true,
    } : EMPTY);
    setErrors({});
  }, [isOpen, employee]);

  const setField = (k, v) => {
    setForm((p) => ({ ...p, [k]: v }));
    setErrors((p) => ({ ...p, [k]: undefined }));
  };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrors({});

    try {
      const response = isEditing
        ? await updateEmployee(employee.id, form)
        : await createEmployee(form);
      const data = await response.json();

      if (data.success) {
        onSaved();
        onClose();
      } else if (data.errors) {
        setErrors(Object.fromEntries(
          Object.entries(data.errors).map(([k, v]) => [k, v[0]])
        ));
      } else {
        setErrors({ _global: data.message || 'Something went wrong.' });
      }
    } catch (err) {
      console.error(err);
      setErrors({ _global: 'Could not reach the server.' });
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
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
        >
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 320, damping: 30 }}
            className="bg-white w-full max-w-lg rounded-2xl shadow-2xl"
          >
            <div className="flex items-center justify-between px-8 py-6 border-b">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-indigo-50 flex items-center justify-center">
                  <Users className="h-5 w-5 text-indigo-700" />
                </div>
                <h2 className="text-xl font-extrabold text-gray-900">
                  {isEditing ? 'Edit Employee' : 'Add Employee'}
                </h2>
              </div>
              <Button
                variant="ghost" size="sm" onClick={onClose}
                className="rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-900"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            <form onSubmit={submit} className="px-8 py-6 space-y-5">
              {errors._global && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
                  {errors._global}
                </div>
              )}

              <div className="space-y-1.5">
                <label className={labelClass}>Employee Code *</label>
                <input
                  className={inputClass('employee_code')}
                  placeholder="e.g. E006"
                  value={form.employee_code}
                  onChange={(e) => setField('employee_code', e.target.value)}
                />
                {errors.employee_code && <p className="text-xs text-red-600 ml-1">{errors.employee_code}</p>}
              </div>

              <div className="space-y-1.5">
                <label className={labelClass}>Full Name *</label>
                <input
                  className={inputClass('name')}
                  placeholder="e.g. Juan Dela Cruz"
                  value={form.name}
                  onChange={(e) => setField('name', e.target.value)}
                />
                {errors.name && <p className="text-xs text-red-600 ml-1">{errors.name}</p>}
              </div>

              <div className="space-y-1.5">
                <label className={labelClass}>Position</label>
                <input
                  className={inputClass('position')}
                  placeholder="e.g. Server"
                  value={form.position}
                  onChange={(e) => setField('position', e.target.value)}
                />
              </div>

              <label className="flex items-center gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => setField('is_active', e.target.checked)}
                  className="h-4 w-4 rounded accent-indigo-700"
                />
                <span className="text-sm text-gray-700">
                  Active — inactive staff do not appear on the kiosk
                </span>
              </label>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button
                  type="button" variant="ghost" onClick={onClose} disabled={saving}
                  className="h-11 rounded-xl px-6 text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                >
                  Cancel
                </Button>
                <Button
                  type="submit" disabled={saving}
                  className="bg-indigo-700 hover:bg-indigo-800 h-11 rounded-xl px-8"
                >
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isEditing ? 'Save Changes' : 'Add Employee'}
                </Button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function Employees() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getEmployees();
      const data = await response.json();
      if (data.success) setEmployees(data.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const term = search.toLowerCase().trim();
    if (!term) return employees;
    return employees.filter((e) =>
      e.name.toLowerCase().includes(term)
      || e.employee_code.toLowerCase().includes(term)
      || (e.position ?? '').toLowerCase().includes(term)
    );
  }, [employees, search]);

  const activeCount = employees.filter((e) => e.is_active).length;

  const confirmDelete = async () => {
    const emp = confirmTarget;
    if (!emp) return;
    setDeleting(true);
    try {
      await deleteEmployee(emp.id);
      setEmployees((prev) => prev.filter((e) => e.id !== emp.id));
      setConfirmTarget(null);
    } catch (e) {
      console.error(e);
      load();
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="p-8 bg-gray-50 min-h-screen space-y-6">
      <div className="flex flex-wrap gap-4 justify-between items-center">
        <div>
          <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">Employees</h1>
          <p className="text-sm text-gray-500 mt-1">
            {activeCount} active · {employees.length} total
          </p>
        </div>
        <Button
          onClick={() => { setSelected(null); setModalOpen(true); }}
          className="bg-indigo-700 hover:bg-indigo-800 h-12 rounded-xl px-6"
        >
          <Plus className="mr-2 h-5 w-5" /> Add Employee
        </Button>
      </div>

      <div className="max-w-md">
        <label className="text-[11px] font-bold text-gray-500 uppercase ml-1">Search</label>
        <div className="relative mt-1.5">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            className="pl-10 pr-4 py-2.5 w-full border border-gray-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-200"
            placeholder="Name, code or position..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <Card className="border-none shadow-xl rounded-2xl overflow-hidden">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-20 flex justify-center"><Loader2 className="animate-spin text-indigo-700 h-8 w-8" /></div>
          ) : filtered.length === 0 ? (
            <div className="p-20 flex flex-col items-center text-center">
              <div className="h-14 w-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
                <Users className="h-7 w-7 text-gray-400" />
              </div>
              <p className="font-bold text-gray-900">
                {search ? 'Nobody matches that search' : 'No employees yet'}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                {search ? 'Try a different name or code.' : 'Add staff so they can time in from the kiosk.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="p-5 text-[11px] font-bold text-gray-500 uppercase">Code</th>
                    <th className="p-5 text-[11px] font-bold text-gray-500 uppercase">Name</th>
                    <th className="p-5 text-[11px] font-bold text-gray-500 uppercase">Position</th>
                    <th className="p-5 text-[11px] font-bold text-gray-500 uppercase">Status</th>
                    <th className="p-5 text-[11px] font-bold text-gray-500 uppercase text-right">Actions</th>
                  </tr>
                </thead>
                <motion.tbody className="divide-y" layout>
                  <AnimatePresence initial={false}>
                    {filtered.map((emp, i) => (
                      <motion.tr
                        key={emp.id}
                        layout
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -12 }}
                        transition={{ duration: 0.18, delay: Math.min(i * 0.02, 0.2) }}
                        className="hover:bg-indigo-50/30"
                      >
                        <td className="p-5 font-mono text-xs font-bold text-gray-600">{emp.employee_code}</td>
                        <td className="p-5 font-bold text-gray-900">{emp.name}</td>
                        <td className="p-5 text-sm text-gray-600">{emp.position || '—'}</td>
                        <td className="p-5">
                          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${
                            emp.is_active
                              ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20'
                              : 'bg-gray-50 text-gray-500 ring-gray-500/20'
                          }`}>
                            {emp.is_active ? <UserCheck className="h-3 w-3" /> : <UserX className="h-3 w-3" />}
                            {emp.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="p-5 text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              onClick={() => { setSelected(emp); setModalOpen(true); }}
                              variant="ghost" size="sm" title="Edit employee"
                              className="text-indigo-600 bg-indigo-50 hover:bg-indigo-600 hover:text-white rounded-lg"
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              onClick={() => setConfirmTarget(emp)}
                              variant="ghost" size="sm" title="Delete employee"
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
            </div>
          )}
        </CardContent>
      </Card>

      <EmployeeModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={load}
        employee={selected}
      />

      <ConfirmDialog
        open={Boolean(confirmTarget)}
        loading={deleting}
        title="Delete this employee?"
        description="This also deletes their entire attendance history. If they have simply left, set them to inactive instead so the records survive."
        confirmLabel="Delete employee"
        onCancel={() => setConfirmTarget(null)}
        onConfirm={confirmDelete}
        detail={confirmTarget && (
          <>
            <p className="font-bold text-gray-900 text-sm">{confirmTarget.name}</p>
            <p className="text-xs text-gray-500 mt-1">
              {confirmTarget.employee_code}
              {confirmTarget.position ? ` · ${confirmTarget.position}` : ''}
            </p>
          </>
        )}
      />
    </div>
  );
}
