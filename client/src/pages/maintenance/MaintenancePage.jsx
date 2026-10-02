import React, { useState, useEffect } from 'react';
import { Wrench, Plus, CheckCircle2, RefreshCw, Car, AlertTriangle } from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import StatusBadge from '../../components/common/StatusBadge';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorAlert from '../../components/common/ErrorAlert';
import EmptyState from '../../components/common/EmptyState';
import Modal from '../../components/common/Modal';

const MaintenancePage = () => {
  const { user } = useAuth();
  const [maintenances, setMaintenances] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState('');
  const [completingId, setCompletingId] = useState(null);

  const [formData, setFormData] = useState({
    vehicleId: '',
    description: '',
    cost: '',
  });

  const fetchMaintenances = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/maintenance');
      if (res.data.success) {
        setMaintenances(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching maintenance:', err);
      setError('Failed to load maintenance records.');
    } finally {
      setLoading(false);
    }
  };

  const fetchVehicles = async () => {
    try {
      const res = await api.get('/vehicles');
      if (res.data.success) {
        setVehicles(res.data.data);
      }
    } catch (err) {
      console.error('Error loading vehicles:', err);
    }
  };

  useEffect(() => {
    fetchMaintenances();
    fetchVehicles();
  }, []);

  const openAddModal = () => {
    setFormData({
      vehicleId: vehicles[0]?._id || '',
      description: '',
      cost: '',
    });
    setModalError('');
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.vehicleId || !formData.description.trim()) {
      setModalError('Vehicle and Description are required.');
      return;
    }

    try {
      setSubmitting(true);
      await api.post('/maintenance', {
        vehicleId: formData.vehicleId,
        description: formData.description.trim(),
        cost: formData.cost ? Number(formData.cost) : 0,
      });

      setModalOpen(false);
      fetchMaintenances();
      fetchVehicles();
    } catch (err) {
      console.error('Error scheduling maintenance:', err);
      setModalError(err.response?.data?.message || 'Failed to schedule maintenance.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleComplete = async (maintId) => {
    try {
      setCompletingId(maintId);
      const res = await api.patch(`/maintenance/${maintId}/complete`);
      if (res.data.success) {
        fetchMaintenances();
        fetchVehicles();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to complete maintenance');
    } finally {
      setCompletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
            <Wrench className="w-6 h-6 text-amber-500" />
            Vehicle Maintenance
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Track repairs and safety servicing. Vehicles in maintenance are locked from delivery assignment.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchMaintenances}
            className="p-2.5 rounded-xl bg-dark-800 hover:bg-dark-700 border border-dark-700 text-slate-300 hover:text-white transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-amber-400' : ''}`} />
          </button>
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-slate-950 bg-amber-500 hover:bg-amber-400 transition-all shadow-lg shadow-amber-500/20"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            Schedule Service
          </button>
        </div>
      </div>

      {error && <ErrorAlert message={error} onRetry={fetchMaintenances} />}

      {loading && maintenances.length === 0 ? (
        <LoadingSpinner text="Loading maintenance records from MongoDB..." />
      ) : maintenances.length === 0 ? (
        <EmptyState
          title="No maintenance records"
          description="All vehicles are in active working condition. Schedule a service when a vehicle requires oil change, brake, or tire repairs."
          action={
            <button
              onClick={openAddModal}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-950 bg-amber-500 hover:bg-amber-400"
            >
              + Schedule Service
            </button>
          }
        />
      ) : (
        <div className="bg-dark-800/80 border border-dark-700/60 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-dark-700/60 bg-dark-900/40 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3.5 px-4">Vehicle</th>
                  <th className="py-3.5 px-4">Issue / Description</th>
                  <th className="py-3.5 px-4">Start Date</th>
                  <th className="py-3.5 px-4">Completion Date</th>
                  <th className="py-3.5 px-4">Cost</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-700/40 text-slate-200">
                {maintenances.map((m) => (
                  <tr key={m._id} className="hover:bg-dark-700/30 transition-colors">
                    <td className="py-3.5 px-4">
                      <p className="font-mono font-bold text-amber-400">
                        {m.vehicleId?.vehicleNumber || 'Unknown'}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {m.vehicleId?.model} ({m.vehicleId?.vehicleType})
                      </p>
                    </td>

                    <td className="py-3.5 px-4 max-w-[220px]">
                      <p className="text-slate-200 truncate font-medium" title={m.description}>
                        {m.description}
                      </p>
                    </td>

                    <td className="py-3.5 px-4 text-slate-300">
                      {new Date(m.startDate).toLocaleDateString()}
                    </td>

                    <td className="py-3.5 px-4 text-slate-400">
                      {m.endDate ? new Date(m.endDate).toLocaleDateString() : '— In Progress —'}
                    </td>

                    <td className="py-3.5 px-4 font-semibold text-slate-200">₹{m.cost || 0}</td>

                    <td className="py-3.5 px-4">
                      <StatusBadge status={m.status} />
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      {m.status !== 'COMPLETED' ? (
                        <button
                          onClick={() => handleComplete(m._id)}
                          disabled={completingId === m._id}
                          className="flex items-center gap-1.5 px-3 py-1 text-xs font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-colors ml-auto disabled:opacity-50"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Mark Ready
                        </button>
                      ) : (
                        <span className="text-[11px] text-emerald-400 font-semibold">Done</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Schedule Maintenance Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Schedule Vehicle Maintenance"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-300 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-400" />
            <p>
              Putting a vehicle into maintenance will set its status to <strong>MAINTENANCE</strong>.
              It will not be available for delivery dispatch until marked completed.
            </p>
          </div>

          {modalError && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs font-semibold">
              {modalError}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Select Vehicle *</label>
            <select
              value={formData.vehicleId}
              onChange={(e) => setFormData({ ...formData, vehicleId: e.target.value })}
              required
              className="w-full bg-dark-900 border border-dark-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-amber-500"
            >
              {vehicles.map((v) => (
                <option key={v._id} value={v._id}>
                  {v.vehicleNumber} — {v.model} (Status: {v.status})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Issue / Description *</label>
            <textarea
              rows="3"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="e.g. Engine oil replacement, rear brake pad wear, tire alignment"
              required
              className="w-full bg-dark-900 border border-dark-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Estimated Cost (₹)</label>
            <input
              type="number"
              min="0"
              value={formData.cost}
              onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
              placeholder="e.g. 1200"
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
              disabled={submitting || vehicles.length === 0}
              className="px-5 py-2 text-xs font-bold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-xl transition-all disabled:opacity-50"
            >
              {submitting ? 'Scheduling...' : 'Start Maintenance'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default MaintenancePage;
