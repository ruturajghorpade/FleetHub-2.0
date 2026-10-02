import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import api from '../../services/api';

const AssignModal = ({ isOpen, onClose, delivery, onAssigned }) => {
  const [drivers, setDrivers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [selectedDriver, setSelectedDriver] = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [waitingSubmitting, setWaitingSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && delivery) {
      setError('');
      fetchAvailableFleet();
    }
  }, [isOpen, delivery]);

  const fetchAvailableFleet = async () => {
    try {
      setLoading(true);
      const [drvRes, vehRes] = await Promise.all([
        api.get('/drivers?status=AVAILABLE'),
        api.get('/vehicles?status=AVAILABLE'),
      ]);

      const availableDrivers = drvRes.data?.data || [];
      // Strictly exclude any vehicle that is in MAINTENANCE
      const availableVehicles = (vehRes.data?.data || []).filter(
        (v) => v.status === 'AVAILABLE' && v.status !== 'MAINTENANCE'
      );

      setDrivers(availableDrivers);
      setVehicles(availableVehicles);

      if (availableDrivers.length > 0) setSelectedDriver(availableDrivers[0]._id);
      if (availableVehicles.length > 0) setSelectedVehicle(availableVehicles[0]._id);
    } catch (err) {
      console.error('Error fetching fleet:', err);
      setError('Failed to fetch available drivers and vehicles.');
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async (e) => {
    e.preventDefault();
    if (!selectedDriver || !selectedVehicle) {
      setError('Please select both an available driver and vehicle.');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      const res = await api.patch(`/deliveries/${delivery._id}/assign`, {
        driverId: selectedDriver,
        vehicleId: selectedVehicle,
      });

      if (res.data.success) {
        if (typeof onAssigned === 'function') {
          onAssigned(res.data.data);
        }
        onClose();
      }
    } catch (err) {
      console.error('Assignment error:', err);
      setError(
        err.response?.data?.message ||
          'Assignment failed. Please check driver/vehicle availability.'
      );
      // Refresh available fleet to catch race conditions / double assignment
      fetchAvailableFleet();
    } finally {
      setSubmitting(false);
    }
  };

  const handleMarkWaiting = async () => {
    try {
      setWaitingSubmitting(true);
      setError('');
      const res = await api.patch(`/deliveries/${delivery._id}/waiting`);
      if (res.data.success) {
        if (typeof onAssigned === 'function') {
          onAssigned(res.data.data);
        }
        onClose();
      }
    } catch (err) {
      console.error('Mark waiting error:', err);
      setError(err.response?.data?.message || 'Failed to update status.');
    } finally {
      setWaitingSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Assign Delivery — ${delivery?.orderId}`}
      maxWidth="max-w-md"
    >
      <form onSubmit={handleAssign} className="space-y-4">
        {/* Delivery Details Summary */}
        <div className="bg-dark-900/60 p-3.5 rounded-xl border border-dark-700/60 text-xs space-y-1">
          <p className="text-slate-300">
            <strong className="text-slate-200">Customer:</strong> {delivery?.customerName} ({delivery?.customerPhone})
          </p>
          <p className="text-slate-300">
            <strong className="text-slate-200">Client:</strong> {delivery?.clientId?.name || 'Client'}
          </p>
          <p className="text-slate-300 truncate">
            <strong className="text-slate-200">Address:</strong> {delivery?.deliveryAddress}
          </p>
          <p className="text-slate-300">
            <strong className="text-slate-200">Order:</strong> {delivery?.orderItems} (₹{delivery?.amount})
          </p>
        </div>

        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs font-medium">
            {error}
          </div>
        )}

        {loading ? (
          <div className="py-6 text-center text-xs text-slate-400">
            Finding available drivers and vehicles...
          </div>
        ) : (
          <>
            {/* Driver Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Available FleetHub Driver <span className="text-amber-500">*</span>
              </label>
              {drivers.length === 0 ? (
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-2">
                  <p className="text-xs text-amber-300 font-medium">
                    No FleetHub drivers are currently AVAILABLE.
                  </p>
                  <button
                    type="button"
                    onClick={handleMarkWaiting}
                    disabled={waitingSubmitting}
                    className="w-full py-1.5 px-3 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 text-amber-300 text-xs font-bold transition-colors"
                  >
                    {waitingSubmitting ? 'Updating...' : 'Set to "WAITING FOR DRIVER"'}
                  </button>
                </div>
              ) : (
                <select
                  value={selectedDriver}
                  onChange={(e) => setSelectedDriver(e.target.value)}
                  className="w-full bg-dark-900 border border-dark-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-amber-500"
                >
                  {drivers.map((d) => (
                    <option key={d._id} value={d._id}>
                      {d.name} — {d.phone} (License: {d.licenseNumber})
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Vehicle Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Available FleetHub Vehicle <span className="text-amber-500">*</span>
              </label>
              {vehicles.length === 0 ? (
                <p className="text-xs text-rose-400 p-2.5 bg-rose-500/10 rounded-xl border border-rose-500/20">
                  No vehicles currently AVAILABLE. (Vehicles in maintenance are excluded).
                </p>
              ) : (
                <select
                  value={selectedVehicle}
                  onChange={(e) => setSelectedVehicle(e.target.value)}
                  className="w-full bg-dark-900 border border-dark-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-amber-500"
                >
                  {vehicles.map((v) => (
                    <option key={v._id} value={v._id}>
                      {v.vehicleNumber} — {v.model} ({v.vehicleType})
                    </option>
                  ))}
                </select>
              )}
            </div>
          </>
        )}

        <div className="pt-2 flex items-center justify-end gap-2 border-t border-dark-700/60 mt-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200 rounded-xl hover:bg-dark-700 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting || loading || drivers.length === 0 || vehicles.length === 0}
            className="px-5 py-2 text-xs font-bold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-xl transition-all shadow-md shadow-amber-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Assigning...' : 'Assign Delivery'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default AssignModal;
