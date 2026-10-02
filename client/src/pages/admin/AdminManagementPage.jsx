import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Plus,
  Search,
  Edit2,
  Trash2,
  KeyRound,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Mail,
  Phone,
  User,
  Lock,
  Eye,
  EyeOff,
  AlertTriangle,
} from 'lucide-react';
import api from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorAlert from '../../components/common/ErrorAlert';
import EmptyState from '../../components/common/EmptyState';
import Modal from '../../components/common/Modal';

const AdminManagementPage = () => {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const [selectedAdmin, setSelectedAdmin] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Form states
  const [createForm, setCreateForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    status: 'ACTIVE',
  });

  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    phone: '',
    status: 'ACTIVE',
  });

  const [passwordForm, setPasswordForm] = useState({
    newPassword: '',
    confirmPassword: '',
  });

  const [showPassword, setShowPassword] = useState(false);

  const fetchAdmins = async () => {
    try {
      setLoading(true);
      setError('');
      const params = {};
      if (search.trim()) params.search = search.trim();
      if (statusFilter) params.status = statusFilter;

      const res = await api.get('/admins', { params });
      if (res.data?.success) {
        setAdmins(res.data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch admin accounts:', err);
      setError('Unable to load admin accounts from server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdmins();
  }, [statusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchAdmins();
  };

  // Open Create Modal
  const openCreateModal = () => {
    setCreateForm({
      name: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: '',
      status: 'ACTIVE',
    });
    setModalError('');
    setIsCreateModalOpen(true);
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setModalError('');

    if (createForm.password !== createForm.confirmPassword) {
      setModalError('Passwords do not match.');
      return;
    }

    if (createForm.password.length < 6) {
      setModalError('Password must be at least 6 characters long.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await api.post('/admins', createForm);
      if (res.data?.success) {
        setSuccessMessage('New Admin account created successfully!');
        setIsCreateModalOpen(false);
        fetchAdmins();
        setTimeout(() => setSuccessMessage(''), 4000);
      }
    } catch (err) {
      console.error('Create admin error:', err);
      setModalError(err.response?.data?.message || 'Failed to create admin.');
    } finally {
      setSubmitting(false);
    }
  };

  // Open Edit Modal
  const openEditModal = (admin) => {
    setSelectedAdmin(admin);
    setEditForm({
      name: admin.name || '',
      email: admin.email || '',
      phone: admin.phone || '',
      status: admin.status || 'ACTIVE',
    });
    setModalError('');
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setModalError('');

    try {
      setSubmitting(true);
      const res = await api.put(`/admins/${selectedAdmin._id}`, editForm);
      if (res.data?.success) {
        setSuccessMessage('Admin details updated successfully!');
        setIsEditModalOpen(false);
        fetchAdmins();
        setTimeout(() => setSuccessMessage(''), 4000);
      }
    } catch (err) {
      console.error('Update admin error:', err);
      setModalError(err.response?.data?.message || 'Failed to update admin.');
    } finally {
      setSubmitting(false);
    }
  };

  // Status Toggle
  const handleToggleStatus = async (admin) => {
    const nextStatus = admin.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      const res = await api.patch(`/admins/${admin._id}/status`, { status: nextStatus });
      if (res.data?.success) {
        setSuccessMessage(`Admin ${admin.name} is now ${nextStatus}`);
        fetchAdmins();
        setTimeout(() => setSuccessMessage(''), 3000);
      }
    } catch (err) {
      console.error('Status update error:', err);
      setError('Failed to update admin status.');
    }
  };

  // Open Reset Password Modal
  const openPasswordModal = (admin) => {
    setSelectedAdmin(admin);
    setPasswordForm({ newPassword: '', confirmPassword: '' });
    setModalError('');
    setIsPasswordModalOpen(true);
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setModalError('');

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setModalError('Passwords do not match.');
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      setModalError('Password must be at least 6 characters long.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await api.patch(`/admins/${selectedAdmin._id}/password`, passwordForm);
      if (res.data?.success) {
        setSuccessMessage(`Password reset successfully for ${selectedAdmin.email}`);
        setIsPasswordModalOpen(false);
        setTimeout(() => setSuccessMessage(''), 4000);
      }
    } catch (err) {
      console.error('Password reset error:', err);
      setModalError(err.response?.data?.message || 'Failed to reset password.');
    } finally {
      setSubmitting(false);
    }
  };

  // Open Delete Modal
  const openDeleteModal = (admin) => {
    setSelectedAdmin(admin);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteSubmit = async () => {
    try {
      setSubmitting(true);
      const res = await api.delete(`/admins/${selectedAdmin._id}`);
      if (res.data?.success) {
        setSuccessMessage('Admin account deleted successfully.');
        setIsDeleteModalOpen(false);
        fetchAdmins();
        setTimeout(() => setSuccessMessage(''), 4000);
      }
    } catch (err) {
      console.error('Delete admin error:', err);
      setError('Failed to delete admin.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-gradient-to-r from-dark-800 to-dark-900 border border-dark-700/80 rounded-2xl p-6 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-400 mb-1">
            <ShieldCheck className="w-4 h-4" />
            SUPER ADMIN PRIVILEGES
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Platform Admin Management
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Create, monitor, and configure operational ADMIN accounts across FleetHub.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchAdmins}
            className="p-2.5 rounded-xl bg-dark-700/60 hover:bg-dark-700 border border-dark-600/50 text-slate-300 hover:text-white transition-colors"
            title="Refresh Admins"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-amber-400' : ''}`} />
          </button>

          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-slate-950 bg-amber-500 hover:bg-amber-400 active:scale-[0.98] transition-all shadow-lg shadow-amber-500/20"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            Create Admin
          </button>
        </div>
      </div>

      {successMessage && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-300 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          {successMessage}
        </div>
      )}

      {error && <ErrorAlert message={error} onRetry={fetchAdmins} />}

      {/* Filter / Search Bar */}
      <div className="bg-dark-800/80 border border-dark-700/60 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
        <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, phone..."
            className="w-full bg-dark-900 border border-dark-700 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-100 placeholder:text-slate-500 outline-none focus:border-amber-400"
          />
        </form>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-dark-900 border border-dark-700 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-amber-400 cursor-pointer"
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
            <option value="SUSPENDED">Suspended</option>
          </select>
        </div>
      </div>

      {/* Admins Table */}
      <div className="bg-dark-800/80 border border-dark-700/60 rounded-2xl shadow-sm overflow-hidden">
        {loading && admins.length === 0 ? (
          <div className="py-12">
            <LoadingSpinner text="Loading admin accounts..." />
          </div>
        ) : admins.length === 0 ? (
          <EmptyState
            title="No Admin Accounts Found"
            message="No operational administrators have been added yet or none match your search."
            actionText="Create First Admin"
            onAction={openCreateModal}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-dark-900/50 border-b border-dark-700/60 text-slate-400 uppercase text-[10px] font-bold tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Admin Name</th>
                  <th className="py-3.5 px-4">Email</th>
                  <th className="py-3.5 px-4">Phone</th>
                  <th className="py-3.5 px-4">Role</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Created Date</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-700/50 text-slate-300">
                {admins.map((admin) => (
                  <tr key={admin._id} className="hover:bg-dark-700/30 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-white flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-xs">
                        {admin.name.charAt(0).toUpperCase()}
                      </div>
                      {admin.name}
                    </td>
                    <td className="py-3.5 px-4">{admin.email}</td>
                    <td className="py-3.5 px-4">{admin.phone || 'N/A'}</td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        ADMIN
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          admin.status === 'ACTIVE'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                        }`}
                      >
                        {admin.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-400">
                      {new Date(admin.createdAt).toLocaleDateString([], {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleToggleStatus(admin)}
                          className={`p-1.5 rounded-lg border transition-colors ${
                            admin.status === 'ACTIVE'
                              ? 'text-rose-400 hover:bg-rose-500/10 border-rose-500/20'
                              : 'text-emerald-400 hover:bg-emerald-500/10 border-emerald-500/20'
                          }`}
                          title={admin.status === 'ACTIVE' ? 'Deactivate Admin' : 'Activate Admin'}
                        >
                          {admin.status === 'ACTIVE' ? (
                            <XCircle className="w-3.5 h-3.5" />
                          ) : (
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          )}
                        </button>

                        <button
                          onClick={() => openEditModal(admin)}
                          className="p-1.5 rounded-lg border border-dark-700 text-slate-400 hover:text-amber-400 hover:bg-dark-700 transition-colors"
                          title="Edit Admin"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => openPasswordModal(admin)}
                          className="p-1.5 rounded-lg border border-dark-700 text-slate-400 hover:text-blue-400 hover:bg-dark-700 transition-colors"
                          title="Reset Password"
                        >
                          <KeyRound className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => openDeleteModal(admin)}
                          className="p-1.5 rounded-lg border border-dark-700 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 hover:border-rose-500/20 transition-colors"
                          title="Delete Admin"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CREATE ADMIN MODAL */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create New Operational Admin"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
          {modalError && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300">
              {modalError}
            </div>
          )}

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Assigned Role</label>
            <div className="p-2.5 rounded-xl bg-dark-900 border border-dark-700 flex items-center justify-between">
              <span className="font-bold text-amber-400 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4" /> ADMIN
              </span>
              <span className="text-[10px] text-slate-400 uppercase font-semibold">
                Auto-assigned · Cannot be altered
              </span>
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Admin Name <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              value={createForm.name}
              onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
              placeholder="e.g. Rahul Sharma"
              className="w-full bg-dark-900 border border-dark-700 rounded-xl px-3 py-2 text-slate-100 outline-none focus:border-amber-400"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Email Address <span className="text-rose-400">*</span>
            </label>
            <input
              type="email"
              required
              value={createForm.email}
              onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
              placeholder="admin@fleethub.com"
              className="w-full bg-dark-900 border border-dark-700 rounded-xl px-3 py-2 text-slate-100 outline-none focus:border-amber-400"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Phone Number</label>
            <input
              type="tel"
              value={createForm.phone}
              onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
              placeholder="+91 99999 00001"
              className="w-full bg-dark-900 border border-dark-700 rounded-xl px-3 py-2 text-slate-100 outline-none focus:border-amber-400"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Password <span className="text-rose-400">*</span>
              </label>
              <input
                type="password"
                required
                value={createForm.password}
                onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                placeholder="••••••••"
                className="w-full bg-dark-900 border border-dark-700 rounded-xl px-3 py-2 text-slate-100 outline-none focus:border-amber-400"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Confirm Password <span className="text-rose-400">*</span>
              </label>
              <input
                type="password"
                required
                value={createForm.confirmPassword}
                onChange={(e) => setCreateForm({ ...createForm, confirmPassword: e.target.value })}
                placeholder="••••••••"
                className="w-full bg-dark-900 border border-dark-700 rounded-xl px-3 py-2 text-slate-100 outline-none focus:border-amber-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Account Status</label>
            <select
              value={createForm.status}
              onChange={(e) => setCreateForm({ ...createForm, status: e.target.value })}
              className="w-full bg-dark-900 border border-dark-700 rounded-xl px-3 py-2 text-slate-100 outline-none focus:border-amber-400"
            >
              <option value="ACTIVE">ACTIVE</option>
              <option value="INACTIVE">INACTIVE</option>
              <option value="SUSPENDED">SUSPENDED</option>
            </select>
          </div>

          <div className="pt-3 border-t border-dark-700 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-dark-800 hover:bg-dark-700 text-slate-300 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold disabled:opacity-50"
            >
              {submitting ? 'Creating...' : 'Create Admin'}
            </button>
          </div>
        </form>
      </Modal>

      {/* EDIT ADMIN MODAL */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={`Edit Admin: ${selectedAdmin?.name || ''}`}
      >
        <form onSubmit={handleEditSubmit} className="space-y-4 text-xs">
          {modalError && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300">
              {modalError}
            </div>
          )}

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Admin Name</label>
            <input
              type="text"
              required
              value={editForm.name}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              className="w-full bg-dark-900 border border-dark-700 rounded-xl px-3 py-2 text-slate-100 outline-none focus:border-amber-400"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Email Address</label>
            <input
              type="email"
              required
              value={editForm.email}
              onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
              className="w-full bg-dark-900 border border-dark-700 rounded-xl px-3 py-2 text-slate-100 outline-none focus:border-amber-400"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Phone Number</label>
            <input
              type="tel"
              value={editForm.phone}
              onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
              className="w-full bg-dark-900 border border-dark-700 rounded-xl px-3 py-2 text-slate-100 outline-none focus:border-amber-400"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Status</label>
            <select
              value={editForm.status}
              onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
              className="w-full bg-dark-900 border border-dark-700 rounded-xl px-3 py-2 text-slate-100 outline-none focus:border-amber-400"
            >
              <option value="ACTIVE">ACTIVE</option>
              <option value="INACTIVE">INACTIVE</option>
              <option value="SUSPENDED">SUSPENDED</option>
            </select>
          </div>

          <div className="pt-3 border-t border-dark-700 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsEditModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-dark-800 hover:bg-dark-700 text-slate-300 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold disabled:opacity-50"
            >
              {submitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>

      {/* RESET PASSWORD MODAL */}
      <Modal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        title={`Reset Password: ${selectedAdmin?.email || ''}`}
      >
        <form onSubmit={handlePasswordSubmit} className="space-y-4 text-xs">
          {modalError && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300">
              {modalError}
            </div>
          )}

          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              New Password <span className="text-rose-400">*</span>
            </label>
            <input
              type="password"
              required
              value={passwordForm.newPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
              placeholder="Minimum 6 characters"
              className="w-full bg-dark-900 border border-dark-700 rounded-xl px-3 py-2 text-slate-100 outline-none focus:border-amber-400"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Confirm New Password <span className="text-rose-400">*</span>
            </label>
            <input
              type="password"
              required
              value={passwordForm.confirmPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
              placeholder="Re-enter new password"
              className="w-full bg-dark-900 border border-dark-700 rounded-xl px-3 py-2 text-slate-100 outline-none focus:border-amber-400"
            />
          </div>

          <div className="pt-3 border-t border-dark-700 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsPasswordModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-dark-800 hover:bg-dark-700 text-slate-300 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold disabled:opacity-50"
            >
              {submitting ? 'Resetting...' : 'Reset Password'}
            </button>
          </div>
        </form>
      </Modal>

      {/* DELETE CONFIRMATION MODAL */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Confirm Delete Admin Account"
      >
        <div className="space-y-4 text-xs">
          <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-rose-300">Are you sure you want to delete this Admin?</p>
              <p className="text-slate-400 mt-1">
                Account: <span className="text-white font-medium">{selectedAdmin?.name} ({selectedAdmin?.email})</span>
              </p>
              <p className="text-slate-400 mt-0.5">
                This administrator will lose platform access immediately. This action cannot be undone.
              </p>
            </div>
          </div>

          <div className="pt-3 border-t border-dark-700 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsDeleteModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-dark-800 hover:bg-dark-700 text-slate-300 font-medium"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={handleDeleteSubmit}
              className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold disabled:opacity-50"
            >
              {submitting ? 'Deleting...' : 'Delete Admin'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default AdminManagementPage;
