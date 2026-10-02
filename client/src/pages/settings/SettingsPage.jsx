import React, { useState } from 'react';
import { Settings, User, Mail, Shield, Building2, Check } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { validateName, validateEmail, validatePassword } from '../../utils/validation';

const SettingsPage = () => {
  const { user, updateUser } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  const validateAll = () => {
    const errors = {};
    const nameErr = validateName(name, 'Full Name');
    if (nameErr) errors.name = nameErr;

    const emailErr = validateEmail(email);
    if (emailErr) errors.email = emailErr;

    if (password.trim()) {
      const passErr = validatePassword(password);
      if (passErr) errors.password = passErr;
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setSuccessMsg('');
    setErrorMsg('');

    if (!validateAll()) {
      setErrorMsg('Please fix the errors indicated below.');
      return;
    }

    try {
      setSaving(true);
      const payload = { name: name.trim(), email: email.trim().toLowerCase() };
      if (password.trim()) payload.password = password.trim();

      const res = await api.put('/auth/profile', payload);
      if (res.data.success) {
        updateUser(res.data.data);
        setPassword('');
        setFieldErrors({});
        setSuccessMsg('Profile updated successfully!');
      }
    } catch (err) {
      console.error('Error updating profile:', err);
      const msg = err.response?.data?.message || 'Failed to update profile.';
      setErrorMsg(msg);
      if (err.response?.data?.errors) {
        setFieldErrors(err.response.data.errors);
      }
    } finally {
      setSaving(false);
    }
  };

  const clientName = user?.client?.name || user?.clientId?.name;

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
          <Settings className="w-6 h-6 text-amber-500" />
          Settings & Profile
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Manage your account credentials and system profile
        </p>
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-300 text-xs font-semibold flex items-center gap-2">
          <Check className="w-4 h-4" />
          {successMsg}
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-rose-300 text-xs font-semibold">
          {errorMsg}
        </div>
      )}

      {/* Profile Form Card */}
      <div className="bg-dark-800/80 border border-dark-700/60 rounded-2xl p-6 shadow-sm">
        <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
          <User className="w-4 h-4 text-amber-500" />
          Personal Profile Details
        </h3>

        <form onSubmit={handleUpdateProfile} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Full Name <span className="text-amber-500">*</span>
              </label>
              <input
                type="text"
                maxLength={50}
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (fieldErrors.name) setFieldErrors({ ...fieldErrors, name: '' });
                }}
                required
                className={`w-full bg-dark-900 border ${
                  fieldErrors.name ? 'border-rose-500 focus:border-rose-500' : 'border-dark-700 focus:border-amber-500'
                } rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none transition-colors`}
              />
              {fieldErrors.name && (
                <p className="mt-1 text-xs text-rose-400 font-medium">{fieldErrors.name}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Email Address <span className="text-amber-500">*</span>
              </label>
              <input
                type="email"
                maxLength={100}
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (fieldErrors.email) setFieldErrors({ ...fieldErrors, email: '' });
                }}
                required
                className={`w-full bg-dark-900 border ${
                  fieldErrors.email ? 'border-rose-500 focus:border-rose-500' : 'border-dark-700 focus:border-amber-500'
                } rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none transition-colors`}
              />
              {fieldErrors.email && (
                <p className="mt-1 text-xs text-rose-400 font-medium">{fieldErrors.email}</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Change Password <span className="text-slate-500 font-normal">(Leave blank to keep unchanged)</span>
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (fieldErrors.password) setFieldErrors({ ...fieldErrors, password: '' });
              }}
              placeholder="••••••••"
              className={`w-full bg-dark-900 border ${
                fieldErrors.password ? 'border-rose-500 focus:border-rose-500' : 'border-dark-700 focus:border-amber-500'
              } rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none transition-colors`}
            />
            {fieldErrors.password ? (
              <p className="mt-1 text-xs text-rose-400 font-medium">{fieldErrors.password}</p>
            ) : (
              <p className="mt-1 text-[11px] text-slate-500">
                If changing, must be at least 8 characters and contain uppercase, lowercase, number, and special character.
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">Assigned System Role</label>
              <div className="bg-dark-900/60 border border-dark-700/60 rounded-xl px-3.5 py-2.5 text-sm font-bold text-amber-400">
                {user?.role}
              </div>
            </div>

            {clientName && (
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Client Organization</label>
                <div className="bg-dark-900/60 border border-dark-700/60 rounded-xl px-3.5 py-2.5 text-sm text-slate-200 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-amber-500" />
                  {clientName}
                </div>
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-dark-700/60 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 text-xs font-bold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-xl transition-all shadow-md shadow-amber-500/20 disabled:opacity-50"
            >
              {saving ? 'Updating...' : 'Save Profile Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SettingsPage;
