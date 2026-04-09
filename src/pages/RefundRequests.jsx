import React, { useEffect, useState, useCallback, useMemo } from "react";
import { collectionGroup, getDocs, query, updateDoc, getDoc } from "firebase/firestore";
import { db } from '../firebase/config';
import { 
  RefreshCw, Search, User, Package, CheckCircle, 
  XCircle, Clock, Copy, CreditCard, Truck, 
  ShieldCheck, AlertCircle, Coins, DollarSign,
  ChevronRight, ArrowRight
} from 'lucide-react';
import { debounce } from 'lodash';

const RefundRequests = () => {
  const [refunds, setRefunds] = useState([]);
  const [filteredRefunds, setFilteredRefunds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [copyFeedback, setCopyFeedback] = useState('');
  const [rejectionModal, setRejectionModal] = useState({ isOpen: false, item: null, reason: '' });

  // Stats State
  const [stats, setStats] = useState({ pending: 0, pickup: 0, verifying: 0, completed: 0, rejected: 0 });

  const fetchRefunds = useCallback(async () => {
    setLoading(true);
    try {
      const refundQuery = query(collectionGroup(db, "return_requests"));
      const querySnapshot = await getDocs(refundQuery);

      const refundList = [];
      const promises = querySnapshot.docs.map(async (docSnapshot) => {
        const data = docSnapshot.data();
        const userRef = docSnapshot.ref.parent.parent; 
        const userSnap = await getDoc(userRef);
        const userData = userSnap.exists() ? userSnap.data() : {};

        return {
          id: docSnapshot.id,
          ref: docSnapshot.ref,
          ...data,
          customerEmail: userData.email || data.customerEmail || data.email || "",
          userName: userData.name || data.bankDetails?.accountName || "Customer",
          status: data.status || 'return_requested'
        };
      });

      const results = await Promise.all(promises);
      
      // Calculate Stats
      setStats({
        pending: results.filter(r => r.status === 'return_requested').length,
        pickup: results.filter(r => r.status === 'approved').length,
        verifying: results.filter(r => r.status === 'pickup_completed').length,
        completed: results.filter(r => r.status === 'refund_completed' || r.status === 'refund_approved').length,
        rejected: results.filter(r => r.status === 'rejected').length
      });

      results.sort((a, b) => (b.updatedAt?.seconds || 0) - (a.updatedAt?.seconds || 0));
      setRefunds(results);
      setFilteredRefunds(results);
    } catch (error) {
      console.error("Error fetching refunds:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleStatusChange = async (refundItem, newStatus, reason = null) => {
    const statusMap = {
      'approved': 'Approve for Pickup',
      'refund_approved': 'Approve Final Refund',
      'rejected': 'Reject Request',
      'pickup_completed': 'Mark as Received'
    };

    if (!window.confirm(`Are you sure you want to: ${statusMap[newStatus] || newStatus}?`)) return;

    try {
      setLoading(true);
      const updateData = {
        status: newStatus,
        updatedAt: new Date()
      };

      if (reason) updateData.rejectionReason = reason;

      await updateDoc(refundItem.ref, updateData);
      
      setRejectionModal({ isOpen: false, item: null, reason: '' });
      await fetchRefunds();
    } catch (error) {
      console.error("Update failed:", error);
      alert("Failed to update status");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text, label) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopyFeedback(`${label} Copied!`);
    setTimeout(() => setCopyFeedback(''), 2000);
  };

  const debouncedSearch = useMemo(
    () => debounce((term, list, filter) => {
      let result = list;
      if (filter !== 'all') result = result.filter(r => r.status === filter);
      if (term.trim()) {
        const lowerTerm = term.toLowerCase();
        result = result.filter(r => 
          r.orderId?.toLowerCase().includes(lowerTerm) ||
          r.userName?.toLowerCase().includes(lowerTerm) ||
          r.reason?.toLowerCase().includes(lowerTerm) ||
          r.id?.toLowerCase().includes(lowerTerm)
        );
      }
      setFilteredRefunds(result);
    }, 300),
    []
  );

  useEffect(() => {
    debouncedSearch(searchTerm, refunds, selectedFilter);
  }, [searchTerm, refunds, selectedFilter, debouncedSearch]);

  useEffect(() => { fetchRefunds(); }, [fetchRefunds]);

  const getStatusConfig = (status) => {
    switch (status) {
      case 'return_requested': return { label: 'New Request', color: 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30', icon: AlertCircle };
      case 'approved': return { label: 'Pickup Approved', color: 'bg-blue-500/20 text-blue-500 border-blue-500/30', icon: Truck };
      case 'pickup_completed': return { label: 'Item Received', color: 'bg-indigo-500/20 text-indigo-500 border-indigo-500/30', icon: Package };
      case 'refund_approved': return { label: 'Refund Processing', color: 'bg-orange-500/20 text-orange-500 border-orange-500/30', icon: Clock };
      case 'refund_completed': return { label: 'Refunded', color: 'bg-green-500/20 text-green-500 border-green-500/30', icon: CheckCircle };
      case 'rejected': return { label: 'Rejected', color: 'bg-red-500/20 text-red-500 border-red-500/30', icon: XCircle };
      default: return { label: status, color: 'bg-gray-500/20 text-gray-500 border-gray-500/30', icon: ShieldCheck };
    }
  };

  return (
    <div className="max-w-7xl mx-auto bg-gray-900 p-4 md:p-8 min-h-screen text-white relative font-sans">
      
      {/* Toast Notification */}
      {copyFeedback && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-8 py-3 rounded-2xl shadow-2xl z-[60] animate-in fade-in slide-in-from-top-4 duration-300 flex items-center gap-2">
          <CheckCircle size={18} />
          <span className="font-semibold">{copyFeedback}</span>
        </div>
      )}

      {/* Rejection Modal */}
      {rejectionModal.isOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
          <div className="bg-gray-800 border border-gray-700 rounded-3xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <XCircle className="text-red-500" />
              Reject Return Request
            </h3>
            <p className="text-gray-400 text-sm mb-4">Please provide a reason for rejecting this return request. This will be visible to the customer.</p>
            <textarea
              className="w-full bg-gray-900 border border-gray-700 rounded-xl p-4 text-sm outline-none focus:ring-2 focus:ring-red-500 mb-6 min-h-[120px]"
              placeholder="e.g., Item shows signs of heavy usage, missing original packaging..."
              value={rejectionModal.reason}
              onChange={(e) => setRejectionModal(prev => ({ ...prev, reason: e.target.value }))}
            />
            <div className="flex gap-3">
              <button 
                onClick={() => setRejectionModal({ isOpen: false, item: null, reason: '' })}
                className="flex-1 px-4 py-3 bg-gray-700 hover:bg-gray-600 rounded-xl font-semibold transition-colors"
              >
                Cancel
              </button>
              <button 
                disabled={!rejectionModal.reason.trim()}
                onClick={() => handleStatusChange(rejectionModal.item, 'rejected', rejectionModal.reason)}
                className="flex-2 px-6 py-3 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-bold transition-all"
              >
                Reject Request
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h2 className="text-2xl md:text-4xl font-black tracking-tight">Returns <span className="text-blue-500">& Refunds</span></h2>
          <p className="text-gray-400 mt-1 font-medium">Lifecycle management for customer return requests</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={fetchRefunds} 
            className="flex items-center gap-2 bg-gray-800 px-4 py-2.5 rounded-xl border border-gray-700 hover:bg-gray-750 active:scale-95 transition-all text-sm font-semibold"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            Refresh Data
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        {[
          { label: 'New', count: stats.pending, icon: AlertCircle, color: 'text-yellow-500', border: 'border-yellow-500/20' },
          { label: 'Pickup', count: stats.pickup, icon: Truck, color: 'text-blue-500', border: 'border-blue-500/20' },
          { label: 'Verifying', count: stats.verifying, icon: Package, color: 'text-indigo-500', border: 'border-indigo-500/20' },
          { label: 'Refunded', count: stats.completed, icon: CheckCircle, color: 'text-green-500', border: 'border-green-500/20' },
          { label: 'Rejected', count: stats.rejected, icon: XCircle, color: 'text-red-500', border: 'border-red-500/20' }
        ].map((stat, i) => (
          <div key={i} className={`bg-gray-800/50 p-4 rounded-2xl border ${stat.border} flex flex-col gap-1`}>
            <stat.icon className={`${stat.color} mb-1`} size={20} />
            <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">{stat.label}</p>
            <p className="text-2xl font-black">{stat.count}</p>
          </div>
        ))}
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <div className="flex-1 relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-blue-500 transition-colors" size={20} />
          <input
            type="text" placeholder="Search by Order ID or Customer Name..." value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3.5 bg-gray-800 border border-gray-700 rounded-2xl focus:ring-2 focus:ring-blue-500/50 outline-none text-sm transition-all shadow-inner"
          />
        </div>
        <select 
          value={selectedFilter} onChange={(e) => setSelectedFilter(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded-2xl px-6 py-3.5 text-sm font-bold outline-none cursor-pointer hover:bg-gray-750 transition-colors"
        >
          <option value="all">View All Requests</option>
          <option value="return_requested">New Requests</option>
          <option value="approved">Out for Pickup</option>
          <option value="pickup_completed">Received at Warehouse</option>
          <option value="refund_approved">Processing Refunds</option>
          <option value="refund_completed">Refunded</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {/* Content Area */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-32 gap-4">
          <RefreshCw className="animate-spin text-blue-500" size={48} />
          <p className="text-gray-400 font-medium animate-pulse">Syncing return records...</p>
        </div>
      ) : filteredRefunds.length === 0 ? (
        <div className="text-center py-32 bg-gray-800/30 rounded-[32px] border-2 border-dashed border-gray-700/50">
          <div className="bg-gray-800 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
            <ShieldCheck className="text-gray-600" size={40} />
          </div>
          <h3 className="text-xl font-bold text-gray-300">No Return Requests Found</h3>
          <p className="text-gray-500 mt-2">Adjust your filters or search terms</p>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredRefunds.map((item) => {
            const config = getStatusConfig(item.status);
            const StatusIcon = config.icon;

            return (
              <div key={item.id} className="bg-gray-800/80 rounded-[28px] border border-gray-700 overflow-hidden hover:border-gray-500 transition-all group shadow-xl">
                <div className="p-1">
                  <div className="bg-gray-900/40 rounded-[24px] p-6">
                    {/* Top Row */}
                    <div className="flex flex-col lg:flex-row justify-between gap-6 mb-6">
                      <div className="flex gap-4">
                        <div className="h-14 w-14 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-500 shadow-inner group-hover:scale-110 transition-transform">
                          <User size={28} />
                        </div>
                        <div>
                          <h3 className="text-xl font-black">{item.userName}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs font-mono text-gray-500 bg-gray-900 px-2 py-0.5 rounded-full border border-gray-700">#{item.orderId?.slice(-8) || item.id?.slice(-8)}</span>
                            <span className="text-xs text-gray-400 font-medium">{item.customerEmail}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-4">
                        <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border ${config.color} font-bold text-sm`}>
                          <StatusIcon size={16} />
                          {config.label}
                        </div>
                        
                        <div className="flex items-center gap-4 bg-gray-900/60 px-6 py-2 rounded-2xl border border-gray-700">
                          <div className="text-center px-4 border-r border-gray-700">
                            <p className="text-[10px] text-gray-500 font-black uppercase">Cash Refund</p>
                            <p className="text-lg font-black text-green-500">₹{item.refundAmount || 0}</p>
                          </div>
                          <div className="text-center px-4">
                            <p className="text-[10px] text-gray-400 font-black uppercase">Coins Spent</p>
                            <div className="flex items-center gap-1 justify-center">
                              <Coins size={14} className="text-yellow-500" />
                              <p className="text-lg font-black text-white">{item.coinsToRefund || 0}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Middle Section: Request Details */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                      <div className="bg-gray-900/60 p-5 rounded-2xl border border-gray-700/50">
                        <div className="flex items-center gap-2 mb-3">
                          <Package size={16} className="text-gray-400" />
                          <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest">Return Product</h4>
                        </div>
                        <p className="text-sm font-bold text-gray-200">{item.product?.name || "Multiple Items"}</p>
                        <div className="mt-4 pt-4 border-t border-gray-700/50">
                          <div className="flex items-center gap-2 mb-2">
                            <AlertCircle size={16} className="text-purple-400" />
                            <h4 className="text-xs font-black text-purple-400 uppercase tracking-widest">Customer Reason</h4>
                          </div>
                          <p className="text-sm italic text-gray-300">"{item.reason || "No reason provided"}"</p>
                        </div>
                      </div>

                      <div className="bg-gray-900/60 p-5 rounded-2xl border border-gray-700/50">
                        <div className="flex items-center gap-2 mb-4">
                          <CreditCard size={16} className="text-gray-400" />
                          <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest">Original Bank Proof</h4>
                        </div>
                        <div className="space-y-3">
                          <div className="flex justify-between items-center group/btn">
                            <span className="text-xs text-gray-500 font-bold uppercase">A/C Holder:</span>
                            <span className="text-sm font-bold">{item.bankDetails?.accountName || "N/A"}</span>
                          </div>
                          <button 
                            onClick={() => copyToClipboard(item.bankDetails?.accountNumber, 'ACC')}
                            className="flex justify-between items-center w-full bg-gray-800 hover:bg-gray-750 p-3 rounded-xl border border-gray-750 hover:border-blue-500/30 transition-all group/copy"
                          >
                            <span className="text-xs text-gray-400 font-bold uppercase">Account No:</span>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-mono font-bold text-blue-400">{item.bankDetails?.accountNumber || "N/A"}</span>
                              <Copy size={14} className="text-gray-600 group-hover/copy:text-blue-500 transition-colors" />
                            </div>
                          </button>
                          <button 
                            onClick={() => copyToClipboard(item.bankDetails?.ifsc, 'IFSC')}
                            className="flex justify-between items-center w-full bg-gray-800 hover:bg-gray-750 p-3 rounded-xl border border-gray-750 hover:border-blue-500/30 transition-all group/copy"
                          >
                            <span className="text-xs text-gray-400 font-bold uppercase">IFSC Code:</span>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-mono font-bold text-blue-400">{item.bankDetails?.ifsc || "N/A"}</span>
                              <Copy size={14} className="text-gray-600 group-hover/copy:text-blue-500 transition-colors" />
                            </div>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Section: Action Logic */}
                    <div className="p-4 bg-blue-500/5 rounded-3xl border border-blue-500/10">
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <ShieldCheck className="text-blue-500" />
                          <div>
                            <p className="text-sm font-black">Admin Action Required</p>
                            <p className="text-[11px] text-gray-400">Following the system protocol for {config.label}</p>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                          {item.status === 'return_requested' && (
                            <>
                              <button 
                                onClick={() => handleStatusChange(item, 'approved')}
                                className="flex-1 sm:flex-none px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all hover:shadow-[0_0_20px_rgba(37,99,235,0.3)]"
                              >
                                <Truck size={18} />
                                Approve Pickup
                              </button>
                              <button 
                                onClick={() => setRejectionModal({ isOpen: true, item, reason: '' })}
                                className="flex-1 sm:flex-none px-6 py-3 bg-red-600/20 hover:bg-red-600/30 text-red-500 rounded-2xl font-black text-sm border border-red-500/20 transition-all"
                              >
                                Reject
                              </button>
                            </>
                          )}

                          {item.status === 'approved' && (
                            <div className="flex items-center gap-3 bg-blue-500/10 px-6 py-3 rounded-2xl border border-blue-500/20">
                              <RefreshCw size={18} className="animate-spin text-blue-500" />
                              <p className="text-sm font-bold text-blue-400">Shipment in Progress (Ref: {item.shiprocketOrderId || 'Creating...'})</p>
                              <button 
                                onClick={() => handleStatusChange(item, 'pickup_completed')}
                                className="ml-4 px-4 py-1.5 bg-blue-600 hover:bg-blue-500 rounded-xl text-xs font-black uppercase tracking-widest transition-all"
                              >
                                Force Received
                              </button>
                            </div>
                          )}

                          {item.status === 'pickup_completed' && (
                            <>
                              <button 
                                onClick={() => handleStatusChange(item, 'refund_approved')}
                                className="flex-1 sm:flex-none px-6 py-3 bg-orange-600 hover:bg-orange-500 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all hover:shadow-[0_0_20px_rgba(234,88,12,0.3)]"
                              >
                                <DollarSign size={18} />
                                Approve Refund
                              </button>
                              <button 
                                onClick={() => setRejectionModal({ isOpen: true, item, reason: '' })}
                                className="flex-1 sm:flex-none px-6 py-3 bg-red-600/20 hover:bg-red-600/30 text-red-500 rounded-2xl font-black text-sm border border-red-500/20 transition-all"
                              >
                                Reject After Inspection
                              </button>
                            </>
                          )}

                          {item.status === 'refund_approved' && (
                            <div className="flex items-center gap-3 bg-orange-500/10 px-6 py-3 rounded-2xl border border-orange-500/20">
                              <RefreshCw size={18} className="animate-spin text-orange-500" />
                              <p className="text-sm font-bold text-orange-400">Finalizing Transaction (Server Side)...</p>
                            </div>
                          )}

                          {item.status === 'refund_completed' && (
                            <div className="flex items-center gap-3 bg-green-500/10 px-6 py-3 rounded-2xl border border-green-500/20">
                              <CheckCircle size={18} className="text-green-500" />
                              <p className="text-sm font-bold text-green-400">Request Closed - Wallet Credited</p>
                            </div>
                          )}

                          {item.status === 'rejected' && (
                            <div className="p-4 bg-red-500/5 rounded-2xl border border-red-500/10 w-full">
                              <div className="flex items-center gap-2 text-red-400 mb-1">
                                <AlertCircle size={14} />
                                <span className="text-xs font-black uppercase tracking-wider">Rejection Reason</span>
                              </div>
                              <p className="text-sm text-gray-400 font-medium font-italic italic">"{item.rejectionReason || "No details provided"}"</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default RefundRequests;