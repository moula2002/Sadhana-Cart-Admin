import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { collection, onSnapshot, query, where ,collectionGroup,getDoc, doc} from 'firebase/firestore';
import { db } from '../firebase/config';

import { 
  RefreshCw, 
  ChevronDown, 
  User, 
  CreditCard, 
  MessageSquare,
  Calendar, 
  Edit, 
  Trash2, 
  Package, 
  Plus, 
  X, 
  Save, 
  Eye, 
  Search,
  Filter,
  Download,
  MoreVertical
} from 'lucide-react';
import { orderService } from '../firebase/services';
import { debounce } from 'lodash';
import { sendOrderEmail } from '../utils/sendOrderEmail';


const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);
  const [viewingOrder, setViewingOrder] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [orderStats, setOrderStats] = useState({
    all: 0,
    pending: 0,
    processing: 0,
    shipped: 0,
    delivered: 0,
    cancelled: 0
  });
  const [loadingStats, setLoadingStats] = useState(false);
  const [formData, setFormData] = useState({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    amount: '',
    paymentStatus: 'pending',
    status: 'pending',
    items: [],
    shippingAddress: ''
  });
  
  const [pendingStatusChanges, setPendingStatusChanges] = useState({});
  const [bulkActions, setBulkActions] = useState([]);
  const [selectedOrders, setSelectedOrders] = useState(new Set());
  const [walletBalances, setWalletBalances] = useState({});

  // Memoized order statistics calculation
const calculateStats = useCallback((ordersList) => {
  return {
    all: ordersList.length,
    pending: ordersList.filter(order => order.status === 'pending').length,
    processing: ordersList.filter(order => order.status === 'processing').length,
    shipped: ordersList.filter(order => order.status === 'shipped').length,
    delivered: ordersList.filter(order => order.status === 'delivered').length,
    cancelled: ordersList.filter(order => order.status === 'cancelled').length,
    return_requested: ordersList.filter(order => order.status === 'return_requested').length,
    returned: ordersList.filter(order => order.status === 'returned').length, // Added this
  };
}, []);

  // Optimized fetch with caching
// Optimized fetch with caching and status normalization
const fetchOrders = useCallback(async () => {
  try {
    setLoading(true);
    const fetchedOrders = await orderService.getAll();

    // Remove duplicates using a Map (Key = Order ID)
    const uniqueMap = new Map();
    
    fetchedOrders.forEach(order => {
      if (order.id) {
        // 1. DATA NORMALIZATION: 
        // Prioritize orderStatus (customer updates) over status (admin updates)
        // This ensures "return_requested" is seen even if "delivered" still exists in the 'status' field
        const effectiveStatus = order.orderStatus || order.status || 'pending';

        const normalizedOrder = {
          ...order,
          status: effectiveStatus // Force all logic to use this single key
        };

        // 2. LATEST UPDATE WINS:
        // Ensure that if duplicate IDs exist, we keep the one with the most recent activity
        const existing = uniqueMap.get(order.id);
        const newTime = order.updatedAt?.seconds || order.createdAt?.seconds || 0;
        const oldTime = existing?.updatedAt?.seconds || existing?.createdAt?.seconds || 0;

        if (!existing || newTime >= oldTime) {
          uniqueMap.set(order.id, normalizedOrder);
        }
      }
    });

    const uniqueList = Array.from(uniqueMap.values());

    // Sort: Newest first
    uniqueList.sort((a, b) => {
      const timeA = a.createdAt?.seconds || a.orderDate?.seconds || 0;
      const timeB = b.createdAt?.seconds || b.orderDate?.seconds || 0;
      return timeB - timeA;
    });

    setOrders(uniqueList);
    
    // This will now correctly count 'return_requested' because the field is normalized
    setOrderStats(calculateStats(uniqueList));
    
  } catch (error) {
    console.error('Error fetching orders:', error);
  } finally {
    setLoading(false);
  }
}, [calculateStats]);


