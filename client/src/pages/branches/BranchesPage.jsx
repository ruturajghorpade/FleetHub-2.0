import React, { useState, useEffect } from 'react';
import { GitFork, Plus, Edit2, Trash2, RefreshCw, Building2 } from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import StatusBadge from '../../components/common/StatusBadge';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorAlert from '../../components/common/ErrorAlert';
import EmptyState from '../../components/common/EmptyState';
import Modal from '../../components/common/Modal';

const BranchesPage = () => {
  const { user } = useAuth();
  const [branches, setBranches] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    clientId: '',
    address: '',
    phone: '',
    status: 'ACTIVE',
  });

  const isAdmin = user?.role === 'ADMIN';

  const fetchBranches = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/branches');
      if (res.data.success) {
        setBranches(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching branches:', err);
      setError('Failed to fetch branches.');
    } finally {
      setLoading(false);
    }
  };

  const fetchClients = async () => {
    if (isAdmin) {
      try {
        const res = await api.get('/clients');
        if (res.data.success) {
          setClients(res.data.data);
        }
      } catch (err) {
        console.error('Error loading clients:', err);
      }
    }
  };

  useEffect(() => {
    fetchBranches();
    fetchClients();
  }, []);

  const openAddModal = () => {
    setEditingBranch(null);
    setFormData({
      name: '',
      clientId: isAdmin ? clients[0]?._id || '' : user?.clientId,
      address: '',
      phone: '',
      status: 'ACTIVE',
    });
    setModalError('');
    setModalOpen(true);
  };

  const openEditModal = (branch) => {
    setEditingBranch(branch);
    setFormData({
      name: branch.name,
      clientId: branch.clientId?._id || branch.clientId,
      address: branch.address,
      phone: branch.phone,
      status: branch.status,
    });
    setModalError('');
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setModalError('');
    try {
      setSubmitting(true);
      if (editingBranch) {
        await api.put(`/branches/${editingBranch._id}`, formData);
      } else {
        await api.post('/branches', formData);
      }
      setModalOpen(false);
      fetchBranches();
    } catch (err) {
      console.error('Error saving branch:', err);
      setModalError(err.response?.data?.message || 'Failed to save branch.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (window.confirm(`Are you sure you want to delete branch "${name}"?`)) {
      try {
        await api.delete(`/branches/${id}`);
        fetchBranches();
      } catch (err) {
        alert(err.response?.data?.message || 'Failed to delete branch');
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
            <GitFork className="w-6 h-6 text-amber-500" />
            Branch Management
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Dispatch centers and kitchen outlets for your restaurant fleet
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchBranches}
            className="p-2.5 rounded-xl bg-dark-800 hover:bg-dark-700 border border-dark-700 text-slate-300 hover:text-white transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-amber-400' : ''}`} />
          </button>
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-slate-950 bg-amber-500 hover:bg-amber-400 transition-all shadow-lg shadow-amber-500/20"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            Add Branch
          </button>
        </div>
      </div>

      {error && <ErrorAlert message={error} onRetry={fetchBranches} />}

      {loading && branches.length === 0 ? (
        <LoadingSpinner text="Loading branches..." />
      ) : branches.length === 0 ? (
        <EmptyState
          title="No branches found"
          description="Click 'Add Branch' to set up your primary dispatch outlet."
          action={
            <button
              onClick={openAddModal}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-950 bg-amber-500 hover:bg-amber-400"
            >
              + Add Branch
            </button>
          }
        />
      ) : (
        <div className="bg-dark-800/80 border border-dark-700/60 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-dark-700/60 bg-dark-900/40 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3.5 px-4">Branch Name</th>
                  <th className="py-3.5 px-4">Client / Brand</th>
                  <th className="py-3.5 px-4">Address</th>
                  <th className="py-3.5 px-4">Contact Phone</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-700/40 text-slate-200">
                {branches.map((branch) => (
                  <tr key={branch._id} className="hover:bg-dark-700/30 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-100 flex items-center gap-2">
                      <GitFork className="w-4 h-4 text-amber-500" />
                      {branch.name}
                    </td>
                    <td className="py-3.5 px-4 text-slate-300">
                      {branch.clientId?.name || 'N/A'}
                    </td>
                    <td className="py-3.5 px-4 text-slate-300 max-w-[200px] truncate">{branch.address}</td>
                    <td className="py-3.5 px-4 text-slate-300">{branch.phone}</td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={branch.status} />
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-1">
                      <button
                        onClick={() => openEditModal(branch)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-dark-700 transition-colors"
                        title="Edit Branch"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(branch._id, branch.name)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                        title="Delete Branch"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add / Edit Branch Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingBranch ? 'Edit Branch' : 'Add New Dispatch Branch'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {modalError && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs font-semibold">
              {modalError}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Branch Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Domino's Downtown Branch"
              required
              className="w-full bg-dark-900 border border-dark-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          {isAdmin && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Assign to Client *</label>
              <select
                value={formData.clientId}
                onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                required
                className="w-full bg-dark-900 border border-dark-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-amber-500"
              >
                {clients.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Phone Number *</label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+919123456780"
                required
                className="w-full bg-dark-900 border border-dark-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full bg-dark-900 border border-dark-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-amber-500"
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="INACTIVE">INACTIVE</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Address *</label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="e.g. Shop 12, Main Street, Downtown"
              required
              className="w-full bg-dark-900 border border-dark-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-dark-700/60 mt-4">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200 rounded-xl hover:bg-dark-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 text-xs font-bold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-xl transition-all disabled:opacity-50"
            >
              {submitting ? 'Saving...' : editingBranch ? 'Update Branch' : 'Create Branch'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default BranchesPage;
