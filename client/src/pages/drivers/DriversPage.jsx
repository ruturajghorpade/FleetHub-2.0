import React, { useState, useEffect } from 'react';
import {
  Users,
  Plus,
  Edit2,
  Trash2,
  Search,
  RefreshCw,
  Phone,
  CreditCard,
  Building2,
  GitFork,
  AlertTriangle,
  CheckCircle,
  X,
} from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import StatusBadge from '../../components/common/StatusBadge';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorAlert from '../../components/common/ErrorAlert';
import EmptyState from '../../components/common/EmptyState';
import Modal from '../../components/common/Modal';
import {
  validateName,
  validatePhone,
  validateTextLength,
  validateRequired,
  formatPhoneInput,
} from '../../utils/validation';

const DriversPage = () => {
  const { user } = useAuth();
  const [drivers, setDrivers] = useState([]);
  const [clients, setClients] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Add / Edit Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  // Delete Confirmation Modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [driverToDelete, setDriverToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // Toast notification
  const [toast, setToast] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    licenseNumber: '',
    clientId: '',
    branchId: '',
    status: 'AVAILABLE',
  });

  // Strict role permissions: ONLY SUPER_ADMIN and ADMIN can manage drivers
  const canManageDrivers = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN';
  const isClient = user?.role === 'CLIENT';

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4500);
  };

  // Fetch drivers live from MongoDB (bypassing any cache)
  const fetchDrivers = async () => {
    try {
      setLoading(true);
      setError('');
      let url = '/drivers';
      const params = new URLSearchParams();
      if (statusFilter !== 'ALL') params.append('status', statusFilter);
      if (search.trim()) params.append('search', search.trim());
      params.append('_t', Date.now().toString());

      url += `?${params.toString()}`;

      const res = await api.get(url);
      if (res.data.success) {
        setDrivers(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching drivers:', err);
      setError(err.response?.data?.message || 'Failed to fetch drivers from database.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch branches
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

  // Fetch clients (for SUPER_ADMIN and ADMIN driver assignment)
  const fetchClients = async () => {
    if (!canManageDrivers) return;
    try {
      const res = await api.get('/clients');
      if (res.data.success) {
        setClients(res.data.data);
      }
    } catch (err) {
      console.error('Error loading clients:', err);
    }
  };

  useEffect(() => {
    fetchDrivers();
    fetchBranches();
    if (canManageDrivers) {
      fetchClients();
    }
  }, [statusFilter]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchDrivers();
  };

  const handleManualRefresh = async () => {
    await fetchDrivers();
    showToast('Driver list refreshed from database.', 'info');
  };

  // Open Add Driver Modal
  const openAddModal = () => {
    if (!canManageDrivers) {
      showToast('You are not authorized to create drivers.', 'error');
      return;
    }
    const defaultClient = clients[0]?._id || branches[0]?.clientId?._id || branches[0]?.clientId || '';
    const filteredBranches = defaultClient
      ? branches.filter((b) => (b.clientId?._id || b.clientId)?.toString() === defaultClient.toString())
      : branches;

    setEditingDriver(null);
    setFormData({
      name: '',
      phone: '',
      licenseNumber: '',
      clientId: defaultClient,
      branchId: filteredBranches[0]?._id || branches[0]?._id || '',
      status: 'AVAILABLE',
    });
    setModalError('');
    setFieldErrors({});
    setModalOpen(true);
  };

  // Open Edit Driver Modal
  const openEditModal = (drv) => {
    if (!canManageDrivers) {
      showToast('You are not authorized to edit drivers.', 'error');
      return;
    }
    setEditingDriver(drv);
    const drvClientId = (drv.clientId?._id || drv.clientId || '')?.toString();
    const drvBranchId = (drv.branchId?._id || drv.branchId || '')?.toString();

    setFormData({
      name: drv.name,
      phone: drv.phone,
      licenseNumber: drv.licenseNumber,
      clientId: drvClientId,
      branchId: drvBranchId,
      status: drv.status,
    });
    setModalError('');
    setFieldErrors({});
    setModalOpen(true);
  };

  // When client selection changes in modal, update available branches
  const handleClientChange = (selectedClientId) => {
    const matchingBranches = branches.filter(
      (b) => (b.clientId?._id || b.clientId)?.toString() === selectedClientId.toString()
    );
    setFormData((prev) => ({
      ...prev,
      clientId: selectedClientId,
      branchId: matchingBranches[0]?._id || '',
    }));
  };

  const validateAll = () => {
    const errors = {};
    const nameErr = validateName(formData.name, 'Driver Name');
    if (nameErr) errors.name = nameErr;

    const phoneErr = validatePhone(formData.phone);
    if (phoneErr) errors.phone = phoneErr;

    const licenseErr = validateTextLength(formData.licenseNumber, 'Driving License Number', 4, 30);
    if (licenseErr) errors.licenseNumber = licenseErr;

    const clientErr = validateRequired(formData.clientId, 'Client Organization');
    if (clientErr) errors.clientId = clientErr;

    const branchErr = validateRequired(formData.branchId, 'Assigned Branch');
    if (branchErr) errors.branchId = branchErr;

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Submit Driver Form
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canManageDrivers) {
      setModalError('You are not authorized to modify drivers.');
      return;
    }
    setModalError('');

    if (!validateAll()) {
      setModalError('Please fix the errors indicated below.');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        licenseNumber: formData.licenseNumber.trim().toUpperCase(),
        clientId: formData.clientId,
        branchId: formData.branchId,
        status: formData.status,
      };

      if (editingDriver) {
        const res = await api.put(`/drivers/${editingDriver._id}`, payload);
        showToast(res.data.message || 'Driver updated successfully.');
      } else {
        const res = await api.post('/drivers', payload);
        showToast(res.data.message || 'Driver created successfully.');
      }
      setModalOpen(false);
      // Immediately refetch from MongoDB to ensure UI is in 100% sync
      await fetchDrivers();
    } catch (err) {
      console.error('Error saving driver:', err);
      const msg = err.response?.data?.message || 'Failed to save driver.';
      setModalError(msg);
      if (err.response?.data?.errors) {
        setFieldErrors(err.response.data.errors);
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Open Delete Confirmation Dialog
  const openDeleteDialog = (drv) => {
    if (!canManageDrivers) {
      showToast('You are not authorized to delete drivers.', 'error');
      return;
    }
    setDriverToDelete(drv);
    setDeleteError('');
    setDeleteModalOpen(true);
  };

  // Confirm and Execute Driver Deletion
  const confirmDelete = async () => {
    if (!driverToDelete) return;
    const id = driverToDelete._id;
    const driverName = driverToDelete.name;

    try {
      setDeleting(true);
      setDeleteError('');

      // Send DELETE request to backend
      const res = await api.delete(`/drivers/${id}`);

      // Immediately update local state so driver is removed from UI without delay
      setDrivers((prev) => prev.filter((d) => d._id !== id));
      setDeleteModalOpen(false);
      setDriverToDelete(null);

      showToast(res.data.message || `Driver "${driverName}" removed successfully.`);

      // Also trigger fresh fetch from MongoDB
      await fetchDrivers();
    } catch (err) {
      console.error('Error deleting driver:', err);
      const errMsg = err.response?.data?.message || 'Unable to delete driver.';
      setDeleteError(errMsg);
      // If backend failed, ensure UI stays in sync with actual database
      await fetchDrivers();
    } finally {
      setDeleting(false);
    }
  };

  // Filter branches based on currently selected client in form
  const availableBranchesForForm = formData.clientId
    ? branches.filter(
        (b) => (b.clientId?._id || b.clientId)?.toString() === formData.clientId.toString()
      )
    : branches;

  const filterStatuses = ['ALL', 'AVAILABLE', 'ASSIGNED', 'INACTIVE'];

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl border backdrop-blur-md transition-all ${
            toast.type === 'error'
              ? 'bg-rose-950/90 text-rose-200 border-rose-500/30'
              : toast.type === 'info'
              ? 'bg-sky-950/90 text-sky-200 border-sky-500/30'
              : 'bg-emerald-950/90 text-emerald-200 border-emerald-500/30'
          }`}
        >
          {toast.type === 'error' ? (
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          ) : (
            <CheckCircle className="w-4 h-4 text-emerald-400" />
          )}
          <span className="text-xs font-semibold">{toast.message}</span>
          <button
            onClick={() => setToast(null)}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
            <Users className="w-6 h-6 text-amber-500" />
            {isClient ? 'Assigned Drivers' : 'Driver Management'}
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            {isClient
              ? 'View delivery drivers assigned to your restaurant branches'
              : 'Rider profiles, driving licenses, and delivery dispatch availability'}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleManualRefresh}
            title="Refresh from MongoDB"
            className="p-2.5 rounded-xl bg-dark-800 hover:bg-dark-700 border border-dark-700 text-slate-300 hover:text-white transition-colors flex items-center gap-1.5 text-xs font-semibold"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-amber-400' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          {canManageDrivers && (
            <button
              onClick={openAddModal}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-slate-950 bg-amber-500 hover:bg-amber-400 transition-all shadow-lg shadow-amber-500/20"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              Add Driver
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
            placeholder="Search driver name, phone, license..."
            className="w-full bg-dark-900 border border-dark-700 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
        </form>
      </div>

      {error && <ErrorAlert message={error} onRetry={fetchDrivers} />}

      {loading && drivers.length === 0 ? (
        <LoadingSpinner text="Fetching fresh driver data from database..." />
      ) : drivers.length === 0 ? (
        <EmptyState
          title={isClient ? 'No assigned drivers' : 'No drivers found'}
          description={
            isClient
              ? 'There are currently no drivers assigned to your restaurant branches.'
              : 'Add delivery drivers/riders to assign them to incoming orders.'
          }
          action={
            canManageDrivers && (
              <button
                onClick={openAddModal}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-950 bg-amber-500 hover:bg-amber-400"
              >
                + Add Driver
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
                  <th className="py-3.5 px-4">Driver Name</th>
                  <th className="py-3.5 px-4">Phone Number</th>
                  <th className="py-3.5 px-4">License Number</th>
                  {!isClient && <th className="py-3.5 px-4">Client Org</th>}
                  <th className="py-3.5 px-4">Branch</th>
                  <th className="py-3.5 px-4">Status</th>
                  {canManageDrivers && <th className="py-3.5 px-4 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-700/40 text-slate-200">
                {drivers.map((drv) => (
                  <tr key={drv._id} className="hover:bg-dark-700/30 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-100 flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-xs">
                        {drv.name ? drv.name.charAt(0).toUpperCase() : 'D'}
                      </div>
                      <div>
                        <div>{drv.name}</div>
                        <div className="text-[10px] font-normal text-slate-500 font-mono">
                          ID: {drv._id.slice(-6)}
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-300 font-mono">{drv.phone}</td>
                    <td className="py-3.5 px-4 font-mono text-slate-300">{drv.licenseNumber}</td>
                    {!isClient && (
                      <td className="py-3.5 px-4 text-slate-300">
                        {drv.clientId?.name || 'Unassigned'}
                      </td>
                    )}
                    <td className="py-3.5 px-4 text-slate-300">
                      {drv.branchId?.name || 'Unassigned'}
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={drv.status} />
                    </td>

                    {/* Actions column: rendered ONLY for SUPER_ADMIN and ADMIN */}
                    {canManageDrivers && (
                      <td className="py-3.5 px-4 text-right space-x-1">
                        <button
                          onClick={() => openEditModal(drv)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-dark-700 transition-colors"
                          title="Edit Driver"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => openDeleteDialog(drv)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                          title="Delete Driver"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add / Edit Driver Modal (SUPER_ADMIN and ADMIN only) */}
      {canManageDrivers && (
        <Modal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          title={editingDriver ? `Edit Driver: ${editingDriver.name}` : 'Register New Delivery Driver'}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            {modalError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Driver Full Name *
              </label>
              <input
                type="text"
                maxLength={50}
                value={formData.name}
                onChange={(e) => {
                  setFormData({ ...formData, name: e.target.value });
                  if (fieldErrors.name) setFieldErrors({ ...fieldErrors, name: '' });
                }}
                placeholder="e.g. Rahul Sharma"
                required
                className={`w-full bg-dark-900 border ${
                  fieldErrors.name ? 'border-rose-500 focus:border-rose-500' : 'border-dark-700 focus:border-amber-500'
                } rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none transition-colors`}
              />
              {fieldErrors.name && (
                <p className="mt-1 text-xs text-rose-400 font-medium">{fieldErrors.name}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  value={formData.phone}
                  onChange={(e) => {
                    const formatted = formatPhoneInput(e.target.value);
                    setFormData({ ...formData, phone: formatted });
                    if (fieldErrors.phone) setFieldErrors({ ...fieldErrors, phone: '' });
                  }}
                  placeholder="10-digit mobile (e.g. 9876543210)"
                  required
                  className={`w-full bg-dark-900 border ${
                    fieldErrors.phone ? 'border-rose-500 focus:border-rose-500' : 'border-dark-700 focus:border-amber-500'
                  } rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none transition-colors font-mono`}
                />
                {fieldErrors.phone && (
                  <p className="mt-1 text-xs text-rose-400 font-medium">{fieldErrors.phone}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Driver Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full bg-dark-900 border border-dark-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-amber-500"
                >
                  <option value="AVAILABLE">AVAILABLE</option>
                  <option value="ASSIGNED">ASSIGNED</option>
                  <option value="INACTIVE">INACTIVE</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Driving License Number *
              </label>
              <input
                type="text"
                maxLength={30}
                value={formData.licenseNumber}
                onChange={(e) => {
                  setFormData({ ...formData, licenseNumber: e.target.value.toUpperCase() });
                  if (fieldErrors.licenseNumber) setFieldErrors({ ...fieldErrors, licenseNumber: '' });
                }}
                placeholder="e.g. DL-MH12-98765"
                required
                className={`w-full bg-dark-900 border ${
                  fieldErrors.licenseNumber ? 'border-rose-500 focus:border-rose-500' : 'border-dark-700 focus:border-amber-500'
                } rounded-xl px-3.5 py-2.5 text-sm font-mono text-slate-100 placeholder-slate-500 uppercase focus:outline-none transition-colors`}
              />
              {fieldErrors.licenseNumber && (
                <p className="mt-1 text-xs text-rose-400 font-medium">{fieldErrors.licenseNumber}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Client Organization *
                </label>
                <select
                  value={formData.clientId}
                  onChange={(e) => {
                    handleClientChange(e.target.value);
                    if (fieldErrors.clientId) setFieldErrors({ ...fieldErrors, clientId: '' });
                  }}
                  required
                  className={`w-full bg-dark-900 border ${
                    fieldErrors.clientId ? 'border-rose-500 focus:border-rose-500' : 'border-dark-700 focus:border-amber-500'
                  } rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none transition-colors`}
                >
                  <option value="">Select Client...</option>
                  {clients.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                {fieldErrors.clientId && (
                  <p className="mt-1 text-xs text-rose-400 font-medium">{fieldErrors.clientId}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Assigned Branch *
                </label>
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
                  {availableBranchesForForm.map((b) => (
                    <option key={b._id} value={b._id}>
                      {b.name}
                    </option>
                  ))}
                </select>
                {fieldErrors.branchId && (
                  <p className="mt-1 text-xs text-rose-400 font-medium">{fieldErrors.branchId}</p>
                )}
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-dark-700/60 mt-4">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200 rounded-xl hover:bg-dark-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2 text-xs font-bold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-xl transition-all disabled:opacity-50"
              >
                {submitting ? 'Saving...' : editingDriver ? 'Update Driver' : 'Register Driver'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Styled Delete Confirmation Dialog Modal */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => {
          if (!deleting) setDeleteModalOpen(false);
        }}
        title="Confirm Driver Deletion"
      >
        <div className="space-y-4">
          {deleteError && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{deleteError}</span>
            </div>
          )}

          <div className="flex items-start gap-3 p-3.5 bg-dark-900/80 rounded-xl border border-dark-700/60">
            <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400 shrink-0">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">
                Are you sure you want to delete this driver?
              </p>
              <p className="text-xs text-amber-400 font-semibold mt-0.5">
                {driverToDelete?.name} ({driverToDelete?.licenseNumber})
              </p>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                If this driver has historical delivery records, they will be archived and set to
                status <span className="text-slate-200 font-mono">INACTIVE</span> to preserve delivery history. Drivers with active in-progress deliveries cannot be deleted until orders are completed.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-dark-700/60">
            <button
              type="button"
              disabled={deleting}
              onClick={() => setDeleteModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200 rounded-xl hover:bg-dark-700 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={deleting}
              onClick={confirmDelete}
              className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-xl transition-all shadow-md shadow-rose-600/20 disabled:opacity-50 flex items-center gap-1.5"
            >
              {deleting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Deleting...</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Driver</span>
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default DriversPage;
