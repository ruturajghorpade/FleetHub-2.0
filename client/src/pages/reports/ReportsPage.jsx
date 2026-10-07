import React, { useState, useEffect } from 'react';
import { BarChart3, Package, Car, Users, IndianRupee, RefreshCw, CheckCircle, Clock, XCircle, Wrench } from 'lucide-react';
import api from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorAlert from '../../components/common/ErrorAlert';

const ReportsPage = () => {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchReports = async (signal) => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/reports/analytics', { signal });
      if (res.data.success) {
        setReport(res.data.data);
      }
    } catch (err) {
      if (err.name === 'CanceledError' || err.code === 'ERR_CANCELED') return;
      console.error('Error fetching analytics:', err);
      setError('Failed to fetch analytics from MongoDB.');
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    fetchReports(controller.signal);
    return () => controller.abort();
  }, []);

  const d = report?.deliveries || {};
  const v = report?.vehicles || {};
  const drv = report?.drivers || {};
  const f = report?.financials || {};

  const totalD = d.total || 0;
  const deliveredPct = totalD > 0 ? Math.round((d.delivered / totalD) * 100) : 0;
  const pendingPct = totalD > 0 ? Math.round((d.pending / totalD) * 100) : 0;
  const cancelledPct = totalD > 0 ? Math.round((d.cancelled / totalD) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
            <BarChart3 className="w-6 h-6 text-amber-500" />
            Operations & Fleet Analytics
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Aggregated metrics queried in real-time from MongoDB database
          </p>
        </div>

        <button
          onClick={fetchReports}
          className="p-2.5 rounded-xl bg-dark-800 hover:bg-dark-700 border border-dark-700 text-slate-300 hover:text-white transition-colors self-start sm:self-auto"
          title="Re-aggregate from MongoDB"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-amber-400' : ''}`} />
        </button>
      </div>

      {error && <ErrorAlert message={error} onRetry={fetchReports} />}

      {loading && !report ? (
        <LoadingSpinner text="Computing database aggregations..." fullScreen />
      ) : (
        <>
          {/* Top High-level KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-dark-800/90 border border-dark-700/80 p-5 rounded-2xl">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Total Deliveries</span>
                <Package className="w-4 h-4 text-blue-400" />
              </div>
              <p className="text-3xl font-black text-white">{totalD}</p>
              <p className="text-[11px] text-slate-400 mt-1">All time delivery volume</p>
            </div>

            <div className="bg-dark-800/90 border border-dark-700/80 p-5 rounded-2xl">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                  Delivered Revenue
                </span>
                <IndianRupee className="w-4 h-4 text-emerald-400" />
              </div>
              <p className="text-3xl font-black text-emerald-400">₹{f.totalRevenue || 0}</p>
              <p className="text-[11px] text-slate-400 mt-1">Completed orders value</p>
            </div>

            <div className="bg-dark-800/90 border border-dark-700/80 p-5 rounded-2xl">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Active Fleet</span>
                <Car className="w-4 h-4 text-amber-400" />
              </div>
              <p className="text-3xl font-black text-white">{v.total || 0}</p>
              <p className="text-[11px] text-slate-400 mt-1">{v.available || 0} vehicles ready to dispatch</p>
            </div>

            <div className="bg-dark-800/90 border border-dark-700/80 p-5 rounded-2xl">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Total Drivers</span>
                <Users className="w-4 h-4 text-purple-400" />
              </div>
              <p className="text-3xl font-black text-white">{drv.total || 0}</p>
              <p className="text-[11px] text-slate-400 mt-1">{drv.available || 0} currently available</p>
            </div>
          </div>

          {/* Breakdown Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Delivery Performance Breakdown */}
            <div className="bg-dark-800/90 border border-dark-700/80 p-6 rounded-2xl space-y-5">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Package className="w-4 h-4 text-amber-500" />
                Delivery Fulfillment Rates
              </h3>

              {/* Progress visual bar */}
              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-300 mb-1.5">
                  <span>Success Rate: {deliveredPct}%</span>
                  <span className="text-slate-400">{d.delivered || 0} / {totalD} Delivered</span>
                </div>
                <div className="w-full h-3 bg-dark-900 rounded-full overflow-hidden flex">
                  <div style={{ width: `${deliveredPct}%` }} className="bg-emerald-500 h-full"></div>
                  <div style={{ width: `${pendingPct}%` }} className="bg-amber-500 h-full"></div>
                  <div style={{ width: `${cancelledPct}%` }} className="bg-rose-500 h-full"></div>
                </div>
              </div>

              {/* Status Counters */}
              <div className="grid grid-cols-3 gap-3 pt-2">
                <div className="bg-dark-900/50 p-3 rounded-xl border border-dark-700/50 text-center">
                  <span className="text-[10px] font-bold text-emerald-400 uppercase">Delivered</span>
                  <p className="text-xl font-bold text-slate-100 mt-1">{d.delivered || 0}</p>
                </div>
                <div className="bg-dark-900/50 p-3 rounded-xl border border-dark-700/50 text-center">
                  <span className="text-[10px] font-bold text-amber-400 uppercase">Pending</span>
                  <p className="text-xl font-bold text-slate-100 mt-1">{d.pending || 0}</p>
                </div>
                <div className="bg-dark-900/50 p-3 rounded-xl border border-dark-700/50 text-center">
                  <span className="text-[10px] font-bold text-rose-400 uppercase">Cancelled</span>
                  <p className="text-xl font-bold text-slate-100 mt-1">{d.cancelled || 0}</p>
                </div>
              </div>
            </div>

            {/* Fleet & Maintenance Breakdown */}
            <div className="bg-dark-800/90 border border-dark-700/80 p-6 rounded-2xl space-y-5">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Car className="w-4 h-4 text-amber-500" />
                Fleet Availability & Maintenance
              </h3>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="bg-dark-900/50 p-4 rounded-xl border border-dark-700/50">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-slate-300">Available Vehicles</span>
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                  </div>
                  <p className="text-2xl font-bold text-emerald-400">{v.available || 0}</p>
                  <p className="text-[10px] text-slate-400 mt-1">Ready for assignment</p>
                </div>

                <div className="bg-dark-900/50 p-4 rounded-xl border border-dark-700/50">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-slate-300">Under Maintenance</span>
                    <Wrench className="w-4 h-4 text-orange-400" />
                  </div>
                  <p className="text-2xl font-bold text-orange-400">{v.inMaintenance || 0}</p>
                  <p className="text-[10px] text-slate-400 mt-1">Locked from dispatch</p>
                </div>

                <div className="bg-dark-900/50 p-4 rounded-xl border border-dark-700/50">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-slate-300">Assigned Vehicles</span>
                    <Package className="w-4 h-4 text-blue-400" />
                  </div>
                  <p className="text-2xl font-bold text-blue-400">{v.assigned || 0}</p>
                  <p className="text-[10px] text-slate-400 mt-1">Out on orders</p>
                </div>

                <div className="bg-dark-900/50 p-4 rounded-xl border border-dark-700/50">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-slate-300">Completed Repairs</span>
                    <CheckCircle className="w-4 h-4 text-purple-400" />
                  </div>
                  <p className="text-2xl font-bold text-purple-400">{report?.maintenance?.completed || 0}</p>
                  <p className="text-[10px] text-slate-400 mt-1">Finished services</p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ReportsPage;
