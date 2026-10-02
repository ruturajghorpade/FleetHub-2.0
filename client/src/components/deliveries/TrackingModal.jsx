import React from 'react';
import {
  CheckCircle2,
  Clock,
  MapPin,
  Building2,
  Package,
  Calendar,
  AlertCircle,
  Truck,
  UserCheck,
} from 'lucide-react';
import Modal from '../common/Modal';

const STATUS_STEPS = [
  { key: 'REQUESTED', label: 'Request Submitted', desc: 'Order received by FleetHub' },
  { key: 'DRIVER_ASSIGNED', label: 'Driver Assigned', desc: 'FleetHub partner assigned' },
  { key: 'ACCEPTED', label: 'Accepted', desc: 'Driver confirmed delivery' },
  { key: 'PICKED_UP', label: 'Picked Up', desc: 'Order picked up from branch' },
  { key: 'OUT_FOR_DELIVERY', label: 'Out for Delivery', desc: 'On the way to customer' },
  { key: 'DELIVERED', label: 'Delivered', desc: 'Successfully handed over' },
];

const getStepIndex = (status) => {
  switch (status) {
    case 'REQUESTED':
    case 'PENDING':
      return 0;
    case 'WAITING_FOR_DRIVER':
    case 'DRIVER_REJECTED':
      return 0; // Still waiting for assignment
    case 'DRIVER_ASSIGNED':
    case 'ASSIGNED':
      return 1;
    case 'ACCEPTED':
      return 2;
    case 'PICKED_UP':
      return 3;
    case 'OUT_FOR_DELIVERY':
      return 4;
    case 'DELIVERED':
      return 5;
    default:
      return 0;
  }
};

const TrackingModal = ({ isOpen, onClose, delivery }) => {
  if (!delivery) return null;

  const currentIndex = getStepIndex(delivery.status);
  const isCancelled = delivery.status === 'CANCELLED';
  const isFailed = delivery.status === 'ASSIGNMENT_FAILED';
  const isWaiting = delivery.status === 'WAITING_FOR_DRIVER' || delivery.status === 'DRIVER_REJECTED';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Tracking Delivery — ${delivery.orderId}`}
      maxWidth="max-w-lg"
    >
      <div className="space-y-5">
        {/* Top Info Banner */}
        <div className="bg-dark-900/60 p-4 rounded-2xl border border-dark-700/60">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono font-bold text-amber-400">
              #{delivery.orderId}
            </span>
            <span
              className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                isCancelled
                  ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                  : isFailed
                  ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20'
                  : delivery.status === 'DELIVERED'
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
              }`}
            >
              {delivery.status.replace(/_/g, ' ')}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <p className="text-slate-400 text-[10px] uppercase font-bold">Customer</p>
              <p className="font-semibold text-white">{delivery.customerName}</p>
            </div>
            <div>
              <p className="text-slate-400 text-[10px] uppercase font-bold">Branch</p>
              <p className="font-semibold text-white truncate">
                {delivery.branchId?.name || 'Main Branch'}
              </p>
            </div>
            <div>
              <p className="text-slate-400 text-[10px] uppercase font-bold">Amount</p>
              <p className="font-bold text-amber-400">₹{delivery.amount}</p>
            </div>
            <div>
              <p className="text-slate-400 text-[10px] uppercase font-bold">Items</p>
              <p className="text-slate-200 truncate">{delivery.orderItems || 'Food Items'}</p>
            </div>
          </div>

          <div className="mt-2.5 pt-2.5 border-t border-dark-700/50 flex items-start gap-1.5 text-xs text-slate-300">
            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
            <span className="truncate">{delivery.deliveryAddress}</span>
          </div>
        </div>

        {/* Special Status Notices */}
        {isWaiting && (
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center gap-3">
            <Clock className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <p className="text-xs font-bold text-amber-300">Finding an available delivery partner</p>
              <p className="text-[11px] text-slate-400">
                Our FleetHub dispatchers are assigning the closest partner to your branch.
              </p>
            </div>
          </div>
        )}

        {isCancelled && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
            <div>
              <p className="text-xs font-bold text-rose-300">Delivery Cancelled</p>
              <p className="text-[11px] text-slate-400">
                {delivery.cancellationReason || 'This order was cancelled.'}
              </p>
            </div>
          </div>
        )}

        {/* Step-by-step Status Progression Timeline */}
        <div className="space-y-4 px-2">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Delivery Progress
          </p>

          <div className="space-y-3">
            {STATUS_STEPS.map((step, idx) => {
              const isCompleted = !isCancelled && idx < currentIndex;
              const isCurrent = !isCancelled && idx === currentIndex;
              const isPending = isCancelled || idx > currentIndex;

              return (
                <div key={step.key} className="flex items-start gap-3">
                  {/* Status Circle / Icon */}
                  <div className="mt-0.5">
                    {isCompleted ? (
                      <div className="w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-500 flex items-center justify-center text-emerald-400">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </div>
                    ) : isCurrent ? (
                      <div className="w-5 h-5 rounded-full bg-amber-500 border border-amber-400 flex items-center justify-center text-slate-950 animate-pulse">
                        <div className="w-2 h-2 rounded-full bg-slate-950" />
                      </div>
                    ) : (
                      <div className="w-5 h-5 rounded-full bg-dark-800 border border-slate-700 flex items-center justify-center text-slate-600">
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                      </div>
                    )}
                  </div>

                  {/* Step Label & Description */}
                  <div className="flex-1">
                    <p
                      className={`text-xs font-bold ${
                        isCompleted
                          ? 'text-slate-300'
                          : isCurrent
                          ? 'text-amber-400'
                          : 'text-slate-500'
                      }`}
                    >
                      {step.label}
                    </p>
                    <p className="text-[11px] text-slate-500">{step.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Partner Info (Sanitized for Client: no personal phone number or private info) */}
        {delivery.driverId && (
          <div className="p-3.5 rounded-xl bg-dark-900/40 border border-dark-700/60 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2.5">
              <UserCheck className="w-4 h-4 text-emerald-400" />
              <div>
                <span className="text-slate-400 text-[10px] block">Assigned Partner</span>
                <span className="font-semibold text-white">
                  {delivery.driverId?.name || 'FleetHub Partner'}
                </span>
              </div>
            </div>
            {delivery.vehicleId && (
              <span className="text-[11px] text-slate-400 font-mono">
                {delivery.vehicleId?.vehicleNumber || delivery.vehicleId?.model}
              </span>
            )}
          </div>
        )}

        <div className="pt-2 flex justify-end border-t border-dark-700/60">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white rounded-xl bg-dark-700 hover:bg-dark-600 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default TrackingModal;
