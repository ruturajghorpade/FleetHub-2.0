import React, { useState } from 'react';
import Modal from '../common/Modal';
import api from '../../services/api';

const CancelModal = ({ isOpen, onClose, delivery, onCancelled }) => {
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleCancel = async (e) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError('Please provide a reason for cancelling this delivery.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await api.patch(`/deliveries/${delivery._id}/cancel`, {
        cancellationReason: reason.trim(),
      });

      if (res.data.success) {
        onCancelled(res.data.data);
        setReason('');
        onClose();
      }
    } catch (err) {
      console.error('Cancellation error:', err);
      setError(err.response?.data?.message || 'Failed to cancel delivery.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Cancel Delivery — ${delivery?.orderId}`} maxWidth="max-w-md">
      <form onSubmit={handleCancel} className="space-y-4">
        <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-300">
          Cancelling this delivery will release any assigned driver and vehicle back to AVAILABLE status.
        </div>

        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs font-medium">
            {error}
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">
            Cancellation Reason <span className="text-amber-500">*</span>
          </label>
          <textarea
            rows="3"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Customer cancelled order / Wrong delivery address / Restaurant kitchen overloaded"
            required
            className="w-full bg-dark-900 border border-dark-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 resize-none"
          />
        </div>

        <div className="pt-2 flex items-center justify-end gap-2 border-t border-dark-700/60 mt-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200 rounded-xl hover:bg-dark-700 transition-colors"
          >
            Go Back
          </button>
          <button
            type="submit"
            disabled={submitting || !reason.trim()}
            className="px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-xl transition-all shadow-md shadow-rose-600/20 disabled:opacity-50"
          >
            {submitting ? 'Cancelling...' : 'Confirm Cancellation'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default CancelModal;
