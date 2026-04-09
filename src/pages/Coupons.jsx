import React, { useState, useEffect, useMemo } from 'react';
import { Plus, RefreshCw, Edit, Trash2, X, Calendar, Percent, Tag, Users, DollarSign, ToggleLeft, ToggleRight, Search } from 'lucide-react';
// Assuming 'couponService' is correctly defined elsewhere for Firebase interactions
import { couponService } from '../firebase/services'; 
import { sendTopicNotification } from '../firebase/sendNotification';

const Coupons = () => {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState(null);
  // NEW STATE: For handling search input
  const [searchTerm, setSearchTerm] = useState(''); 
  const [formData, setFormData] = useState({
    code: '',
    description: '',
    discountType: 'percentage', // percentage or fixed
    discountValue: '',
    minOrderAmount: '',
    maxUses: '',
    validUntil: '',
    isActive: true,
    isBankOffer: false,
    bankName: ''
  });

  // --- Utility Functions ---

  // Fetch coupons
  const fetchCoupons = async () => {
    try {
      setLoading(true);
      const data = await couponService.getAll();
      setCoupons(data);
    } catch (error) {
      console.error('Error fetching coupons:', error);
      alert('Error fetching coupons: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCoupons();
  }, []);

  // Format date
  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-IN');
  };

  // Check if coupon is expired
  const isExpired = (validUntil) => {
    if (!validUntil || typeof validUntil !== 'string') return false; 
    return new Date() > new Date(validUntil);
  };
  
  // Generate random coupon code
  const generateCouponCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData({ ...formData, code: result });
  };

  // --- Handlers ---

  // Handle form submission (Add/Edit)
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingCoupon) {
        await couponService.update(editingCoupon.id, formData);
        alert('Coupon updated successfully!');
      } else {
        await couponService.add(formData);
        alert('Coupon added successfully!');
        
        // Send notification to all users
        await sendTopicNotification(
          'all_users',
          'New Coupon Available!',
          `Use code ${formData.code} to get ${formData.discountType === 'percentage' ? formData.discountValue + '%' : '₹' + formData.discountValue} off on your next order!`,
          { screen: 'home' }
        );
      }
      setShowModal(false);
      resetForm();
      fetchCoupons();
    } catch (error) {
      console.error('Error saving coupon:', error);
      alert('Error saving coupon: ' + error.message);
    }
  };

  // Handle edit
  const handleEdit = (coupon) => {
    setEditingCoupon(coupon);
    setFormData({
      code: coupon.code,
      description: coupon.description || '',
      discountType: coupon.discountType || 'percentage',
      discountValue: coupon.discountValue || '',
      minOrderAmount: coupon.minOrderAmount || '',
      maxUses: coupon.maxUses || '',
      validUntil: coupon.validUntil ? new Date(coupon.validUntil).toISOString().split('T')[0] : '',
      isActive: coupon.isActive !== false,
      isBankOffer: coupon.isBankOffer || false,
      bankName: coupon.bankName || ''
    });
    setShowModal(true);
  };

  // Handle delete
  const handleDelete = async (couponId) => {
    if (window.confirm('Are you sure you want to delete this coupon?')) {
      try {
        await couponService.delete(couponId);
        alert('Coupon deleted successfully!');
        fetchCoupons();
      } catch (error) {
        console.error('Error deleting coupon:', error);
        alert('Error deleting coupon: ' + error.message);
      }
    }
  };

  // Handle toggle status
  const handleToggleStatus = async (couponId, currentStatus) => {
    try {
      await couponService.toggleStatus(couponId, !currentStatus);
      fetchCoupons();
    } catch (error) {
      console.error('Error toggling coupon status:', error);
      alert('Error updating coupon status: ' + error.message);
    }
  };

  // Handle add new
  const handleAddNew = () => {
    setEditingCoupon(null);
    resetForm();
    setShowModal(true);
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      code: '',
      description: '',
      discountType: 'percentage',
      discountValue: '',
      minOrderAmount: '',
      maxUses: '',
      validUntil: '',
      isActive: true,
      isBankOffer: false,
      bankName: ''
    });
  };

  // --- SEARCH AND FILTERING LOGIC ---
  // Memoized filter function to prevent unnecessary re-renders
  const filteredCoupons = useMemo(() => {
    const lowerCaseSearchTerm = searchTerm.toLowerCase().trim();
    if (!lowerCaseSearchTerm) {
      return coupons;
    }

    return coupons.filter(coupon => {
      // Search by Code and Description, handling potential null/undefined values safely
      const codeMatch = (coupon.code || '').toLowerCase().includes(lowerCaseSearchTerm);
      const descriptionMatch = (coupon.description || '').toLowerCase().includes(lowerCaseSearchTerm);
      
      return codeMatch || descriptionMatch;
    });
  }, [coupons, searchTerm]);

  // --- JSX Rendering ---

  return (
    <div className="p-4 md:p-6 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h1 className="text-2xl md:text-3xl font-bold text-white bg-gradient-to-r from-green-400 to-blue-400 bg-clip-text text-transparent">
          Coupons Management
        </h1>
        <div className="flex gap-3">
          <button 
            onClick={handleAddNew}
            className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white px-6 py-2 rounded-xl flex items-center gap-2 text-sm font-semibold shadow-lg transition-all duration-300 hover:scale-105"
          >
            <Plus size={20} />
            Add Coupon
          </button>
          <button 
            onClick={fetchCoupons}
            className="bg-gray-700/50 hover:bg-gray-700 text-white px-6 py-2 rounded-xl flex items-center gap-2 text-sm font-semibold border border-gray-600 transition-all duration-300"
          >
            <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-800/50 backdrop-blur-lg p-5 rounded-2xl border border-gray-700 shadow-xl transition-all duration-300 hover:border-blue-500/50 group">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Total Coupons</p>
              <p className="text-2xl font-bold text-white group-hover:text-blue-400 transition-colors">{coupons.length}</p>
            </div>
            <div className="p-3 bg-blue-500/10 rounded-xl">
              <Tag className="text-blue-400" size={24} />
            </div>
          </div>
        </div>
        
        <div className="bg-gray-800/50 backdrop-blur-lg p-5 rounded-2xl border border-gray-700 shadow-xl transition-all duration-300 hover:border-green-500/50 group">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Active Coupons</p>
              <p className="text-2xl font-bold text-green-400 transition-colors">
                {coupons.filter(c => c.isActive && !isExpired(c.validUntil)).length}
              </p>
            </div>
            <div className="p-3 bg-green-500/10 rounded-xl">
              <ToggleRight className="text-green-400" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-gray-800/50 backdrop-blur-lg p-5 rounded-2xl border border-gray-700 shadow-xl transition-all duration-300 hover:border-red-500/50 group">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Expired Coupons</p>
              <p className="text-2xl font-bold text-red-400 transition-colors">
                {coupons.filter(c => isExpired(c.validUntil)).length}
              </p>
            </div>
            <div className="p-3 bg-red-500/10 rounded-xl">
              <Calendar className="text-red-400" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-gray-800/50 backdrop-blur-lg p-5 rounded-2xl border border-gray-700 shadow-xl transition-all duration-300 hover:border-purple-500/50 group">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Total Usage</p>
              <p className="text-2xl font-bold text-purple-400 transition-colors">
                {coupons.reduce((sum, c) => sum + (c.usageCount || 0), 0)}
              </p>
            </div>
            <div className="p-3 bg-purple-500/10 rounded-xl">
              <Users className="text-purple-400" size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* Coupons Table */}
      <div className="bg-gray-800/50 backdrop-blur-lg rounded-2xl border border-gray-700 overflow-hidden shadow-2xl">
        
        {/* Search Bar and Table Header */}
        <div className="p-6 border-b border-gray-700 flex flex-col md:flex-row justify-between items-center gap-4">
          <h2 className="text-lg font-semibold text-white">My Coupons ({filteredCoupons.length} Found)</h2>
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search by code or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-gray-700/50 text-white border border-gray-600 rounded-xl py-2.5 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder-gray-400"
            />
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-400">Loading coupons...</p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-700/30">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Code</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Discount</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Min Order</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Usage</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Valid Until</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700/50 bg-transparent">
                  {filteredCoupons.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="px-6 py-8 text-center text-gray-400">
                        {searchTerm 
                            ? `No coupons found for "${searchTerm}".` 
                            : 'No coupons available. Click "Add Coupon" to create your first coupon.'
                        }
                      </td>
                    </tr>
                  ) : (
                    filteredCoupons.map((coupon) => (
                      <tr key={coupon.id} className="hover:bg-gray-700/30 transition-all duration-200 border-b border-gray-700/50 last:border-0">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <Tag className="text-blue-400 mr-3" size={16} />
                            <div>
                                <div className="text-sm font-semibold text-white">{coupon.code}</div>
                                <div className="text-xs text-gray-400 mt-0.5">{coupon.description}</div>
                                {coupon.isBankOffer && (
                                  <div className="text-[10px] font-bold text-blue-400 bg-blue-400/10 px-1.5 py-0.5 rounded mt-1 inline-block uppercase tracking-wider">
                                    Bank: {coupon.bankName}
                                  </div>
                                )}
                              </div>
                            </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">
                          <div className="flex items-center">
                            {coupon.discountType === 'percentage' ? (
                              <Percent className="text-green-400 mr-1.5" size={16} />
                            ) : (
                              <DollarSign className="text-green-400 mr-1.5" size={16} />
                            )}
                            <span>
                              {coupon.discountType === 'percentage' 
                                ? `${coupon.discountValue}%` 
                                : `₹${coupon.discountValue}`}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                          {coupon.minOrderAmount ? `₹${coupon.minOrderAmount}` : 'No minimum'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                          <span className="font-semibold text-white">{coupon.usageCount || 0}</span>
                          <span className="text-gray-500 ml-1">{coupon.maxUses ? `/ ${coupon.maxUses}` : '/ ∞'}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`text-sm font-medium ${isExpired(coupon.validUntil) ? 'text-red-400' : 'text-gray-300'}`}>
                            {formatDate(coupon.validUntil)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => handleToggleStatus(coupon.id, coupon.isActive)}
                            className="flex items-center"
                          >
                            {coupon.isActive && !isExpired(coupon.validUntil) ? (
                              <ToggleRight className="text-green-500" size={20} />
                            ) : (
                              <ToggleLeft className="text-gray-400" size={20} />
                            )}
                          </button>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-3">
                            <button
                              onClick={() => handleEdit(coupon)}
                              className="text-blue-400 hover:text-blue-300 bg-blue-400/10 p-2 rounded-lg transition-colors"
                              title="Edit"
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              onClick={() => handleDelete(coupon.id)}
                              className="text-red-400 hover:text-red-300 bg-red-400/10 p-2 rounded-lg transition-colors"
                              title="Delete"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden p-4 space-y-4">
              {filteredCoupons.length === 0 ? (
                <div className="text-center text-gray-500 py-12">
                   <Tag className="mx-auto h-12 w-12 opacity-20 mb-4" />
                   <p>No coupons found.</p>
                </div>
              ) : (
                filteredCoupons.map((coupon) => (
                  <div key={coupon.id} className="bg-gray-700/30 border border-gray-600 rounded-2xl p-5 shadow-lg relative group">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center">
                        <Tag className="text-blue-400 mr-3 shadow-glow" size={18} />
                        <div>
                          <span className="font-bold text-lg text-white tracking-wide">{coupon.code}</span>
                          {coupon.isBankOffer && (
                            <div className="text-[10px] font-bold text-blue-400 bg-blue-400/10 px-1.5 py-0.5 rounded mt-1 block uppercase">
                              Bank: {coupon.bankName}
                            </div>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleToggleStatus(coupon.id, coupon.isActive)}
                        className="p-1 hover:scale-110 transition-transform"
                      >
                        {coupon.isActive && !isExpired(coupon.validUntil) ? (
                          <ToggleRight className="text-green-400" size={28} />
                        ) : (
                          <ToggleLeft className="text-gray-500" size={28} />
                        )}
                      </button>
                    </div>
                    
                    <p className="text-sm text-gray-400 mb-4 line-clamp-2">{coupon.description || 'No description available'}</p>
                    
                    <div className="grid grid-cols-2 gap-y-3 gap-x-4 border-t border-gray-600 pt-4 text-xs font-medium">
                      <div>
                        <span className="text-gray-400 uppercase">Discount</span>
                        <p className="text-green-400 mt-0.5">
                          {coupon.discountType === 'percentage' 
                            ? `${coupon.discountValue}% Off` 
                            : `₹${coupon.discountValue} Off`}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-400 uppercase">Min Order</span>
                        <p className="text-white mt-0.5">
                          {coupon.minOrderAmount ? `₹${coupon.minOrderAmount}` : 'No Min'}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-400 uppercase">Usage</span>
                        <p className="text-white mt-0.5">
                          {coupon.usageCount || 0} {coupon.maxUses ? `/ ${coupon.maxUses}` : '/ ∞'}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-400 uppercase">Expiry</span>
                        <p className={`mt-0.5 ${isExpired(coupon.validUntil) ? 'text-red-400' : 'text-white'}`}>
                          {formatDate(coupon.validUntil)}
                        </p>
                      </div>
                    </div>

                    <div className="flex justify-end gap-3 mt-5 pt-3 border-t border-gray-600/50">
                      <button
                        onClick={() => handleEdit(coupon)}
                        className="bg-blue-500/10 text-blue-400 p-2.5 rounded-xl hover:bg-blue-500/20 transition-all"
                      >
                        <Edit size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(coupon.id)}
                        className="bg-red-500/10 text-red-400 p-2.5 rounded-xl hover:bg-red-500/20 transition-all"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 border border-gray-700 rounded-3xl p-6 md:p-8 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-bold text-white bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                {editingCoupon ? 'Update Coupon' : 'Create New Coupon'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-400 mb-2 uppercase tracking-wider">
                    Coupon Code
                  </label>
                  <div className="group relative">
                    <Tag className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                    <input
                      type="text"
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                      className="w-full bg-gray-700/50 text-white border border-gray-600 pl-12 pr-24 py-3.5 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all font-mono tracking-widest text-lg"
                      placeholder="WELCOME50"
                      required
                    />
                    <button
                      type="button"
                      onClick={generateCouponCode}
                      className="absolute right-2 top-1/2 -translate-y-1/2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all active:scale-95"
                    >
                      GENERATE
                    </button>
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-400 mb-2 uppercase tracking-wider">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full bg-gray-700/50 text-white border border-gray-600 px-4 py-3 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all resize-none"
                    placeholder="Briefly describe what this coupon provides..."
                    rows="2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-400 mb-2 uppercase tracking-wider">
                    Type
                  </label>
                  <select
                    value={formData.discountType}
                    onChange={(e) => setFormData({ ...formData, discountType: e.target.value })}
                    className="w-full bg-gray-700/50 text-white border border-gray-600 px-4 py-3.5 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 appearance-none"
                    required
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed (₹)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-400 mb-2 uppercase tracking-wider">
                    Value
                  </label>
                  <input
                    type="number"
                    value={formData.discountValue}
                    onChange={(e) => setFormData({ ...formData, discountValue: e.target.value })}
                    className="w-full bg-gray-700/50 text-white border border-gray-600 px-4 py-3.5 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    placeholder="10"
                    min="0"
                    max={formData.discountType === 'percentage' ? '100' : undefined}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-400 mb-2 uppercase tracking-wider">
                    Min Order
                  </label>
                  <input
                    type="number"
                    value={formData.minOrderAmount}
                    onChange={(e) => setFormData({ ...formData, minOrderAmount: e.target.value })}
                    className="w-full bg-gray-700/50 text-white border border-gray-600 px-4 py-3.5 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    placeholder="₹500"
                    min="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-400 mb-2 uppercase tracking-wider">
                    Max Usage
                  </label>
                  <input
                    type="number"
                    value={formData.maxUses}
                    onChange={(e) => setFormData({ ...formData, maxUses: e.target.value })}
                    className="w-full bg-gray-700/50 text-white border border-gray-600 px-4 py-3.5 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    placeholder="Unlimited"
                    min="1"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-400 mb-2 uppercase tracking-wider">
                    Valid Until
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                      type="date"
                      value={formData.validUntil}
                      onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
                      className="w-full bg-gray-700/50 text-white border border-gray-600 pl-12 pr-4 py-3.5 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                      min={new Date().toISOString().split('T')[0]}
                      required
                    />
                  </div>
                </div>

                <div className="md:col-span-2 space-y-4 bg-gray-700/30 p-4 rounded-2xl border border-gray-700">
                  <div className="flex items-center justify-between">
                    <label htmlFor="isActive" className="text-sm font-semibold text-gray-300">
                      Enable Coupon Immediately
                    </label>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, isActive: !formData.isActive })}
                      className="focus:outline-none"
                    >
                      {formData.isActive ? (
                        <ToggleRight className="text-green-400 w-10 h-10" />
                      ) : (
                        <ToggleLeft className="text-gray-500 w-10 h-10" />
                      )}
                    </button>
                    <input
                      type="checkbox"
                      id="isActive"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      className="hidden"
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <label htmlFor="isBankOffer" className="text-sm font-semibold text-gray-300">
                      Specific Bank Offer
                    </label>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, isBankOffer: !formData.isBankOffer })}
                      className="focus:outline-none"
                    >
                      {formData.isBankOffer ? (
                        <ToggleRight className="text-blue-400 w-10 h-10" />
                      ) : (
                        <ToggleLeft className="text-gray-500 w-10 h-10" />
                      )}
                    </button>
                    <input
                      type="checkbox"
                      id="isBankOffer"
                      checked={formData.isBankOffer}
                      onChange={(e) => setFormData({ ...formData, isBankOffer: e.target.checked })}
                      className="hidden"
                    />
                  </div>

                  {formData.isBankOffer && (
                    <div className="pt-2 animate-in fade-in slide-in-from-top-2">
                       <input
                        type="text"
                        value={formData.bankName}
                        onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                        className="w-full bg-gray-800 text-white border border-blue-500/50 px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold placeholder:text-gray-500 placeholder:font-normal"
                        placeholder="SBI, HDFC..."
                        required={formData.isBankOffer}
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-4 px-6 rounded-2xl font-bold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white py-4 px-6 rounded-2xl font-bold transition-all shadow-glow active:scale-95"
                >
                  {editingCoupon ? 'Update Coupon' : 'Create Coupon'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Coupons; 