const formatProductDisplay = (order) => {
  const items = order.products || order.items || [];
  if (items.length === 0) return 'No products';
  
  return items.map((item, index) => {
    const name = item.name || item.productName || `Item ${index + 1}`;
    const qty = item.quantity || item.qty || 1;
    return (
      <div key={index} className="text-xs mb-1 last:mb-0">
        <span className="text-blue-300 font-medium">{qty}x</span> {name}
      </div>
    );
  });
};

  // Debounced search function
  const debouncedSearch = useMemo(
    () => debounce((term, ordersList, filter) => {
      if (!term.trim()) {
        // If no search term, just apply the current filter
        applyFilter(ordersList, filter);
        return;
      }

      const searchLower = term.toLowerCase();
      const filtered = ordersList.filter(order => 
        order.customerName?.toLowerCase().includes(searchLower) ||
        order.customerEmail?.toLowerCase().includes(searchLower) ||
        order.customerPhone?.includes(searchLower) ||
        order.id?.toLowerCase().includes(searchLower) ||
        extractOrderSKUs(order).toLowerCase().includes(searchLower)
      );
      
      setFilteredOrders(filtered);
    }, 300),
    []
  );

  // Apply filter without search
  const applyFilter = useCallback((ordersList, filter) => {
    const getOrderDateMs = (date) => {
      if (!date) return 0;
      try {
        if (typeof date === 'object' && date.seconds) {
          return date.seconds * 1000;
        }
        const d = new Date(date);
        const t = d.getTime();
        return isNaN(t) ? 0 : t;
      } catch (e) {
        return 0;
      }
    };

    const getOrderDateValue = (order) => {
      return getOrderDateMs(order?.createdAt || order?.orderDate || order?.date);
    };

    if (filter === 'all') {
      const sortedAll = [...ordersList].sort((a, b) => getOrderDateValue(b) - getOrderDateValue(a));
      setFilteredOrders(sortedAll);
    } else {
      const filtered = ordersList.filter(order => order.status === filter);
      const sortedFiltered = filtered.sort((a, b) => getOrderDateValue(b) - getOrderDateValue(a));
      setFilteredOrders(sortedFiltered);
    }
  }, []);

  // Optimized useEffect for filtering and searching
  useEffect(() => {
    if (orders.length === 0) return;

    if (searchTerm.trim()) {
      debouncedSearch(searchTerm, orders, selectedFilter);
    } else {
      applyFilter(orders, selectedFilter);
    }
  }, [orders, selectedFilter, searchTerm, debouncedSearch, applyFilter]);

  // Fetch orders on component mount
  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const refreshOrders = async () => {
    await fetchOrders();
  };

  const handleFilterChange = (e) => {
    setSelectedFilter(e.target.value);
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleEdit = (order) => {
    setEditingOrder(order);
    setFormData({
      customerName: order.customerName || '',
      customerEmail: order.customerEmail || '',
      customerPhone: order.customerPhone || '',
      amount: calculateOrderTotal(order),
      paymentStatus: order.paymentStatus || 'pending',
      status: order.status || 'pending',
      items: JSON.stringify(order.items || [], null, 2),
      shippingAddress: order.shippingAddress || '',
      customerId: order.customerId || null
    });
    setShowModal(true);
  };

  const handleView = (order) => {
    setViewingOrder(order);
    setShowViewModal(true);
  };

  const handleDelete = async (orderId, customerId = null) => {
    if (window.confirm('Are you sure you want to delete this order?')) {
      try {
        await orderService.delete(orderId, customerId);
        await fetchOrders();
      } catch (error) {
        console.error('Error deleting order:', error);
        alert('Error deleting order');
      }
    }
  };

const handleSave = async (e) => {
  if (e) e.preventDefault();

  try {
    let processedFormData = { ...formData };

    // Parse JSON items if they are strings
    if (typeof processedFormData.items === 'string') {
      try {
        processedFormData.items = JSON.parse(processedFormData.items);
      } catch (error) {
        console.error('Error parsing items JSON:', error);
        alert('Invalid items format. Please check your JSON.');
        return;
      }
    }

    processedFormData.amount = parseFloat(processedFormData.amount) || 0;

    if (editingOrder) {
      const newStatus = processedFormData.status;

      if (!processedFormData.customerId && editingOrder.customerId) {
        processedFormData.customerId = editingOrder.customerId;
      }

      // Convert status → orderStatus
      processedFormData.orderStatus = newStatus;
      delete processedFormData.status;

      // Update order
      await orderService.update(editingOrder.id, processedFormData);
    }

    setShowModal(false);
    setEditingOrder(null);
    resetForm();

    await fetchOrders();

  } catch (error) {
    console.error('Error saving order:', error);
    alert('Error saving order: ' + error.message);
  }
};

  useEffect(() => {
  const loadWallets = async () => {
    const balances = {};

   for (const order of orders) {

  const userId = order.userId || order.customerId;

  if (!userId) continue;

  const balance = await fetchWalletBalance(userId);

  balances[userId] = balance;
}

    setWalletBalances(balances);
  };

  if (orders.length > 0) {
    loadWallets();
  }
}, [orders]);

  const resetForm = () => {
    setFormData({
      customerName: '',
      customerEmail: '',
      customerPhone: '',
      amount: '',
      paymentStatus: 'pending',
      status: 'pending',
      items: '[]',
      shippingAddress: '',
      customerId: null
    });
  };

  const handleAddNew = () => {
    resetForm();
    setEditingOrder(null);
    setShowModal(true);
  };

  const handleStatusUpdate = async (orderId, newStatus, customerId = null) => {
    try {
      // Optimistic update removed for safety and to prevent the error previously mentioned.
      // We will rely on fetchOrders() to update the UI upon success.
      const currentOrder = orders.find(o => o.id === orderId);
      await orderService.updateStatus(orderId, newStatus, customerId);
      // Refresh to ensure consistency
      await fetchOrders();
      
    } catch (error) {
      console.error('Error updating order status:', error);
      alert('Error updating order status');
      // Re-fetch in case of failure to revert any transient optimistic UI updates 
      // (although we've removed the explicit optimistic update, this is a safe fallback)
      await fetchOrders(); 
    }
  };
const handleStatusSelectChange = async (orderId, newStatus) => {

  // Find the order first
  const currentOrder = orders.find((o) => o.id === orderId);

  if (!currentOrder) {
    console.error("Order not found");
    return;
  }

  // If return requested → ask admin approval
  if (currentOrder.status === "return_requested" && newStatus === "returned") {
    const confirmReturn = window.confirm("Approve return request?");
    if (!confirmReturn) return;
  }

  try {
    setLoading(true);

    await orderService.updateStatus(orderId, newStatus);

    await fetchOrders();

    console.log(`Status updated to ${newStatus}`);

  } catch (error) {
    console.error("Update failed:", error);
    alert("Failed to update status");
  } finally {
    setLoading(false);
  }
};

  const handleStatusUpdateClick = async (orderId, customerId = null) => {
    const newStatus = pendingStatusChanges[orderId];
    if (newStatus) {
      await handleStatusUpdate(orderId, newStatus, customerId);
      setPendingStatusChanges(prev => {
        const updated = { ...prev };
        delete updated[orderId];
        return updated;
      });
    }
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    
    try {
      if (date && typeof date === 'object' && date.seconds) {
        return new Date(date.seconds * 1000).toLocaleDateString('en-IN', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      }
      
      const dateObj = new Date(date);
      if (isNaN(dateObj.getTime())) {
        return 'Invalid Date';
      }
      
      return dateObj.toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      console.error('Error formatting date:', date, error);
      return 'Invalid Date';
    }
  };

  const formatCurrency = (amount) => {
    return `₹${parseFloat(amount || 0).toLocaleString('en-IN')}`;
  };

 const calculateOrderTotal = (order) => {

  const payable = Number(order.payableAmount);
  const productsTotal = Number(order.productsTotal);

  // 1️⃣ First priority → payableAmount
  if (!isNaN(payable) && payable > 0) {
    return payable;
  }

  // 2️⃣ Second priority → productsTotal
  if (!isNaN(productsTotal) && productsTotal > 0) {
    return productsTotal;
  }

  // 3️⃣ fallback → totalAmount
  if (order.totalAmount && Number(order.totalAmount) > 0) {
    return Number(order.totalAmount);
  }

  if (order.amount && Number(order.amount) > 0) {
    return Number(order.amount);
  }

  // 4️⃣ calculate from products
  if (order.products && Array.isArray(order.products)) {
    return order.products.reduce((sum, product) => {
      const price = Number(product.price || product.sellingPrice || product.mrp || 0);
      const qty = Number(product.quantity || product.qty || 1);
      return sum + price * qty;
    }, 0);
  }

  if (order.items && Array.isArray(order.items)) {
    return order.items.reduce((sum, item) => {
      const price = Number(item.price || item.sellingPrice || item.mrp || 0);
      const qty = Number(item.quantity || item.qty || 1);
      return sum + price * qty;
    }, 0);
  }

  return 0;
};

  const getSKUFromVariantList = (obj, preferredSize) => {
    if (obj && Array.isArray(obj.sizevariants)) {
      if (preferredSize) {
        const match = obj.sizevariants.find(v => ((v.size || v.label) === preferredSize) && v.sku);
        if (match && match.sku) return match.sku;
      }
      const first = obj.sizevariants.find(v => v.sku);
      if (first && first.sku) return first.sku;
    }
    return null;
  };

  const getBaseSKU = (obj) => {
    if (!obj || typeof obj !== 'object') return null;
    const keys = ['basesku', 'baseSku', 'baseSKU', 'base_sku'];
    for (const k of keys) {
      if (obj[k] && typeof obj[k] === 'string' && obj[k].trim().length > 0) {
        return obj[k];
      }
    }
    return null;
  };

  const getSKUFromItem = (item) => {
    if (!item) return null;
    if (item.sku) return item.sku;
    const itemBase = getBaseSKU(item);
    if (itemBase) return itemBase;
    const preferredSize = item.size || item.selectedSize || (item.variant && item.variant.size) || item.variantSize;
    const itemVariantSku = getSKUFromVariantList(item, preferredSize);
    if (itemVariantSku) return itemVariantSku;
    if (item.product && typeof item.product === 'object') {
      const p = item.product;
      if (p.sku) return p.sku;
      const productBase = getBaseSKU(p);
      if (productBase) return productBase;
      const pPreferredSize = p.size || p.selectedSize || (p.variant && p.variant.size) || p.variantSize;
      const productVariantSku = getSKUFromVariantList(p, pPreferredSize);
      if (productVariantSku) return productVariantSku;
    }
    return null;
  };



// Add this ref at the very top of your Orders component (after your states)
const processedOrders = React.useRef(new Set());


const handleEmailSend = async (userRef, orderId, status, orderData) => {
  try {
    if (!userRef) return;
    
    // Get the User document to find the customer's email
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      const userData = userSnap.data();
      
      if (userData.email) {
        // Format products list into a string (e.g., "iPhone 15 (x1), AirPods (x2)")
        const items = orderData.products || orderData.items || [];
        const formattedProducts = items.length > 0 
          ? items.map(i => `${i.name || i.productName} (x${i.quantity || 1})`).join(", ")
          : "No items listed";

        // Call your existing EmailJS utility
        await sendOrderEmail({
          userEmail: userData.email,
          userName: userData.name || "Customer",
          _id: orderId,
          products: formattedProducts 
        }, status);
        
        console.log(`📧 Email sent for order ${orderId} with status: ${status}`);
      }
    }
  } catch (err) {
    console.error("❌ Email trigger error:", err);
  }
};


// Ensure this ref is defined at the top of your component
useEffect(() => {
  const ordersRef = collectionGroup(db, "orders");
  const appStartTime = Date.now();

  const unsubscribe = onSnapshot(ordersRef, async (snapshot) => {
    // 1. DEDUPLICATE & NORMALIZE DATA
    const uniqueMap = new Map();
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      uniqueMap.set(doc.id, {
        id: doc.id,
        ...data,
        // Ensure status is normalized for consistent UI colors/counts
        status: data.orderStatus || data.status || 'pending'
      });
    });

    const uniqueList = Array.from(uniqueMap.values());
    
    // Sort Newest First
    uniqueList.sort((a, b) => {
      const timeA = a.updatedAt?.seconds || a.createdAt?.seconds || 0;
      const timeB = b.updatedAt?.seconds || b.createdAt?.seconds || 0;
      return timeB - timeA;
    });

    // Update UI State (This fixes the "2 times" duplicate issue)
    setOrders(uniqueList);
    setOrderStats(calculateStats(uniqueList));

    // 2. SMART EMAIL TRIGGER (Only fire for actual changes)
    snapshot.docChanges().forEach(async (change) => {
      const orderData = change.doc.data();
      const orderId = change.doc.id;
      const status = orderData.orderStatus || orderData.status;

      // Logic for NEW orders
      if (change.type === "added") {
        const timestamp = orderData.orderDate || orderData.createdAt;
        const orderTime = timestamp?.seconds * 1000 || 0;
        
        // Only trigger if order is new AND created after dashboard was opened
        if (orderTime > appStartTime && !processedOrders.current.has(orderId)) {
          processedOrders.current.add(orderId);
          await handleEmailSend(change.doc.ref.parent.parent, orderId, "Confirmed", orderData);
        }
      }

      // Logic for STATUS updates (Return, Shipped, etc.)
    // Inside your onSnapshot -> snapshot.docChanges().forEach
if (change.type === "modified") {
  const newStatus = orderData.orderStatus || orderData.status;
  
  // Define which statuses should trigger an email
  const triggerStatuses = ["processing", "shipped", "delivered", "returned", "cancelled"];

  if (triggerStatuses.includes(newStatus)) {
    // We use change.doc.ref.parent.parent to get the User document 
    // because orders are in a sub-collection: users/{userId}/orders/{orderId}
    const userDocRef = change.doc.ref.parent.parent;
    
    if (userDocRef) {
      await handleEmailSend(
        userDocRef,
        orderId,
        newStatus,
        orderData
      );
    }
  }
}
      }
    );
  });

  return () => unsubscribe();
}, [calculateStats]);

