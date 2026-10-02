import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Package,
  Search,
  Plus,
  RefreshCw,
  Eye,
  CheckCircle2,
  Bike,
  Navigation,
  XCircle,
  MapPin,
  Calendar,
  Building2,
  Clock,
  Radio,
  UserCheck,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import StatusBadge from '../../components/common/StatusBadge';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorAlert from '../../components/common/ErrorAlert';
import EmptyState from '../../components/common/EmptyState';
import Modal from '../../components/common/Modal';
import DeliveryModal from '../../components/deliveries/DeliveryModal';
import AssignModal from '../../components/deliveries/AssignModal';
import CancelModal from '../../components/deliveries/CancelModal';
import TrackingModal from '../../components/deliveries/TrackingModal';

const DeliveriesPage = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();

  const isClient = user?.role === 'CLIENT';
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';
  const isDispatcher = user?.role === 'DISPATCHER';
  const isDriver = user?.role === 'DRIVER';
  const isOps = isAdmin || isDispatcher;

  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'ALL');

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(searchParams.get('action') === 'create');
  const [selectedForAssign, setSelectedForAssign] = useState(null);
  const [selectedForCancel, setSelectedForCancel] = useState(null);
  const [trackingDelivery, setTrackingDelivery] = useState(null);
  const [viewDelivery, setViewDelivery] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);

  const fetchDeliveries = async () => {
    try {
      setLoading(true);
      setError('');
      let url = '/deliveries';
      const params = new URLSearchParams();
      if (statusFilter !== 'ALL') params.append('status', statusFilter);
      if (search.trim()) params.append('search', search.trim());
      if (params.toString()) url += `?${params.toString()}`;

      const res = await api.get(url);
      if (res.data?.success) {
        setDeliveries(res.data.data || []);
      }
    } catch (err) {
      console.error('Error fetching deliveries:', err);
      setError('Unable to load deliveries. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeliveries();
  }, [statusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchDeliveries();
  };

  // Driver/Ops status transition
  const handleUpdateStatus = async (deliveryId, nextStatus) => {
    try {
      setUpdatingId(deliveryId);
      const res = await api.patch(`/deliveries/${deliveryId}/status`, { status: nextStatus });
      if (res.data?.success) {
        fetchDeliveries();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update delivery status');
    } finally {
      setUpdatingId(null);
    }
  };

  // Driver accept
  const handleAcceptDelivery = async (deliveryId) => {
    try {
      setUpdatingId(deliveryId);
      const res = await api.patch(`/deliveries/${deliveryId}/accept`);
      if (res.data?.success) {
        fetchDeliveries();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to accept delivery');
    } finally {
      setUpdatingId(null);
    }
  };

  // Statuses list
  const statuses = [
    'ALL',
    'REQUESTED',
    'WAITING_FOR_DRIVER',
    'DRIVER_ASSIGNED',
    'ACCEPTED',
    'PICKED_UP',
    'OUT_FOR_DELIVERY',
    'DELIVERED',
    'CANCELLED',
    'DRIVER_REJECTED',
    'ASSIGNMENT_FAILED',
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
            <Package className="w-6 h-6 text-amber-500" />
            {isClient
              ? 'My Delivery Orders'
              : isDriver
              ? 'My Assigned Deliveries'
              : 'FleetHub Delivery Dispatch Console'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            {isClient
              ? 'Track on-demand delivery requests created for your restaurant branches'
              : isDriver
              ? 'View orders assigned to you and update their status along the delivery route'
              : 'Manage live food delivery requests across all partner restaurants'}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchDeliveries}
            className="p-2.5 rounded-xl bg-dark-700/60 hover:bg-dark-700 border border-dark-600/50 text-slate-300 hover:text-white transition-colors cursor-pointer"
            title="Refresh Deliveries"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-amber-400' : ''}`} />
          </button>

          {/* Create Delivery (Client and Admins only) */}
          {(isClient || isAdmin) && (
            <button
              onClick={() => setIsCreateOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs sm:text-sm shadow-lg shadow-amber-500/20 transition cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              Create Delivery Request
            </button>
          )}
        </div>
      </div>

      {error && <ErrorAlert message={error} onRetry={fetchDeliveries} />}

      {/* Filter and Search Bar */}
      <div className="bg-dark-800/80 border border-dark-700/60 rounded-2xl p-4 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            {statuses.map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                  statusFilter === st
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/10'
                    : 'bg-dark-900/60 text-slate-400 hover:text-slate-200 hover:bg-dark-700/50 border border-dark-700/50'
                }`}
              >
                {st.replace(/_/g, ' ')}
              </button>
            ))}
          </div>

          {/* Search Form */}
          <form onSubmit={handleSearchSubmit} className="relative min-w-[240px]">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              maxLength={100}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by order ID, customer, address..."
              className="w-full bg-dark-900 border border-dark-700 rounded-xl pl-10 pr-3.5 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
            />
          </form>
        </div>
      </div>

      {/* Deliveries Table / List */}
      {loading && deliveries.length === 0 ? (
        <LoadingSpinner text="Fetching deliveries from FleetHub..." />
      ) : deliveries.length === 0 ? (
        <div className="bg-dark-800/80 border border-dark-700/60 rounded-3xl p-12 text-center">
          <EmptyState
            icon={Package}
            title="No delivery orders found"
            description={
              statusFilter !== 'ALL'
                ? `No orders matching status "${statusFilter}". Try selecting ALL to see other deliveries.`
                : isClient
                ? 'You have not created any delivery requests yet. Click "Create Delivery Request" to dispatch your first customer order!'
                : 'No delivery orders currently in this queue.'
            }
          />
        </div>
      ) : (
        <div className="bg-dark-800/80 border border-dark-700/60 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-dark-900/50 border-b border-dark-700/60 text-slate-400 uppercase text-[10px] font-bold tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Order ID</th>
                  {!isClient && <th className="py-3.5 px-4">Client</th>}
                  <th className="py-3.5 px-4">Branch</th>
                  <th className="py-3.5 px-4">Customer &amp; Address</th>
                  <th className="py-3.5 px-4">Assigned Partner</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Amount</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-700/50 text-slate-300">
                {deliveries.map((delivery) => {
                  const canCancel =
                    ['REQUESTED', 'WAITING_FOR_DRIVER', 'PENDING', 'DRIVER_ASSIGNED', 'ASSIGNED', 'DRIVER_REJECTED', 'ASSIGNMENT_FAILED'].includes(delivery.status);

                  const isAssignable =
                    ['REQUESTED', 'WAITING_FOR_DRIVER', 'PENDING', 'DRIVER_REJECTED', 'ASSIGNMENT_FAILED'].includes(delivery.status);

                  const canReassign =
                    ['DRIVER_ASSIGNED', 'ASSIGNED', 'ACCEPTED'].includes(delivery.status);

                  return (
                    <tr key={delivery._id} className="hover:bg-dark-700/30 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-amber-400">
                        <button
                          onClick={() => setTrackingDelivery(delivery)}
                          className="hover:underline font-mono text-left cursor-pointer"
                        >
                          {delivery.orderId}
                        </button>
                      </td>

                      {!isClient && (
                        <td className="py-3.5 px-4 text-slate-200 font-semibold">
                          <div className="flex items-center gap-1.5">
                            <Building2 className="w-3.5 h-3.5 text-slate-400" />
                            <span>{delivery.clientId?.name || 'Client'}</span>
                          </div>
                        </td>
                      )}

                      <td className="py-3.5 px-4 text-slate-300">
                        {delivery.branchId?.name || 'Main Branch'}
                      </td>

                      <td className="py-3.5 px-4 max-w-xs">
                        <p className="font-semibold text-white">{delivery.customerName}</p>
                        <p className="text-slate-400 truncate">{delivery.deliveryAddress}</p>
                      </td>

                      <td className="py-3.5 px-4">
                        {delivery.driverId?.name ? (
                          <div>
                            <p className="font-semibold text-white">{delivery.driverId.name}</p>
                            {delivery.vehicleId && (
                              <p className="text-[10px] text-slate-400 font-mono">
                                {delivery.vehicleId.vehicleNumber} ({delivery.vehicleId.vehicleType})
                              </p>
                            )}
                          </div>
                        ) : delivery.status === 'WAITING_FOR_DRIVER' ? (
                          <span className="text-amber-400/90 text-[11px] font-medium animate-pulse">
                            Finding partner...
                          </span>
                        ) : (
                          <span className="text-slate-500 italic">Awaiting driver</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            delivery.status === 'DELIVERED'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : delivery.status === 'CANCELLED'
                              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              : delivery.status === 'OUT_FOR_DELIVERY' || delivery.status === 'PICKED_UP'
                              ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                              : delivery.status === 'REQUESTED'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : 'bg-dark-900 border border-dark-700 text-slate-300'
                          }`}
                        >
                          {delivery.status.replace(/_/g, ' ')}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 font-bold text-white">₹{delivery.amount}</td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Track Button */}
                          <button
                            onClick={() => setTrackingDelivery(delivery)}
                            className="px-2.5 py-1 text-xs font-bold text-amber-400 hover:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 rounded-lg transition-colors cursor-pointer"
                            title="Track Order Progress"
                          >
                            Track
                          </button>

                          {/* Operations: Assign Driver Button (Disallowed for Client!) */}
                          {isOps && isAssignable && (
                            <button
                              onClick={() => setSelectedForAssign(delivery)}
                              className="px-2.5 py-1 text-xs font-bold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-lg transition-colors cursor-pointer"
                            >
                              Assign Driver
                            </button>
                          )}

                          {/* Operations: Reassign */}
                          {isOps && canReassign && (
                            <button
                              onClick={() => setSelectedForAssign(delivery)}
                              className="px-2 py-1 text-xs font-semibold text-slate-300 hover:text-white bg-dark-700 hover:bg-dark-600 rounded-lg transition-colors cursor-pointer"
                            >
                              Reassign
                            </button>
                          )}

                          {/* Driver: Accept / Reject Actions */}
                          {isDriver && (delivery.status === 'DRIVER_ASSIGNED' || delivery.status === 'ASSIGNED') && (
                            <button
                              onClick={() => handleAcceptDelivery(delivery._id)}
                              disabled={updatingId === delivery._id}
                              className="px-2.5 py-1 text-xs font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                            >
                              Accept
                            </button>
                          )}

                          {/* Driver Progression: Picked Up */}
                          {isDriver && delivery.status === 'ACCEPTED' && (
                            <button
                              onClick={() => handleUpdateStatus(delivery._id, 'PICKED_UP')}
                              disabled={updatingId === delivery._id}
                              className="px-2.5 py-1 text-xs font-bold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                            >
                              Pick Up
                            </button>
                          )}

                          {/* Driver Progression: Out for delivery */}
                          {isDriver && delivery.status === 'PICKED_UP' && (
                            <button
                              onClick={() => handleUpdateStatus(delivery._id, 'OUT_FOR_DELIVERY')}
                              disabled={updatingId === delivery._id}
                              className="px-2.5 py-1 text-xs font-bold text-slate-950 bg-purple-400 hover:bg-purple-300 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                            >
                              Dispatch
                            </button>
                          )}

                          {/* Driver Progression: Delivered */}
                          {isDriver && delivery.status === 'OUT_FOR_DELIVERY' && (
                            <button
                              onClick={() => handleUpdateStatus(delivery._id, 'DELIVERED')}
                              disabled={updatingId === delivery._id}
                              className="px-2.5 py-1 text-xs font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                            >
                              Delivered
                            </button>
                          )}

                          {/* Cancel Order (Client or Ops when eligible) */}
                          {canCancel && (isClient || isOps) && (
                            <button
                              onClick={() => setSelectedForCancel(delivery)}
                              className="px-2 py-1 text-xs font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                              title="Cancel Order"
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modals */}
      {isCreateOpen && (
        <DeliveryModal
          isOpen={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
          onCreated={() => fetchDeliveries()}
        />
      )}

      {selectedForAssign && (
        <AssignModal
          isOpen={!!selectedForAssign}
          onClose={() => setSelectedForAssign(null)}
          delivery={selectedForAssign}
          onAssigned={() => fetchDeliveries()}
        />
      )}

      {selectedForCancel && (
        <CancelModal
          isOpen={!!selectedForCancel}
          onClose={() => setSelectedForCancel(null)}
          delivery={selectedForCancel}
          onSuccess={() => fetchDeliveries()}
        />
      )}

      {trackingDelivery && (
        <TrackingModal
          isOpen={!!trackingDelivery}
          onClose={() => setTrackingDelivery(null)}
          delivery={trackingDelivery}
        />
      )}
    </div>
  );
};

export default DeliveriesPage;
