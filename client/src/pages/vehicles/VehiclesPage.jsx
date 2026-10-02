import React, { useState, useEffect } from 'react';
import { Car, Plus, Edit2, Trash2, Search, RefreshCw, Bike, Truck as VanIcon, Wrench } from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import StatusBadge from '../../components/common/StatusBadge';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorAlert from '../../components/common/ErrorAlert';
import EmptyState from '../../components/common/EmptyState';
import Modal from '../../components/common/Modal';
import {
  validateVehicleNumber,
  validateTextLength,
  validateRequired,
} from '../../utils/validation';

const VehiclesPage = () => {
  const { user } = useAuth();
  const [vehicles, setVehicles] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  const [formData, setFormData] = useState({
    vehicleNumber: '',
    vehicleType: 'BIKE',
    model: '',
    branchId: '',
    status: 'AVAILABLE',
  });

  const isAdmin = user?.role === 'ADMIN';
  const isClient = user?.role === 'CLIENT';

  const fetchVehicles = async () => {
    try {
      setLoading(true);
      setError('');
      let url = '/vehicles';
      const params = new URLSearchParams();
      if (statusFilter !== 'ALL') params.append('status', statusFilter);
      if (search.trim()) params.append('search', search.trim());
      if (params.toString()) url += `?${params.toString()}`;

      const res = await api.get(url);
      if (res.data.success) {
        setVehicles(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching vehicles:', err);
      setError('Failed to fetch vehicles from database.');
    } finally {
      setLoading(false);
    }
  };

  const fetchBranches = async () => {
    try {
      const res = await api.get('/branches');
      if (res.data.success) {
        setBranches(res.data.data);
      }
    } catch (err) {
      console.error('Error loading branches:', err);
    }
  };

  useEffect(() => {
    fetchVehicles();
    fetchBranches();
  }, [statusFilter]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchVehicles();
  };

  const openAddModal = () => {
    setEditingVehicle(null);
    setFormData({
      vehicleNumber: '',
      vehicleType: 'BIKE',
      model: '',
      branchId: branches[0]?._id || '',
      status: 'AVAILABLE',
    });
    setModalError('');
    setFieldErrors({});
    setModalOpen(true);
  };

  const openEditModal = (veh) => {
    setEditingVehicle(veh);
    setFormData({
      vehicleNumber: veh.vehicleNumber,
      vehicleType: veh.vehicleType,
      model: veh.model,
      branchId: veh.branchId?._id || veh.branchId,
      status: veh.status,
    });
    setModalError('');
    setFieldErrors({});
    setModalOpen(true);
  };

  const validateAll = () => {
    const errors = {};
    const vehErr = validateVehicleNumber(formData.vehicleNumber);
    if (vehErr) errors.vehicleNumber = vehErr;

    const modelErr = validateTextLength(formData.model, 'Model / Make', 2, 50);
    if (modelErr) errors.model = modelErr;

    const branchErr = validateRequired(formData.branchId, 'Assigned Branch');
    if (branchErr) errors.branchId = branchErr;

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setModalError('');

    if (!validateAll()) {
      setModalError('Please fix the errors indicated below.');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        vehicleNumber: formData.vehicleNumber.trim().toUpperCase(),
        vehicleType: formData.vehicleType,
        model: formData.model.trim(),
        branchId: formData.branchId,
        status: formData.status,
      };

      if (editingVehicle) {
        await api.put(`/vehicles/${editingVehicle._id}`, payload);
      } else {
        await api.post('/vehicles', payload);
      }
      setModalOpen(false);
      fetchVehicles();
    } catch (err) {
      console.error('Error saving vehicle:', err);
      const msg = err.response?.data?.message || 'Failed to save vehicle.';
      setModalError(msg);
      if (err.response?.data?.errors) {
        setFieldErrors(err.response.data.errors);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id, num) => {
    if (window.confirm(`Are you sure you want to remove vehicle "${num}"?`)) {
      try {
        await api.delete(`/vehicles/${id}`);
        fetchVehicles();
      } catch (err) {
        alert(err.response?.data?.message || 'Failed to delete vehicle');
      }
    }
  };

  const getVehicleIcon = (type) => {
    switch (type) {
      case 'BIKE':
      case 'SCOOTER':
        return <Bike className="w-4 h-4 text-amber-400" />;
      case 'VAN':
        return <VanIcon className="w-4 h-4 text-blue-400" />;
      default:
        return <Car className="w-4 h-4 text-purple-400" />;
    }
  };

  const filterStatuses = ['ALL', 'AVAILABLE', 'ASSIGNED', 'MAINTENANCE', 'INACTIVE'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
            <Car className="w-6 h-6 text-amber-500" />
            Vehicle Management
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Register and monitor delivery bikes, scooters, cars, and vans
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchVehicles}
            className="p-2.5 rounded-xl bg-dark-800 hover:bg-dark-700 border border-dark-700 text-slate-300 hover:text-white transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-amber-400' : ''}`} />
          </button>
          {(isClient || isAdmin) && (
            <button
              onClick={openAddModal}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-slate-950 bg-amber-500 hover:bg-amber-400 transition-all shadow-lg shadow-amber-500/20"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              Add Vehicle
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-dark-800/80 border border-dark-700/60 p-4 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          {filterStatuses.map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                statusFilter === st
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-dark-700/60'
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        <form onSubmit={handleSearch} className="relative flex-shrink-0 w-full md:w-72">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            maxLength={100}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search vehicle number or model..."
            className="w-full bg-dark-900 border border-dark-700 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
        </form>
      </div>

      {error && <ErrorAlert message={error} onRetry={fetchVehicles} />}

      {loading && vehicles.length === 0 ? (
        <LoadingSpinner text="Loading fleet vehicles..." />
      ) : vehicles.length === 0 ? (
        <EmptyState
          title="No vehicles found"
          description="Register a new delivery bike or scooter to begin dispatching deliveries."
          action={
            (isClient || isAdmin) && (
              <button
                onClick={openAddModal}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-950 bg-amber-500 hover:bg-amber-400"
              >
                + Add Vehicle
              </button>
            )
          }
        />
      ) : (
        <div className="bg-dark-800/80 border border-dark-700/60 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-dark-700/60 bg-dark-900/40 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3.5 px-4">Vehicle Number</th>
                  <th className="py-3.5 px-4">Type</th>
                  <th className="py-3.5 px-4">Model</th>
                  <th className="py-3.5 px-4">Branch</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-700/40 text-slate-200">
                {vehicles.map((veh) => (
                  <tr key={veh._id} className="hover:bg-dark-700/30 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-amber-400 flex items-center gap-2">
                      {getVehicleIcon(veh.vehicleType)}
                      {veh.vehicleNumber}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-300">{veh.vehicleType}</td>
                    <td className="py-3.5 px-4 text-slate-200 font-medium">{veh.model}</td>
                    <td className="py-3.5 px-4 text-slate-300">{veh.branchId?.name || 'N/A'}</td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={veh.status} />
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-1">
                      {(isClient || isAdmin) && (
                        <>
                          <button
                            onClick={() => openEditModal(veh)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-dark-700 transition-colors"
                            title="Edit Vehicle"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(veh._id, veh.vehicleNumber)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                            title="Delete Vehicle"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add / Edit Vehicle Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingVehicle ? 'Edit Vehicle' : 'Register New Vehicle'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {modalError && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs font-semibold">
              {modalError}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Vehicle Registration Number *
            </label>
            <input
              type="text"
              maxLength={20}
              value={formData.vehicleNumber}
              onChange={(e) => {
                setFormData({ ...formData, vehicleNumber: e.target.value.toUpperCase() });
                if (fieldErrors.vehicleNumber) setFieldErrors({ ...fieldErrors, vehicleNumber: '' });
              }}
              placeholder="e.g. MH-12-AB-1234"
              required
              className={`w-full bg-dark-900 border ${
                fieldErrors.vehicleNumber ? 'border-rose-500 focus:border-rose-500' : 'border-dark-700 focus:border-amber-500'
              } rounded-xl px-3.5 py-2.5 text-sm font-mono text-slate-100 placeholder-slate-500 uppercase focus:outline-none transition-colors`}
            />
            {fieldErrors.vehicleNumber && (
              <p className="mt-1 text-xs text-rose-400 font-medium">{fieldErrors.vehicleNumber}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Vehicle Type *</label>
              <select
                value={formData.vehicleType}
                onChange={(e) => setFormData({ ...formData, vehicleType: e.target.value })}
                className="w-full bg-dark-900 border border-dark-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-amber-500"
              >
                <option value="BIKE">BIKE</option>
                <option value="SCOOTER">SCOOTER</option>
                <option value="CAR">CAR</option>
                <option value="VAN">VAN</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Initial Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full bg-dark-900 border border-dark-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-amber-500"
              >
                <option value="AVAILABLE">AVAILABLE</option>
                <option value="ASSIGNED">ASSIGNED</option>
                <option value="MAINTENANCE">MAINTENANCE</option>
                <option value="INACTIVE">INACTIVE</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Model / Make *</label>
            <input
              type="text"
              maxLength={50}
              value={formData.model}
              onChange={(e) => {
                setFormData({ ...formData, model: e.target.value });
                if (fieldErrors.model) setFieldErrors({ ...fieldErrors, model: '' });
              }}
              placeholder="e.g. Honda Activa 6G / Hero Splendor"
              required
              className={`w-full bg-dark-900 border ${
                fieldErrors.model ? 'border-rose-500 focus:border-rose-500' : 'border-dark-700 focus:border-amber-500'
              } rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none transition-colors`}
            />
            {fieldErrors.model && (
              <p className="mt-1 text-xs text-rose-400 font-medium">{fieldErrors.model}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Assigned Branch *</label>
            <select
              value={formData.branchId}
              onChange={(e) => {
                setFormData({ ...formData, branchId: e.target.value });
                if (fieldErrors.branchId) setFieldErrors({ ...fieldErrors, branchId: '' });
              }}
              required
              className={`w-full bg-dark-900 border ${
                fieldErrors.branchId ? 'border-rose-500 focus:border-rose-500' : 'border-dark-700 focus:border-amber-500'
              } rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none transition-colors`}
            >
              <option value="">Select Branch...</option>
              {branches.map((b) => (
                <option key={b._id} value={b._id}>
                  {b.name}
                </option>
              ))}
            </select>
            {fieldErrors.branchId && (
              <p className="mt-1 text-xs text-rose-400 font-medium">{fieldErrors.branchId}</p>
            )}
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
              {submitting ? 'Saving...' : editingVehicle ? 'Update Vehicle' : 'Register Vehicle'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default VehiclesPage;
