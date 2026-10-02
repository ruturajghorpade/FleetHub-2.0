import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Modal from '../common/Modal';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const DeliveryModal = ({ isOpen, onClose, onCreated, onSuccess }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [branches, setBranches] = useState([]);
  const [loadingBranches, setLoadingBranches] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    customerName: '',
    customerPhone: '',
    deliveryAddress: '',
    orderItems: 'Pizza',
    amount: '',
    branchId: '',
    deliveryNotes: '',
  });

  useEffect(() => {
    if (isOpen) {
      setError('');
      fetchBranches();
    }
  }, [isOpen]);

  const fetchBranches = async () => {
    try {
      setLoadingBranches(true);
      const res = await api.get('/branches');
      const branchList = res.data?.data || res.data || [];
      if (Array.isArray(branchList) && branchList.length > 0) {
        setBranches(branchList);
        // Default to first branch if not already set or invalid
        setFormData((prev) => ({
          ...prev,
          branchId:
            prev.branchId && branchList.some((b) => b._id === prev.branchId)
              ? prev.branchId
              : branchList[0]._id,
        }));
      } else {
        setBranches([]);
      }
    } catch (err) {
      console.error('Failed to load branches:', err);
      setError('Could not load authorized branches for delivery.');
    } finally {
      setLoadingBranches(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleQuickFill = () => {
    setFormData((prev) => ({
      ...prev,
      customerName: 'Ruturaj Sandip Ghorpade',
      customerPhone: '+917709176186',
      deliveryAddress: 'Pawarwadi',
      orderItems: 'Pizza',
      amount: '299',
      branchId: prev.branchId || (branches.length > 0 ? branches[0]._id : ''),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setError('');

    if (!formData.customerName || !formData.customerPhone || !formData.deliveryAddress) {
      setError('Customer Name, Phone, and Delivery Address are required.');
      return;
    }

    if (!formData.branchId) {
      setError('Please select an authorized branch.');
      return;
    }

    if (!formData.amount || Number(formData.amount) <= 0) {
      setError('Please enter a valid order amount.');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        customerName: formData.customerName.trim(),
        customerPhone: formData.customerPhone.trim(),
        deliveryAddress: formData.deliveryAddress.trim(),
        orderItems: formData.orderItems.trim() || 'Food Items',
        amount: Number(formData.amount),
        branchId: formData.branchId,
        deliveryNotes: formData.deliveryNotes.trim(),
      };

      console.log('SUBMITTING DELIVERY PAYLOAD:', payload);
      const res = await api.post('/deliveries', payload);
      console.log('CREATE DELIVERY RAW RESPONSE:', res);

      // Support 200, 201, 204 HTTP status codes and res.data.success or res.success
      const isSuccess =
        (res.status >= 200 && res.status < 300) &&
        (res.data ? res.data.success !== false : true);

      if (isSuccess) {
        const createdDelivery = res.data?.data || res.data || res;

        // Reset form
        setFormData({
          customerName: '',
          customerPhone: '',
          deliveryAddress: '',
          orderItems: 'Pizza',
          amount: '',
          branchId: branches[0]?._id || '',
          deliveryNotes: '',
        });

        // Close modal
        if (typeof onClose === 'function') {
          onClose();
        }

        // Safely invoke callback(s) so any errors in callers do not bubble into creation error
        if (typeof onCreated === 'function') {
          try {
            onCreated(createdDelivery);
          } catch (cbErr) {
            console.error('Error in onCreated callback:', cbErr);
          }
        }
        if (typeof onSuccess === 'function') {
          try {
            onSuccess(createdDelivery);
          } catch (cbErr) {
            console.error('Error in onSuccess callback:', cbErr);
          }
        }
      } else {
        const failureMsg =
          res.data?.message || res.message || 'Failed to create delivery. Please try again.';
        setError(failureMsg);
      }
    } catch (err) {
      console.error('Error creating delivery:', err);
      const backendMessage =
        err.response?.data?.message ||
        err.response?.data?.error ||
        (err.response?.status === 403
          ? 'You are not authorized to create deliveries for this client.'
          : err.response?.status === 500
          ? 'Server error. Please try again.'
          : err.message || 'Failed to create delivery. Please try again.');
      setError(backendMessage);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create Delivery Request" maxWidth="max-w-md">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Quick Demo Fill Button */}
        <div className="flex justify-between items-center bg-dark-900/50 p-2.5 rounded-xl border border-dark-700/60">
          <span className="text-xs text-slate-300">Need demo test data?</span>
          <button
            type="button"
            onClick={handleQuickFill}
            className="text-xs text-amber-400 hover:text-amber-300 font-semibold px-2 py-1 rounded bg-amber-500/10 border border-amber-500/20"
          >
            ⚡ Auto-Fill Demo
          </button>
        </div>

        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs font-medium">
            {error}
          </div>
        )}

        {/* Customer Name */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">
            Customer Name <span className="text-amber-500">*</span>
          </label>
          <input
            type="text"
            name="customerName"
            value={formData.customerName}
            onChange={handleChange}
            placeholder="e.g. Ruturaj Sandip Ghorpade"
            required
            className="w-full bg-dark-900 border border-dark-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
          />
        </div>

        {/* Customer Phone */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">
            Customer Phone <span className="text-amber-500">*</span>
          </label>
          <input
            type="text"
            name="customerPhone"
            value={formData.customerPhone}
            onChange={handleChange}
            placeholder="e.g. +917709176186"
            required
            className="w-full bg-dark-900 border border-dark-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
          />
        </div>

        {/* Delivery Address */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">
            Delivery Address <span className="text-amber-500">*</span>
          </label>
          <textarea
            name="deliveryAddress"
            rows="2"
            value={formData.deliveryAddress}
            onChange={handleChange}
            placeholder="e.g. Pawarwadi"
            required
            className="w-full bg-dark-900 border border-dark-700 rounded-xl px-3.5 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors resize-none"
          />
        </div>

        {/* Branch Selection */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">
            Dispatch Branch <span className="text-amber-500">*</span>
          </label>
          {loadingBranches ? (
            <div className="text-xs text-slate-500 py-2">Loading branches...</div>
          ) : branches.length === 0 ? (
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl mt-1">
              <p className="text-xs text-amber-300 font-medium mb-2">
                No branches found for your restaurant. Every delivery needs an originating dispatch branch.
              </p>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  navigate('/branches');
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs rounded-lg transition-colors shadow-sm"
              >
                + Go to Branches to Create One
              </button>
            </div>
          ) : (
            <select
              name="branchId"
              value={formData.branchId}
              onChange={handleChange}
              required
              className="w-full bg-dark-900 border border-dark-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-amber-500 transition-colors"
            >
              {branches.map((b) => (
                <option key={b._id} value={b._id}>
                  {b.name} ({b.address})
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Order Items & Amount */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Order Items</label>
            <input
              type="text"
              name="orderItems"
              value={formData.orderItems}
              onChange={handleChange}
              placeholder="e.g. Pizza"
              className="w-full bg-dark-900 border border-dark-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Amount (₹) <span className="text-amber-500">*</span>
            </label>
            <input
              type="number"
              name="amount"
              min="1"
              value={formData.amount}
              onChange={handleChange}
              placeholder="299"
              required
              className="w-full bg-dark-900 border border-dark-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
            />
          </div>
        </div>

        {/* Delivery Notes */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">Delivery Notes</label>
          <input
            type="text"
            name="deliveryNotes"
            value={formData.deliveryNotes}
            onChange={handleChange}
            placeholder="e.g. Please deliver carefully / Ring doorbell"
            className="w-full bg-dark-900 border border-dark-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
          />
        </div>

        {/* Submit Actions */}
        <div className="pt-2 flex items-center justify-end gap-2 border-t border-dark-700/60 mt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200 rounded-xl hover:bg-dark-700 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting || branches.length === 0}
            className="px-5 py-2 text-xs font-bold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-xl transition-all shadow-md shadow-amber-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Creating...' : 'Create Delivery Request'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default DeliveryModal;