const fetchWalletBalance = async (userId) => {
  try {
    const userRef = doc(db, "users", userId);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      const data = userSnap.data();
      return data.walletCoins || data.walletBalance || 0;
    }

    return 0;
  } catch (error) {
    console.error("Error fetching wallet:", error);
    return 0;
  }
};

  const extractOrderSKUs = (order) => {
    const skus = [];
    
    if (order.products && Array.isArray(order.products)) {
      order.products.forEach(product => {
        let sku = product.sku;
        if (!sku) {
          const preferredSize = product.size || product.selectedSize || (product.variant && product.variant.size) || product.variantSize;
          sku = getSKUFromVariantList(product, preferredSize);
        }
        if (!sku) {
          sku = getBaseSKU(product);
        }
        if (sku) skus.push(sku);
      });
    }
    
    if (order.items && Array.isArray(order.items)) {
      order.items.forEach(item => {
        const sku = getSKUFromItem(item);
        if (sku) skus.push(sku);
      });
    }
    
    return skus.length > 0 ? skus.join(', ') : 'N/A';
  };

  const getStatusColor = (status) => {
   switch (status?.toString().toLowerCase().trim()){
      case 'delivered': return 'bg-green-500';
      case 'shipped': return 'bg-blue-500';
      case 'processing': return 'bg-yellow-500';
      case 'pending': return 'bg-orange-500';
      case 'cancelled': return 'bg-red-500';
      case 'return_requested': return 'bg-purple-500';
      case 'returned': return 'bg-gray-600'; // Added color for actual returned status
      default: return 'bg-gray-500';
    }
  };

  const getPaymentStatusColor = (status) => {
    switch (status) {
      case 'paid': return 'bg-green-500';
      case 'pending': return 'bg-yellow-500';
      case 'failed': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const OrderSkeleton = () => (
  <div className="animate-pulse">
    {/* Desktop Skeleton */}
    <div className="hidden lg:block">
      <table className="w-full">
        <tbody>
          {[...Array(5)].map((_, i) => (
            <tr key={`skeleton-${i}`} className="border-t border-gray-700">
              <td className="px-6 py-4">
                <div className="h-4 bg-gray-600 rounded w-32"></div>
              </td>
              <td className="px-6 py-4">
                <div className="h-4 bg-gray-600 rounded w-24"></div>
              </td>
              <td className="px-6 py-4">
                <div className="h-4 bg-gray-600 rounded w-20"></div>
              </td>
              <td className="px-6 py-4">
                <div className="h-6 bg-gray-600 rounded w-24"></div>
              </td>
              <td className="px-6 py-4">
                <div className="h-6 bg-gray-600 rounded w-20"></div>
              </td>
              <td className="px-6 py-4">
                <div className="h-4 bg-gray-600 rounded w-28"></div>
              </td>
              <td className="px-6 py-4">
                <div className="h-8 bg-gray-600 rounded w-24"></div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>

    {/* Mobile Skeleton */}
    <div className="lg:hidden space-y-4">
      {[...Array(3)].map((_, i) => (
        <div key={`mobile-skeleton-${i}`} className="bg-gray-800 rounded-lg p-4">
          <div className="h-4 bg-gray-600 rounded w-3/4 mb-2"></div>
          <div className="h-3 bg-gray-600 rounded w-1/2 mb-4"></div>
          <div className="space-y-2">
            <div className="h-3 bg-gray-600 rounded w-full"></div>
            <div className="h-3 bg-gray-600 rounded w-2/3"></div>
          </div>
        </div>
      ))}
    </div>
  </div>
);


  return (
  <div className="max-w-7xl mx-auto bg-gray-900 p-4 md:p-6 min-h-screen">
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-6 gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">Order Management</h2>
          <p className="text-gray-400">Manage and track all customer orders</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <button 
            onClick={handleAddNew}
            className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-4 py-2.5 rounded-lg transition-all duration-200 flex items-center gap-2 shadow-lg hover:shadow-xl"
          >
            <Plus size={18} />
            Add Order
          </button>
          
          <button 
            onClick={refreshOrders}
            className="bg-gray-700 hover:bg-gray-600 text-white p-2.5 rounded-lg transition-colors shadow-lg"
            disabled={loading}
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Search and Filter Bar */}
      <div className="bg-gray-800 rounded-xl p-4 mb-6 shadow-lg">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search Bar */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search orders by customer name, email, phone, or SKU..."
              value={searchTerm}
              onChange={handleSearchChange}
              className="w-full pl-10 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>

          {/* Filter Dropdown */}
          <div className="flex gap-3">
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <select 
                value={selectedFilter}
                onChange={handleFilterChange}
                className="pl-10 pr-8 py-3 bg-gray-700 text-white border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none min-w-[160px]"
              >
                <option value="all">All Orders</option>
                <option value="pending">Pending</option>
                <option value="processing">Processing</option>
                <option value="shipped">Shipped</option>
                <option value="delivered">Delivered</option>
                <option value="cancelled">Cancelled</option>
                <option value="return_requested">Return Requested</option>
              </select>
              <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
            </div>
          </div>
        </div>
      </div>

      {/* Order Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        {[
          { key: 'all', label: 'Total Orders', color: 'blue', icon: Package },
          { key: 'pending', label: 'Pending', color: 'orange', icon: Calendar },
          { key: 'processing', label: 'Processing', color: 'yellow', icon: RefreshCw },
          { key: 'shipped', label: 'Shipped', color: 'purple', icon: Package },
          { key: 'delivered', label: 'Delivered', color: 'green', icon: Save },
          { key: 'cancelled', label: 'Cancelled', color: 'red', icon: Trash2 },
         { key: 'return_requested', label: 'Return Requests', color: 'purple', icon: MessageSquare }
        ].map((stat) => {
          const IconComponent = stat.icon;
          return (
            <div 
              key={stat.key}
              className={`rounded-xl p-4 cursor-pointer transition-all duration-200 transform hover:scale-105 ${
                selectedFilter === stat.key 
                  ? `bg-${stat.color}-900 border-2 border-${stat.color}-500 shadow-lg` 
                  : 'bg-gray-800 hover:bg-gray-750 shadow-md'
              }`}
              onClick={() => setSelectedFilter(stat.key)}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className={`text-2xl font-bold text-${stat.color}-400`}>
                    {loadingStats ? '...' : orderStats[stat.key]}
                  </div>
                  <div className="text-sm text-gray-400 mt-1">{stat.label}</div>
                </div>
                <div className={`p-2 rounded-lg bg-${stat.color}-500 bg-opacity-20`}>
                  <IconComponent className={`h-5 w-5 text-${stat.color}-400`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Orders Table Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-3">
        <h3 className="text-lg font-semibold text-white">
          {selectedFilter === 'all' ? 'All Orders' : `${selectedFilter.charAt(0).toUpperCase() + selectedFilter.slice(1)} Orders`} 
          <span className="text-blue-400 ml-2">({filteredOrders.length})</span>
        </h3>
        
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          <span>Last updated: {new Date().toLocaleTimeString()}</span>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-gray-800 rounded-xl overflow-hidden shadow-lg">
        {loading ? (
          <div className="p-8">
            <OrderSkeleton />
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden lg:block">
              <table className="w-full">
                <thead className="bg-gray-750">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300 uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300 uppercase tracking-wider">
                      Products
                    </th>

                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">
  Wallet Balance
</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300 uppercase tracking-wider">
                      Amount
                    </th>

                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300 uppercase tracking-wider">
                      Payment
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center justify-center">
                          <Package className="h-16 w-16 text-gray-500 mb-4" />
                          <p className="text-lg font-medium text-gray-300 mb-2">No orders found</p>
                          <p className="text-gray-400 mb-4">
                            {searchTerm ? 'Try adjusting your search terms' : 'No orders match the current filter'}
                          </p>
                          {searchTerm && (
                            <button
                              onClick={() => setSearchTerm('')}
                              className="text-blue-400 hover:text-blue-300"
                            >
                              Clear search
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredOrders.map((order) => (
                     <tr key={`desktop-${order.id}`} className="group hover:bg-gray-750 transition-colors">
                      
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-3">
                            <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center">
                              <User className="h-5 w-5 text-white" />
                            </div>
                            <div>
                              <div className="text-white font-medium group-hover:text-blue-300 transition-colors">
                                {order.customerName}
                              </div>
                              <div className="text-sm text-gray-400">{order.customerEmail}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-white text-sm max-w-[200px] max-h-[80px] overflow-y-auto scrollbar-hide">
    {formatProductDisplay(order)}
  </div>
                        </td>
                       <td className="px-6 py-4 text-white font-semibold">
  {walletBalances[order.userId] || 0} Coins
</td>
                        <td className="px-6 py-4">
                          <div className="text-white font-semibold text-lg">
                            {formatCurrency(calculateOrderTotal(order))}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-1">
                            <div className="text-sm text-gray-300">
                              {order.paymentMethod || 'N/A'}
                            </div>
                            <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPaymentStatusColor(order.paymentStatus)} text-white`}>
                              {order.paymentStatus}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col space-y-2">
                            <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(order.status)} text-white`}>
                             {order.orderStatus || order.status}
                            </div>
                            <div className="flex space-x-1">
                              {/* Change this select and remove the button logic below it */}
{order.status === "return_requested" ? (
<div className="flex gap-2">

<button
onClick={()=>handleStatusSelectChange(order.id,"returned")}
className="bg-green-600 text-white px-2 py-1 rounded text-xs"
>
Approve
</button>

<button
onClick={()=>handleStatusSelectChange(order.id,"delivered")}
className="bg-red-600 text-white px-2 py-1 rounded text-xs"
>
Reject
</button>

</div>
) : (
<select
value={order.orderStatus || order.status}
onChange={(e)=>handleStatusSelectChange(order.id,e.target.value)}
className="bg-gray-700 text-white text-xs px-2 py-1 rounded border border-gray-600"
>
<option value="pending">Pending</option>
<option value="processing">Processing</option>
<option value="shipped">Shipped</option>
<option value="delivered">Delivered</option>
<option value="cancelled">Cancelled</option>
<option value="return_requested">Return Requested</option>
<option value="returned">Returned</option>
</select>
)}
                              {pendingStatusChanges[order.id] && pendingStatusChanges[order.id] !== order.status && (
                                <button
                                  onClick={() => handleStatusUpdateClick(order.id, order.customerId)}
                                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-2 py-1 rounded transition-colors"
                                >
                                  Update
                                </button>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-gray-300 text-sm">
                            {formatDate(order.createdAt)}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-2 opacity-100 transition-opacity">
                            <button 
                              onClick={() => handleView(order)}
                              className="text-green-400 hover:text-green-300 p-1.5 rounded-lg hover:bg-gray-700 transition-colors"
                              title="View Order"
                            >
                              <Eye size={16} />
                            </button>
                            <button 
                              onClick={() => handleEdit(order)}
                              className="text-blue-400 hover:text-blue-300 p-1.5 rounded-lg hover:bg-gray-700 transition-colors"
                              title="Edit Order"
                            >
                              <Edit size={16} />
                            </button>
                            <button 
                              onClick={() => handleDelete(order.id, order.customerId)}
                              className="text-red-400 hover:text-red-300 p-1.5 rounded-lg hover:bg-gray-700 transition-colors"
                              title="Delete Order"
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

            {/* Mobile Cards */}
            <div className="lg:hidden space-y-4 p-4">
              {filteredOrders.length === 0 ? (
                <div className="bg-gray-750 rounded-lg p-6 text-center">
                  <Package className="mx-auto h-12 w-12 text-gray-500 mb-4" />
                  <p className="text-lg font-medium text-gray-300 mb-2">No orders found</p>
                  <p className="text-gray-400">
                    {searchTerm ? 'Try adjusting your search terms' : 'No orders available'}
                  </p>
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm('')}
                      className="text-blue-400 hover:text-blue-300 mt-2"
                    >
                      Clear search
                    </button>
                  )}
                </div>
              ) : (
                filteredOrders.map((order) => (
                  <div key={`mobile-${order.id}`}>

                    {/* Order Header */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center">
                          <User className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <div className="text-white font-medium">{order.customerName}</div>
                          <div className="text-xs text-gray-400">#{order.id}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-white font-semibold text-lg">
                          {formatCurrency(calculateOrderTotal(order))}
                        </div>
                        <div className="text-xs text-gray-400">{formatDate(order.createdAt)}</div>
                      </div>
                    </div>

                    {/* Order Details */}
                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between">
                       
                        <span className="text-sm text-white text-right">
                        {formatProductDisplay(order)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-400">Payment</span>
                        <div className="text-right">
                          <div className="text-sm text-white">{order.paymentMethod || 'N/A'}</div>
                          <div className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getPaymentStatusColor(order.paymentStatus)} text-white mt-1`}>
                            {order.paymentStatus}
                          </div>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-400">Status</span>
                        <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(order.status)} text-white`}>
                          {(order.orderStatus || order.status)?.replace("_", " ")}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="space-y-2 pt-3 border-t border-gray-700">
                    {order.status === "return_requested" ? (
<div className="flex gap-2">

<button
onClick={()=>handleStatusSelectChange(order.id,"returned")}
className="bg-green-600 text-white px-2 py-1 rounded text-xs"
>
Approve
</button>

<button
onClick={()=>handleStatusSelectChange(order.id,"delivered")}
className="bg-red-600 text-white px-2 py-1 rounded text-xs"
>
Reject
</button>

</div>
) : (
<select
value={order.orderStatus || order.status}
onChange={(e)=>handleStatusSelectChange(order.id,e.target.value)}
className="bg-gray-700 text-white text-xs px-2 py-1 rounded border border-gray-600"
>
<option value="pending">Pending</option>
<option value="processing">Processing</option>
<option value="shipped">Shipped</option>
<option value="delivered">Delivered</option>
<option value="cancelled">Cancelled</option>
<option value="return_requested">Return Requested</option>
<option value="returned">Returned</option>
</select>
)}
                      
                      <div className="flex gap-2">
                        <button 
                          onClick={() => handleView(order)}
                          className="flex-1 bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded text-sm font-medium transition-colors flex items-center justify-center space-x-2"
                        >
                          <Eye size={16} />
                          <span>View</span>
                        </button>
                        <button 
                          onClick={() => handleEdit(order)}
                          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded text-sm font-medium transition-colors flex items-center justify-center space-x-2"
                        >
                          <Edit size={16} />
                          <span>Edit</span>
                        </button>
                        <button 
                          onClick={() => handleDelete(order.id, order.customerId)}
                          className="flex-1 bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded text-sm font-medium transition-colors flex items-center justify-center space-x-2"
                        >
                          <Trash2 size={16} />
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>

      {/* Modals remain the same as in your original code */}
      {/* Order Form Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl p-6 w-full max-w-md mx-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-white">
                {editingOrder ? 'Edit Order' : 'Add New Order'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-gray-700 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              {/* Form fields remain the same as your original */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Customer Name
                </label>
                <input
                  type="text"
                  disabled={!!editingOrder}
                  value={formData.customerName}
                  onChange={(e) => setFormData({...formData, customerName: e.target.value})}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Customer Email
                </label>
                <input
                  type="email"
                  disabled={!!editingOrder}
                  value={formData.customerEmail}
                  onChange={(e) => setFormData({...formData, customerEmail: e.target.value})}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Customer Phone
                </label>
                <input
                  type="tel"
                  disabled={!!editingOrder}
                  value={formData.customerPhone}
                  onChange={(e) => setFormData({...formData, customerPhone: e.target.value})}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Amount
                </label>
                <input
                  type="number"
                  disabled={!!editingOrder}
                  value={formData.amount}
                  onChange={(e) => setFormData({...formData, amount: parseFloat(e.target.value) || 0})}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  required
                  min="0"
                  step="0.01"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Order Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({...formData, status: e.target.value})}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  >
                    <option value="pending">Pending</option>
                    <option value="processing">Processing</option>
                    <option value="shipped">Shipped</option>
                    <option value="delivered">Delivered</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Payment Status
                  </label>
                  <select
                    value={formData.paymentStatus}
                    onChange={(e) => setFormData({...formData, paymentStatus: e.target.value})}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  >
                    <option value="pending">Pending</option>
                    <option value="paid">Paid</option>
                    <option value="failed">Failed</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Items (JSON format)
                </label>
                <textarea
                  value={formData.items}
                  disabled={!!editingOrder}
                  onChange={(e) => setFormData({...formData, items: e.target.value})}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  rows="4"
                  placeholder='[{"name": "Product Name", "quantity": 1, "price": 100}]'
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Saving...' : editingOrder ? 'Update' : 'Add'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

           {/* View Order Modal */}
      {showViewModal && viewingOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-white">
                Order Details - #{viewingOrder.id}
              </h3>
              <button
                onClick={() => setShowViewModal(false)}
                className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-gray-700 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div className="space-y-6">
              {/* Customer Information */}
              <div className="bg-gray-750 rounded-lg p-4">
                <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <User size={20} />
                  Customer Information
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-gray-400">Name</label>
                    <p className="text-white font-medium">{viewingOrder.customerName || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-400">Email</label>
                    <p className="text-white font-medium">{viewingOrder.customerEmail || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-400">Phone</label>
                    <p className="text-white font-medium">{viewingOrder.customerPhone || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-400">Customer ID</label>
                    <p className="text-white font-medium">{viewingOrder.customerId || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Order Information */}
              <div className="bg-gray-750 rounded-lg p-4">
                <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <CreditCard size={20} />
                  Order Information
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="text-sm text-gray-400">Total Amount</label>
                    <p className="text-white font-medium text-lg">
                      {formatCurrency(calculateOrderTotal(viewingOrder))}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-400">Order Status</label>
                    <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(viewingOrder.status)} text-white`}>
                      {viewingOrder.status}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm text-gray-400">Payment Status</label>
                    <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPaymentStatusColor(viewingOrder.paymentStatus)} text-white`}>
                      {viewingOrder.paymentStatus}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm text-gray-400">Payment Method</label>
                    <p className="text-white font-medium">{viewingOrder.paymentMethod || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Order Items */}
              <div className="bg-gray-750 rounded-lg p-4">
                <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Package size={20} />
                  Order Items
                </h4>
                {(() => {
                  const items = viewingOrder.items || viewingOrder.products || [];
                  if (items.length === 0) {
                    return <p className="text-gray-400 text-center py-4">No items found</p>;
                  }

                  return (
                    <div className="space-y-3">
                      {items.map((item, index) => (
                        <div key={index} className="flex justify-between items-center p-3 bg-gray-700 rounded-lg">
                          <div className="flex-1">
                            <p className="text-white font-medium">
                              {item.name || item.productName || `Item ${index + 1}`}
                            </p>
                            <div className="text-sm text-gray-400 mt-1">
                              SKU: {getSKUFromItem(item) || 'N/A'} | 
                              Qty: {item.quantity || item.qty || 1} | 
                              Price: {formatCurrency(item.price || item.sellingPrice || 0)}
                            </div>
                            {item.size && (
                              <div className="text-xs text-gray-400">Size: {item.size}</div>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="text-white font-semibold">
                              {formatCurrency((item.price || item.sellingPrice || 0) * (item.quantity || item.qty || 1))}
                            </p>
                          </div>
                        </div>
                      ))}
                      <div className="border-t border-gray-600 pt-3 mt-3">
                        <div className="flex justify-between items-center text-lg font-semibold">
                          <span className="text-white">Total</span>
                          <span className="text-blue-400">
                            {formatCurrency(calculateOrderTotal(viewingOrder))}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Shipping Information */}
              {viewingOrder.shippingAddress && (
                <div className="bg-gray-750 rounded-lg p-4">
                  <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Package size={20} />
                    Shipping Information
                  </h4>
                  <div className="bg-gray-700 rounded-lg p-3">
                    <p className="text-white whitespace-pre-wrap">{viewingOrder.shippingAddress}</p>
                  </div>
                </div>
              )}

              {/* Order Timeline */}
              <div className="bg-gray-750 rounded-lg p-4">
                <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Calendar size={20} />
                    Order Timeline
                </h4>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Order Created</span>
                    <span className="text-white">{formatDate(viewingOrder.createdAt)}</span>
                  </div>
                  {viewingOrder.updatedAt && viewingOrder.updatedAt !== viewingOrder.createdAt && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Last Updated</span>
                      <span className="text-white">{formatDate(viewingOrder.updatedAt)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowViewModal(false);
                    handleEdit(viewingOrder);
                  }}
                  className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center gap-2"
                >
                  <Edit size={18} />
                  Edit Order
                </button>
                <button
                  onClick={() => setShowViewModal(false)}
                  className="flex-1 px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Orders;