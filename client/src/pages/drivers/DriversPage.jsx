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
  KeyRound,
  Copy,
  Check,
  Eye,
  Calendar,
  MapPin,
  Mail,
  ToggleLeft,
  ToggleRight,
  Package,
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
  validateEmail,
  validatePhone,
  validateTextLength,
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

  // Credentials Delivery Modal state (Shows temporary password with copy button)
  const [credentialsModalOpen, setCredentialsModalOpen] = useState(false);
  const [credentialInfo, setCredentialInfo] = useState(null);
  const [copied, setCopied] = useState(false);

  // View Driver Modal state
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [driverToView, setDriverToView] = useState(null);

  // Reset Password Modal state
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [driverToReset, setDriverToReset] = useState(null);
  const [resetting, setResetting] = useState(false);
  const [resetError, setResetError] = useState('');

  // Delete Confirmation Modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [driverToDelete, setDriverToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // Toast notification
  const [toast, setToast] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    licenseNumber: '',
    licenseExpiryDate: '',
    address: '',
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

  // Fetch drivers live from database
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

  // Copy password helper
  const handleCopyPassword = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
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
      email: '',
      phone: '',
      licenseNumber: '',
      licenseExpiryDate: '',
      address: '',
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

    let expiryStr = '';
    if (drv.licenseExpiryDate) {
      expiryStr = new Date(drv.licenseExpiryDate).toISOString().split('T')[0];
    }

    setFormData({
      name: drv.name || '',
      email: drv.email || drv.userId?.email || '',
      phone: drv.phone || '',
      licenseNumber: drv.licenseNumber || '',
      licenseExpiryDate: expiryStr,
      address: drv.address || drv.userId?.address || '',
      clientId: drvClientId,
      branchId: drvBranchId,
      status: drv.status || 'AVAILABLE',
    });
    setModalError('');
    setFieldErrors({});
    setModalOpen(true);
  };

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

    const emailErr = validateEmail(formData.email, 'Email Address');
    if (emailErr) errors.email = emailErr;

    const phoneErr = validatePhone(formData.phone, 'Phone Number');
    if (phoneErr) errors.phone = phoneErr;

    const licenseErr = validateTextLength(formData.licenseNumber, 'Driving License Number', 5, 30);
    if (licenseErr) errors.licenseNumber = licenseErr;

    if (!editingDriver && !formData.licenseExpiryDate) {
      errors.licenseExpiryDate = 'License Expiry Date is required.';
    }

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
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.trim(),
        licenseNumber: formData.licenseNumber.trim().toUpperCase(),
        licenseExpiryDate: formData.licenseExpiryDate || null,
        address: formData.address.trim(),
        clientId: formData.clientId || null,
        branchId: formData.branchId || null,
        status: formData.status,
      };

      if (editingDriver) {
        const res = await api.put(`/drivers/${editingDriver._id}`, payload);
        showToast(res.data.message || 'Driver updated successfully.');
        setModalOpen(false);
      } else {
        const res = await api.post('/drivers', payload);
        setModalOpen(false);
        // Show Credentials modal with the one-time temporary password!
        if (res.data?.data?.temporaryPassword) {
          setCredentialInfo({
            name: res.data.data.driver.name,
            email: res.data.data.driver.email,
            temporaryPassword: res.data.data.temporaryPassword,
            isReset: false,
          });
          setCredentialsModalOpen(true);
        } else {
          showToast(res.data.message || 'Driver created successfully.');
        }
      }

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

  // Open Reset Password Dialog
  const openResetDialog = (drv) => {
    if (!canManageDrivers) {
      showToast('You are not authorized to reset driver passwords.', 'error');
      return;
    }
    setDriverToReset(drv);
    setResetError('');
    setResetModalOpen(true);
  };

  // Confirm Reset Password
  const confirmResetPassword = async () => {
    if (!driverToReset) return;
    try {
      setResetting(true);
      setResetError('');

      const res = await api.post(`/drivers/${driverToReset._id}/reset-password`);
      setResetModalOpen(false);

      if (res.data?.data?.temporaryPassword) {
        setCredentialInfo({
          name: driverToReset.name,
          email: res.data.data.driver.email || driverToReset.email,
          temporaryPassword: res.data.data.temporaryPassword,
          isReset: true,
        });
        setCredentialsModalOpen(true);
      } else {
        showToast('Password reset successfully.');
      }
    } catch (err) {
      console.error('Error resetting password:', err);
      setResetError(err.response?.data?.message || 'Failed to reset password.');
    } finally {
      setResetting(false);
    }
  };

  // Toggle Driver Status (Active / Inactive)
  const handleToggleStatus = async (drv) => {
    if (!canManageDrivers) return;
    const isCurrentlyInactive = drv.status === 'INACTIVE';
    const targetStatus = isCurrentlyInactive ? 'ACTIVE' : 'INACTIVE';

    try {
      const res = await api.patch(`/drivers/${drv._id}/status`, { status: targetStatus });
      showToast(res.data.message || `Driver status updated to ${targetStatus}`);
      await fetchDrivers();
    } catch (err) {
      console.error('Failed to toggle status:', err);
      showToast(err.response?.data?.message || 'Failed to update status', 'error');
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
      const res = await api.delete(`/drivers/${id}`);
      setDrivers((prev) => prev.filter((d) => d._id !== id));
      setDeleteModalOpen(false);
      setDriverToDelete(null);
      showToast(res.data.message || `Driver "${driverName}" removed successfully.`);
      await fetchDrivers();
    } catch (err) {
      console.error('Error deleting driver:', err);
      const errMsg = err.response?.data?.message || 'Unable to delete driver.';
      setDeleteError(errMsg);
      await fetchDrivers();
    } finally {
      setDeleting(false);
    }
  };

  const filterStatuses = ['ALL', 'AVAILABLE', 'ASSIGNED', 'BUSY', 'OFF_DUTY', 'INACTIVE'];

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
              : 'FleetHub resource directory, login credentials, and real-time dispatch availability'}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleManualRefresh}
            title="Refresh from MongoDB"
            className="p-2.5 rounded-xl bg-dark-800 hover:bg-dark-700 border border-dark-700 text-slate-300 hover:text-white transition-colors flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-amber-400' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          {canManageDrivers && (
            <button
              onClick={openAddModal}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-slate-950 bg-amber-500 hover:bg-amber-400 transition-all shadow-lg shadow-amber-500/20 cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              Create Driver Account
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
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                statusFilter === st
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-dark-700/60'
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        <form onSubmit={handleSearch} className="relative flex-shrink-0 w-full md:w-80">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            maxLength={100}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search driver name, email, phone, license..."
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
              : 'Add delivery drivers to assign them to incoming customer orders.'
          }
          action={
            canManageDrivers && (
              <button
                onClick={openAddModal}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-950 bg-amber-500 hover:bg-amber-400 cursor-pointer"
              >
                + Create Driver Account
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
                  <th className="py-3.5 px-4">Driver &amp; Account</th>
                  <th className="py-3.5 px-4">Phone / Contact</th>
                  <th className="py-3.5 px-4">License Details</th>
                  <th className="py-3.5 px-4">Current Assignment</th>
                  <th className="py-3.5 px-4">Availability</th>
                  {canManageDrivers && <th className="py-3.5 px-4 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-700/40 text-slate-200">
                {drivers.map((drv) => (
                  <tr key={drv._id} className="hover:bg-dark-700/30 transition-colors">
                    {/* Driver Name & Email */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-xs shrink-0">
                          {drv.name ? drv.name.charAt(0).toUpperCase() : 'D'}
                        </div>
                        <div>
                          <div className="font-bold text-slate-100 flex items-center gap-1.5">
                            <span>{drv.name}</span>
                            {drv.status === 'INACTIVE' && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-500/10 text-rose-400 font-semibold border border-rose-500/20">
                                Inactive
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                            <Mail className="w-3 h-3 text-slate-500" />
                            <span>{drv.email || drv.userId?.email || '—'}</span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Phone */}
                    <td className="py-3.5 px-4">
                      <div className="font-mono text-slate-200 flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-amber-500/80" />
                        <span>{drv.phone}</span>
                      </div>
                      {drv.address && (
                        <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5 max-w-[180px] truncate" title={drv.address}>
                          <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
                          <span className="truncate">{drv.address}</span>
                        </div>
                      )}
                    </td>

                    {/* License Number & Expiry */}
                    <td className="py-3.5 px-4">
                      <div className="font-mono font-semibold text-slate-200 uppercase">
                        {drv.licenseNumber}
                      </div>
                      {drv.licenseExpiryDate && (
                        <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <Calendar className="w-3 h-3 text-slate-500" />
                          <span>Exp: {new Date(drv.licenseExpiryDate).toLocaleDateString()}</span>
                        </div>
                      )}
                    </td>

                    {/* Current Assignment */}
                    <td className="py-3.5 px-4">
                      {drv.currentDelivery ? (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 font-mono text-[11px] font-bold">
                          <Package className="w-3.5 h-3.5 text-amber-400" />
                          <span>{drv.currentDelivery.orderId}</span>
                          <span className="text-[9px] px-1 py-0.2 rounded bg-amber-500/20 text-amber-200 font-sans">
                            {drv.currentDelivery.status.replace(/_/g, ' ')}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-500 text-xs italic">No active order</span>
                      )}
                    </td>

                    {/* Status Badge */}
                    <td className="py-3.5 px-4">
                      <StatusBadge status={drv.status} />
                    </td>

                    {/* Actions */}
                    {canManageDrivers && (
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* View details */}
                          <button
                            onClick={() => {
                              setDriverToView(drv);
                              setViewModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-dark-700 transition-colors cursor-pointer"
                            title="View Driver Details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* Reset Password */}
                          <button
                            onClick={() => openResetDialog(drv)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-dark-700 transition-colors cursor-pointer"
                            title="Reset Credentials / Generate Temp Password"
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                          </button>

                          {/* Toggle Active / Inactive */}
                          <button
                            onClick={() => handleToggleStatus(drv)}
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                              drv.status === 'INACTIVE'
                                ? 'text-rose-400 hover:bg-rose-500/20'
                                : 'text-emerald-400 hover:bg-emerald-500/20'
                            }`}
                            title={drv.status === 'INACTIVE' ? 'Activate Driver' : 'Deactivate Driver'}
                          >
                            {drv.status === 'INACTIVE' ? (
                              <ToggleLeft className="w-4 h-4" />
                            ) : (
                              <ToggleRight className="w-4 h-4" />
                            )}
                          </button>

                          {/* Edit Driver */}
                          <button
                            onClick={() => openEditModal(drv)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-dark-700 transition-colors cursor-pointer"
                            title="Edit Driver"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete Driver */}
                          <button
                            onClick={() => openDeleteDialog(drv)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                            title="Delete Driver"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 1. Add / Edit Driver Modal (SUPER_ADMIN and ADMIN only) */}
      {canManageDrivers && (
        <Modal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          title={editingDriver ? `Edit Driver: ${editingDriver.name}` : 'Create Driver Account'}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            {modalError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            {!editingDriver && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-300 text-xs leading-relaxed">
                <p className="font-semibold text-amber-200">Automatic Account Provisioning</p>
                <p className="text-[11px] text-amber-300/80 mt-0.5">
                  Creating this driver automatically provisions their User login with role{' '}
                  <span className="font-bold text-white">DRIVER</span> and generates a secure temporary password you can share with them.
                </p>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Full Name <span className="text-amber-400">*</span>
              </label>
              <input
                type="text"
                maxLength={50}
                value={formData.name}
                onChange={(e) => {
                  setFormData({ ...formData, name: e.target.value });
                  if (fieldErrors.name) setFieldErrors({ ...fieldErrors, name: '' });
                }}
                placeholder="e.g. Rahul Patil"
                required
                className={`w-full bg-dark-900 border ${
                  fieldErrors.name ? 'border-rose-500 focus:border-rose-500' : 'border-dark-700 focus:border-amber-500'
                } rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none transition-colors`}
              />
              {fieldErrors.name && (
                <p className="mt-1 text-xs text-rose-400 font-medium">{fieldErrors.name}</p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Login Email Address <span className="text-amber-400">*</span>
                </label>
                <input
                  type="email"
                  maxLength={100}
                  value={formData.email}
                  onChange={(e) => {
                    setFormData({ ...formData, email: e.target.value });
                    if (fieldErrors.email) setFieldErrors({ ...fieldErrors, email: '' });
                  }}
                  placeholder="rahul@fleethub.com"
                  required
                  className={`w-full bg-dark-900 border ${
                    fieldErrors.email ? 'border-rose-500 focus:border-rose-500' : 'border-dark-700 focus:border-amber-500'
                  } rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none transition-colors`}
                />
                {fieldErrors.email && (
                  <p className="mt-1 text-xs text-rose-400 font-medium">{fieldErrors.email}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Mobile Phone Number <span className="text-amber-400">*</span>
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
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Driving License Number <span className="text-amber-400">*</span>
                </label>
                <input
                  type="text"
                  maxLength={30}
                  value={formData.licenseNumber}
                  onChange={(e) => {
                    setFormData({ ...formData, licenseNumber: e.target.value.toUpperCase() });
                    if (fieldErrors.licenseNumber) setFieldErrors({ ...fieldErrors, licenseNumber: '' });
                  }}
                  placeholder="e.g. MH12-2022-0045678"
                  required
                  className={`w-full bg-dark-900 border ${
                    fieldErrors.licenseNumber ? 'border-rose-500 focus:border-rose-500' : 'border-dark-700 focus:border-amber-500'
                  } rounded-xl px-3.5 py-2.5 text-sm font-mono text-slate-100 placeholder-slate-500 uppercase focus:outline-none transition-colors`}
                />
                {fieldErrors.licenseNumber && (
                  <p className="mt-1 text-xs text-rose-400 font-medium">{fieldErrors.licenseNumber}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  License Expiry Date {!editingDriver && <span className="text-amber-400">*</span>}
                </label>
                <input
                  type="date"
                  value={formData.licenseExpiryDate}
                  onChange={(e) => {
                    setFormData({ ...formData, licenseExpiryDate: e.target.value });
                    if (fieldErrors.licenseExpiryDate) setFieldErrors({ ...fieldErrors, licenseExpiryDate: '' });
                  }}
                  required={!editingDriver}
                  className={`w-full bg-dark-900 border ${
                    fieldErrors.licenseExpiryDate ? 'border-rose-500 focus:border-rose-500' : 'border-dark-700 focus:border-amber-500'
                  } rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none transition-colors`}
                />
                {fieldErrors.licenseExpiryDate && (
                  <p className="mt-1 text-xs text-rose-400 font-medium">{fieldErrors.licenseExpiryDate}</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Residential Address / Location
              </label>
              <input
                type="text"
                maxLength={200}
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="e.g. Kothrud, Pune, Maharashtra"
                className="w-full bg-dark-900 border border-dark-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Availability / Duty Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full bg-dark-900 border border-dark-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-amber-500"
                >
                  <option value="AVAILABLE">AVAILABLE (Ready for assignment)</option>
                  <option value="OFF_DUTY">OFF_DUTY (Not on shift)</option>
                  <option value="INACTIVE">INACTIVE</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Client Hub (Optional)
                </label>
                <select
                  value={formData.clientId}
                  onChange={(e) => handleClientChange(e.target.value)}
                  className="w-full bg-dark-900 border border-dark-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-amber-500"
                >
                  <option value="">General FleetHub Pool</option>
                  {clients.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="pt-3 flex items-center justify-end gap-2 border-t border-dark-700/60 mt-4">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="px-4 py-2.5 text-xs font-semibold text-slate-400 hover:text-slate-200 rounded-xl hover:bg-dark-700 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2.5 text-xs font-bold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-xl transition-all disabled:opacity-50 cursor-pointer shadow-lg shadow-amber-500/20"
              >
                {submitting ? 'Saving...' : editingDriver ? 'Update Driver Profile' : 'Create & Provision Account'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* 2. Credentials Delivery Modal (Shows Temporary Password with Copy Button) */}
      <Modal
        isOpen={credentialsModalOpen}
        onClose={() => setCredentialsModalOpen(false)}
        title={credentialInfo?.isReset ? 'Driver Password Reset Successful' : 'Driver Account Created Successfully'}
      >
        <div className="space-y-4">
          <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
            <p className="text-xs text-emerald-200 font-medium">
              {credentialInfo?.isReset
                ? `Temporary password generated for ${credentialInfo?.name}.`
                : `Driver account for ${credentialInfo?.name} has been provisioned.`}
            </p>
          </div>

          <div className="bg-dark-900 border border-dark-700 rounded-2xl p-4 space-y-3">
            <div>
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                Driver Email (Login ID)
              </span>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-dark-800 border border-dark-700 font-mono text-sm text-slate-100">
                <span>{credentialInfo?.email}</span>
                <button
                  type="button"
                  onClick={() => handleCopyPassword(credentialInfo?.email)}
                  className="text-xs text-amber-400 hover:text-amber-300 p-1 flex items-center gap-1 cursor-pointer"
                  title="Copy Email"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div>
              <span className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider block mb-1">
                One-Time Temporary Password
              </span>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-dark-800 border border-amber-500/40 font-mono text-sm font-bold text-amber-300">
                <span className="tracking-wider">{credentialInfo?.temporaryPassword}</span>
                <button
                  type="button"
                  onClick={() => handleCopyPassword(credentialInfo?.temporaryPassword)}
                  className="px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-md shadow-amber-500/20"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      Copy Password
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="p-3 bg-dark-900/60 border border-dark-700/60 rounded-xl text-slate-300 text-xs space-y-1">
            <p className="font-semibold text-slate-200">Security Instructions:</p>
            <p className="text-[11px] text-slate-400">
              Share these credentials securely with the Driver. The Driver can open FleetHub from their own mobile browser and sign in.
              On first sign-in, the system will prompt them to set their own permanent password.
            </p>
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={() => setCredentialsModalOpen(false)}
              className="px-5 py-2.5 text-xs font-bold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-xl transition cursor-pointer"
            >
              Done &amp; Dismiss
            </button>
          </div>
        </div>
      </Modal>

      {/* 3. Reset Password Confirmation Modal */}
      <Modal
        isOpen={resetModalOpen}
        onClose={() => {
          if (!resetting) setResetModalOpen(false);
        }}
        title="Reset Driver Password"
      >
        <div className="space-y-4">
          {resetError && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs font-semibold">
              {resetError}
            </div>
          )}

          <div className="p-3.5 bg-dark-900 border border-dark-700 rounded-xl space-y-2">
            <div className="flex items-center gap-2 text-amber-400 text-xs font-bold">
              <KeyRound className="w-4 h-4" />
              <span>Generate Temporary Password</span>
            </div>
            <p className="text-xs text-slate-300">
              This will generate a new secure temporary password for driver{' '}
              <span className="font-bold text-white">{driverToReset?.name}</span> ({driverToReset?.phone}).
            </p>
            <p className="text-[11px] text-slate-400">
              The driver will be required to change their password when they log in.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-dark-700/60">
            <button
              type="button"
              disabled={resetting}
              onClick={() => setResetModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200 rounded-xl hover:bg-dark-700 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={resetting}
              onClick={confirmResetPassword}
              className="px-5 py-2 text-xs font-bold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-xl transition cursor-pointer disabled:opacity-50 shadow-md shadow-amber-500/20"
            >
              {resetting ? 'Generating...' : 'Generate New Password'}
            </button>
          </div>
        </div>
      </Modal>

      {/* 4. View Driver Details Modal */}
      {driverToView && (
        <Modal
          isOpen={viewModalOpen}
          onClose={() => setViewModalOpen(false)}
          title={`Driver Profile: ${driverToView.name}`}
        >
          <div className="space-y-4 text-xs">
            <div className="flex items-center gap-3 p-4 bg-dark-900 border border-dark-700 rounded-2xl">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 font-black text-lg flex items-center justify-center shrink-0">
                {driverToView.name?.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="text-base font-bold text-white">{driverToView.name}</h3>
                <p className="text-slate-400 mt-0.5">{driverToView.email || driverToView.userId?.email || 'No email'}</p>
                <div className="mt-1 flex items-center gap-2">
                  <StatusBadge status={driverToView.status} />
                  <span className="text-[10px] text-slate-500 font-mono">ID: {driverToView._id}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-dark-900 border border-dark-700/80 rounded-xl">
                <span className="text-slate-500 block text-[10px] uppercase font-bold">Phone Number</span>
                <span className="text-slate-200 font-mono font-semibold mt-0.5 block">{driverToView.phone}</span>
              </div>
              <div className="p-3 bg-dark-900 border border-dark-700/80 rounded-xl">
                <span className="text-slate-500 block text-[10px] uppercase font-bold">Driving License</span>
                <span className="text-slate-200 font-mono font-semibold mt-0.5 block">{driverToView.licenseNumber}</span>
              </div>
              <div className="p-3 bg-dark-900 border border-dark-700/80 rounded-xl">
                <span className="text-slate-500 block text-[10px] uppercase font-bold">License Expiry</span>
                <span className="text-slate-200 font-mono mt-0.5 block">
                  {driverToView.licenseExpiryDate ? new Date(driverToView.licenseExpiryDate).toLocaleDateString() : '—'}
                </span>
              </div>
              <div className="p-3 bg-dark-900 border border-dark-700/80 rounded-xl">
                <span className="text-slate-500 block text-[10px] uppercase font-bold">Role</span>
                <span className="text-amber-400 font-bold mt-0.5 block">DRIVER</span>
              </div>
            </div>

            {driverToView.address && (
              <div className="p-3 bg-dark-900 border border-dark-700/80 rounded-xl">
                <span className="text-slate-500 block text-[10px] uppercase font-bold">Address</span>
                <span className="text-slate-300 mt-0.5 block">{driverToView.address}</span>
              </div>
            )}

            {driverToView.currentDelivery && (
              <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 block">
                  Active Delivery Assignment
                </span>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono font-bold text-white">{driverToView.currentDelivery.orderId}</span>
                  <span className="font-bold text-amber-300">{driverToView.currentDelivery.status}</span>
                </div>
                <p className="text-slate-300 text-[11px] truncate">{driverToView.currentDelivery.deliveryAddress}</p>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setViewModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-dark-700 rounded-xl cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* 5. Delete Confirmation Modal */}
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
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200 rounded-xl hover:bg-dark-700 transition-colors disabled:opacity-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={deleting}
              onClick={confirmDelete}
              className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-xl transition-all shadow-md shadow-rose-600/20 disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
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
