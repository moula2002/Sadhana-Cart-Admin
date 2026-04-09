import React, { useState, useEffect, useMemo } from 'react';
import { collection, getDocs, doc, updateDoc, query, where, getDoc, getCountFromServer, orderBy, limit, startAfter } from 'firebase/firestore';
import { db } from '../firebase/config';
import { userService } from '../firebase/services';
import { 
  Users, Mail, Phone, MapPin, Calendar, ShoppingBag, X, Search, 
  MessageCircle, Smartphone, User, Shield, Send, MessageSquare,
  CheckCircle, AlertCircle
} from 'lucide-react';

const Customers = () => {
  const [customers, setCustomers] = useState([]);  
  const [loading, setLoading] = useState(true);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [phoneNumbers, setPhoneNumbers] = useState({});
  const [selectedChannel, setSelectedChannel] = useState('');
  const [sending, setSending] = useState(false);
  const [lastVisible, setLastVisible] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [itemsPerPage] = useState(20);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async (isLoadMore = false) => {
    try {
      if (isLoadMore) {
        setIsFetchingMore(true);
      } else {
        setLoading(true);
      }

      // Fetch stats only on initial load
      if (!isLoadMore) {
        const stats = await userService.getStats();
        setTotalCount(stats.total);
      }

      // Fetch paginated users
      const { users: usersData, lastDoc } = await userService.getPaginated(itemsPerPage, isLoadMore ? lastVisible : null);
      
      const newCustomers = usersData.map(userData => ({
        id: userData.id,
        name: userData.displayName || userData.name || userData.email?.split('@')[0] || 'Unknown Customer',
        email: userData.email || '',
        phone: userData.phoneNumber || userData.phone || userData.contactNo || '',
        address: userData.address || '',
        status: userData.status || 'active',
        createdAt: userData.createdAt || userData.joinedDate || null,
        totalOrders: userData.totalOrders || 0,
        ...userData
      }));

      setLastVisible(lastDoc);
      setHasMore(usersData.length === itemsPerPage);

      if (isLoadMore) {
        setCustomers(prev => [...prev, ...newCustomers]);
      } else {
        setCustomers(newCustomers);
      }

      // Fetch order counts for these new users efficiently
      await fetchOrderCounts(newCustomers);

    } catch (error) {
      console.error('Error fetching customers:', error);
    } finally {
      setLoading(false);
      setIsFetchingMore(false);
    }
  };

  const fetchOrderCounts = async (customersList) => {
    try {
      const countsProm = customersList.map(async (customer) => {
        try {
          const userOrdersCollection = collection(db, 'users', customer.id, 'orders');
          const snap = await getCountFromServer(userOrdersCollection);
          return { id: customer.id, count: snap.data().count };
        } catch (e) {
          return { id: customer.id, count: 0 };
        }
      });

      const results = await Promise.all(countsProm);
      
      setCustomers(prev => prev.map(c => {
        const result = results.find(r => r.id === c.id);
        if (result) {
          return { ...c, totalOrders: result.count };
        }
        return c;
      }));
    } catch (error) {
      console.error("Error fetching counts:", error);
    }
  };

  // Function to fetch a specific user by ID
  const fetchUserById = async (userId) => {
    try {
      const userDocRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        
        // Also fetch orders for this specific user
        let totalOrders = 0;
        try {
          const userOrdersCollection = collection(db, 'users', userId, 'orders');
          const ordersSnapshot = await getDocs(userOrdersCollection);
          totalOrders = ordersSnapshot.size;
        } catch (error) {
          console.error(`Error fetching orders for user ${userId}:`, error);
        }
        
        return {
          id: userDoc.id,
          name: userData.displayName || userData.name || userData.email?.split('@')[0] || 'Unknown Customer',
          email: userData.email || '',
          phone: userData.phoneNumber || userData.phone || userData.contactNo || '',
          address: userData.address || '',
          status: userData.status || 'active',
          createdAt: userData.createdAt || userData.joinedDate || null,
          totalOrders: totalOrders || userData.totalOrders || 0,
          ...userData
        };
      }
      return null;
    } catch (error) {
      console.error('Error fetching user by ID:', error);
      return null;
    }
  };

  // If you want to fetch a specific customer by ID
  const handleFetchSpecificCustomer = async (customerId) => {
    const customer = await fetchUserById(customerId);
    if (customer) {
      setSelectedCustomer(customer);
      setShowModal(true);
    } else {
      alert('Customer not found');
    }
  };

  const handleBlockCustomer = async (customerId) => {
    try {
      const customerRef = doc(db, 'users', customerId);
      await updateDoc(customerRef, {
        status: 'blocked'
      });
      
      setCustomers(customers.map(customer => 
        customer.id === customerId 
          ? { ...customer, status: 'blocked' }
          : customer
      ));
      
      alert('Customer blocked successfully!');
    } catch (error) {
      console.error('Error blocking customer:', error);
      alert('Error blocking customer');
    }
  };

  const handleViewCustomer = (customer) => {
    setSelectedCustomer(customer);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedCustomer(null);
  };

  const handleMessageCustomer = (customer) => {
    setSelectedCustomer(customer);
    setMessageText(`Hello ${customer.name || 'there'}! We have an update regarding your order.`);
    setShowMessageModal(true);
  };

  const closeMessageModal = () => {
    setShowMessageModal(false);
    setSelectedCustomer(null);
    setMessageText('');
  };

  const handleSendConfirmation = (channel) => {
    setSelectedChannel(channel);
    setShowConfirmationModal(true);
  };

  const closeConfirmationModal = () => {
    setShowConfirmationModal(false);
    setSelectedChannel('');
    setSending(false);
  };

  const handleSendMessage = async () => {
    if (!selectedCustomer || !selectedChannel) return;

    setSending(true);

    try {
      let success = false;
      
      if (selectedChannel === 'whatsapp') {
        success = sendWhatsAppMessage();
      } else if (selectedChannel === 'email') {
        success = sendEmailMessage();
      } else if (selectedChannel === 'gmail') { // NEW: Handle Gmail channel
        success = sendGmailMessage();
      }

      if (success) {
        // Show success message briefly
        setTimeout(() => {
          setSending(false);
          closeConfirmationModal();
          closeMessageModal();
        }, 1500);
      } else {
        throw new Error('Failed to send message');
      }

    } catch (error) {
      console.error('Error sending message:', error);
      setSending(false);
      alert('Failed to send message. Please try again.');
    }
  };

  const sendWhatsAppMessage = () => {
    try {
      const phone = selectedCustomer.phone || phoneNumbers[selectedCustomer.id];
      if (!phone) {
        alert('No phone number available for this customer');
        return false;
      }

      const cleanedPhone = phone.replace(/\D/g, '');
      const message = encodeURIComponent(messageText);
      const whatsappUrl = `https://wa.me/${cleanedPhone}?text=${message}`;
      
      // Open WhatsApp in new tab
      window.open(whatsappUrl, '_blank');
      return true;
    } catch (error) {
      console.error('Error opening WhatsApp:', error);
      return false;
    }
  };
  
  // NEW: Function to send message via Gmail direct link
  const sendGmailMessage = () => {
    try {
      if (!selectedCustomer.email) {
        alert('No email address available for this customer');
        return false;
      }

      const subject = encodeURIComponent('Message from Store');
      const body = encodeURIComponent(messageText);
      const to = encodeURIComponent(selectedCustomer.email);
      
      // Gmail mailto link format for a new window/tab
      const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${to}&su=${subject}&body=${body}`;
      
      // Open Gmail in new tab
      window.open(gmailUrl, '_blank');
      
      return true;
    } catch (error) {
      console.error('Error opening Gmail:', error);
      return false;
    }
  };

  const sendEmailMessage = () => {
    try {
      if (!selectedCustomer.email) {
        alert('No email address available for this customer');
        return false;
      }

      const subject = encodeURIComponent('Message from Store');
      const body = encodeURIComponent(messageText);
      
      // Create a mailto link that will open the default email client (app or web)
      const mailtoUrl = `mailto:${selectedCustomer.email}?subject=${subject}&body=${body}`;
      
      // Create a temporary anchor element to trigger the email client
      const emailLink = document.createElement('a');
      emailLink.href = mailtoUrl;
      emailLink.style.display = 'none';
      document.body.appendChild(emailLink);
      emailLink.click();
      document.body.removeChild(emailLink);
      
      return true;
    } catch (error) {
      console.error('Error opening email client:', error);
      
      // Fallback: Try window.location
      try {
        const subject = encodeURIComponent('Message from Store');
        const body = encodeURIComponent(messageText);
        const mailtoUrl = `mailto:${selectedCustomer.email}?subject=${subject}&body=${body}`;
        window.location.href = mailtoUrl;
        return true;
      } catch (fallbackError) {
        console.error('Fallback email method also failed:', fallbackError);
        return false;
      }
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'blocked': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'inactive': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active': return <div className="w-2 h-2 bg-green-400 rounded-full"></div>;
      case 'blocked': return <div className="w-2 h-2 bg-red-400 rounded-full"></div>;
      case 'inactive': return <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>;
      default: return <div className="w-2 h-2 bg-gray-400 rounded-full"></div>;
    }
  };

  // Enhanced search functionality with safe string conversion
  const filteredCustomers = useMemo(() => {
    if (!searchTerm.trim()) {
      return customers;
    }
    
    const lowerCaseSearchTerm = searchTerm.toLowerCase().trim();
    
    return customers.filter(customer => {
      // Safely convert all searchable fields to lowercase strings
      const searchableFields = [
        customer.name ? customer.name.toLowerCase() : '',
        customer.email ? customer.email.toLowerCase() : '',
        customer.phone ? customer.phone.toString().toLowerCase() : '',
        customer.address ? customer.address.toLowerCase() : '',
        customer.status ? customer.status.toLowerCase() : '',
        customer.id ? customer.id.toLowerCase() : ''
      ];
      
      return searchableFields.some(field => field.includes(lowerCaseSearchTerm));
    });
  }, [customers, searchTerm]);

  // Clear search function
  const clearSearch = () => {
    setSearchTerm('');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 min-h-screen">
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white bg-gradient-to-r from-green-400 to-blue-400 bg-clip-text text-transparent">
            Customer Management
          </h1>
          <p className="text-gray-400 mt-1">Manage and communicate with your customers</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="bg-gradient-to-r from-green-500/20 to-blue-500/20 border border-green-500/30 rounded-xl px-4 py-2">
            <span className="text-white font-semibold text-sm md:text-base">
              Total: {totalCount || customers.length} Customers
              {searchTerm && filteredCustomers.length !== customers.length && (
                <span className="text-green-300 ml-1">
                  ({filteredCustomers.length} filtered)
                </span>
              )}
            </span>
          </div>
          
          {/* Button to fetch specific customer - for testing */}
            {/* <button
              onClick={() => handleFetchSpecificCustomer('Enr6Vm4xptfgs4iclINWHtTkOvf2')}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
            >
              Test Fetch User
            </button> */}
        </div>
      </div>

      {/* Enhanced Search Bar */}
      <div className="bg-gray-800/50 backdrop-blur-lg rounded-xl p-4 mb-6 border border-gray-700">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search customers by name, email, phone, address, status, or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-gray-700/50 text-white border border-gray-600 rounded-lg py-3 pl-12 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-150 placeholder-gray-400"
          />
          {searchTerm && (
            <button
              onClick={clearSearch}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        
        {/* Search Results Info */}
        {searchTerm && (
          <div className="mt-3 p-3 bg-blue-900/20 border border-blue-500/30 rounded-lg">
            <p className="text-blue-300 text-sm">
              Showing {filteredCustomers.length} result{filteredCustomers.length !== 1 ? 's' : ''} for "{searchTerm}"
              <button 
                onClick={clearSearch}
                className="ml-2 text-blue-400 hover:text-blue-300 underline transition-colors"
              >
                Clear search
              </button>
            </p>
          </div>
        )}
      </div>

      {/* Desktop Table View */}
      <div className="hidden lg:block bg-gray-800/50 backdrop-blur-lg rounded-xl border border-gray-700 overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-700/50">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300 uppercase tracking-wider">
                  Contact Information
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300 uppercase tracking-wider">
                  Orders
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700/50">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center">
                    <Users className="mx-auto h-16 w-16 text-gray-500 mb-4" />
                    <p className="text-lg font-medium text-gray-300 mb-2">
                      {searchTerm ? `No customers found for "${searchTerm}"` : 'No customers found'}
                    </p>
                    <p className="text-gray-400">
                      {searchTerm ? 'Try adjusting your search terms' : 'Start by adding your first customer'}
                    </p>
                    {searchTerm && (
                      <button
                        onClick={clearSearch}
                        className="mt-3 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                      >
                        Clear Search
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-gray-700/30 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="relative">
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-blue-500 flex items-center justify-center shadow-lg">
                            <User className="h-6 w-6 text-white" />
                          </div>
                          <div className="absolute -bottom-1 -right-1">
                            {getStatusIcon(customer.status)}
                          </div>
                        </div>
                        <div>
                          <div className="text-white font-semibold group-hover:text-blue-300 transition-colors">
                            {customer.name || 'Unknown Customer'}
                          </div>
                          <div className="text-gray-400 text-sm font-mono">
                            ID: {customer.id.substring(0, 8)}...
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-2">
                        <div className="flex items-center text-sm text-gray-300">
                          <Mail className="h-4 w-4 mr-3 text-blue-400" />
                          <span className="break-all">{customer.email || 'No email'}</span>
                        </div>
                        <div className="flex items-center text-sm text-gray-300">
                          <Smartphone className="h-4 w-4 mr-3 text-green-400" />
                          <span className={customer.phone ? 'text-white font-medium' : 'text-gray-500'}>
                            {customer.phone || 'No phone'}
                          </span>
                        </div>
                        {customer.address && (
                          <div className="flex items-center text-sm text-gray-300">
                            <MapPin className="h-4 w-4 mr-3 text-purple-400" />
                            <span className="truncate max-w-xs">{customer.address}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(customer.status)}`}>
                        {getStatusIcon(customer.status)}
                        <span className="ml-2 capitalize">{customer.status || 'active'}</span>
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center text-white font-semibold">
                        <ShoppingBag className="h-4 w-4 mr-2 text-yellow-400" />
                        {customer.totalOrders || 0}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => handleViewCustomer(customer)}
                          className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-lg"
                          title="View Details"
                        >
                          <User size={16} />
                        </button>
                        <button 
                          onClick={() => handleMessageCustomer(customer)}
                          className="p-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors shadow-lg"
                          title="Send Message"
                        >
                          <MessageSquare size={16} />
                        </button>
                        <button 
                          onClick={() => handleBlockCustomer(customer.id)}
                          className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors shadow-lg"
                          title="Block Customer"
                        >
                          <Shield size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="lg:hidden space-y-4">
        {filteredCustomers.length === 0 ? (
          <div className="bg-gray-800/50 backdrop-blur-lg rounded-xl p-8 text-center border border-gray-700">
            <Users className="mx-auto h-16 w-16 text-gray-500 mb-4" />
            <p className="text-lg font-medium text-gray-300 mb-2">
              {searchTerm ? `No customers found for "${searchTerm}"` : 'No customers found'}
            </p>
            <p className="text-gray-400">
              {searchTerm ? 'Try adjusting your search terms' : 'Start by adding your first customer'}
            </p>
            {searchTerm && (
              <button
                onClick={clearSearch}
                className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
              >
                Clear Search
              </button>
            )}
          </div>
        ) : (
          filteredCustomers.map((customer) => (
            <div key={customer.id} className="bg-gray-800/50 backdrop-blur-lg rounded-xl p-6 border border-gray-700 hover:border-gray-600 transition-all duration-300 shadow-lg">
              {/* Customer Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-blue-500 flex items-center justify-center shadow-lg">
                      <User className="h-6 w-6 text-white" />
                    </div>
                    <div className="absolute -bottom-1 -right-1">
                      {getStatusIcon(customer.status)}
                    </div>
                  </div>
                  <div>
                    <div className="text-white font-semibold">{customer.name || 'Unknown Customer'}</div>
                    <div className="text-gray-400 text-xs font-mono">ID: {customer.id.substring(0, 8)}...</div>
                  </div>
                </div>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(customer.status)}`}>
                  {getStatusIcon(customer.status)}
                  <span className="ml-2 capitalize">{customer.status || 'active'}</span>
                </span>
              </div>

              {/* Customer Details */}
              <div className="space-y-3 mb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center text-sm text-gray-300">
                    <Mail className="h-4 w-4 mr-2 text-blue-400" />
                    Email
                  </div>
                  <span className="text-white text-sm break-all text-right">{customer.email || 'No email'}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center text-sm text-gray-300">
                    <Smartphone className="h-4 w-4 mr-2 text-green-400" />
                    Phone
                  </div>
                  <span className={customer.phone ? 'text-white text-sm font-medium' : 'text-gray-500 text-sm'}>
                    {customer.phone || 'No phone'}
                  </span>
                </div>

                {customer.address && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center text-sm text-gray-300">
                      <MapPin className="h-4 w-4 mr-2 text-purple-400" />
                      Address
                    </div>
                    <span className="text-white text-sm text-right break-words max-w-xs">{customer.address}</span>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div className="flex items-center text-sm text-gray-300">
                    <ShoppingBag className="h-4 w-4 mr-2 text-yellow-400" />
                    Orders
                  </div>
                  <span className="text-white font-semibold">{customer.totalOrders || 0}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-4 border-t border-gray-700">
                <button 
                  onClick={() => handleViewCustomer(customer)}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 shadow-lg"
                >
                  <User size={16} />
                  View
                </button>
                <button 
                  onClick={() => handleMessageCustomer(customer)}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 shadow-lg"
                >
                  <MessageSquare size={16} />
                  Message
                </button>
                <button 
                  onClick={() => handleBlockCustomer(customer.id)}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 shadow-lg"
                >
                  <Shield size={16} />
                  Block
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Load More Button */}
      {hasMore && (
        <div className="mt-8 flex justify-center">
          <button
            onClick={() => fetchCustomers(true)}
            disabled={isFetchingMore}
            className="flex items-center gap-2 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white px-8 py-3 rounded-xl font-semibold shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 mb-10"
          >
            {isFetchingMore ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Loading More...
              </>
            ) : (
              <>
                <Users className="h-5 w-5" />
                Load More Customers
              </>
            )}
          </button>
        </div>
      )}

      {/* Enhanced View Detail Modal */}
      {showModal && selectedCustomer && (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-700 shadow-2xl">
            <div className="flex justify-between items-center p-6 border-b border-gray-700">
              <h2 className="text-2xl font-bold text-white bg-gradient-to-r from-green-400 to-blue-400 bg-clip-text text-transparent">
                Customer Details
              </h2>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-gray-700 rounded-xl"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="bg-gray-700/50 rounded-xl p-4 border border-gray-600">
                    <label className="block text-sm font-medium text-gray-300 mb-2">Personal Information</label>
                    <div className="space-y-3">
                      <div>
                        <span className="text-gray-400 text-sm">Name:</span>
                        <p className="text-white font-medium">{selectedCustomer.name || 'N/A'}</p>
                      </div>
                      <div>
                        <span className="text-gray-400 text-sm">Status:</span>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ml-2 ${getStatusColor(selectedCustomer.status)}`}>
                          {selectedCustomer.status || 'active'}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-gray-700/50 rounded-xl p-4 border border-gray-600">
                    <label className="block text-sm font-medium text-gray-300 mb-2">Contact Details</label>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400 text-sm">Email:</span>
                        <span className="text-white text-sm break-all">{selectedCustomer.email || 'N/A'}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400 text-sm">Phone:</span>
                        <span className="text-white font-medium">{selectedCustomer.phone || 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="bg-gray-700/50 rounded-xl p-4 border border-gray-600">
                    <label className="block text-sm font-medium text-gray-300 mb-2">Account Information</label>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400 text-sm">Total Orders:</span>
                        <span className="text-white font-semibold">{selectedCustomer.totalOrders || 0}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-gray-700/50 rounded-xl p-4 border border-gray-600">
                    <label className="block text-sm font-medium text-gray-300 mb-2">Customer ID</label>
                    <p className="text-white font-mono text-sm bg-gray-600 p-2 rounded-lg break-all">
                      {selectedCustomer.id}
                    </p>
                  </div>
                </div>
              </div>
              
              {selectedCustomer.address && (
                <div className="mt-6 bg-gray-700/50 rounded-xl p-4 border border-gray-600">
                  <label className="block text-sm font-medium text-gray-300 mb-2">Address</label>
                  <p className="text-white">{selectedCustomer.address}</p>
                </div>
              )}
              
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => handleMessageCustomer(selectedCustomer)}
                  className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-6 py-3 rounded-xl transition-all duration-200 font-semibold shadow-lg flex items-center gap-2"
                >
                  <MessageSquare size={18} />
                  Send Message
                </button>
                <button
                  onClick={() => {
                    handleBlockCustomer(selectedCustomer.id);
                    closeModal();
                  }}
                  className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-6 py-3 rounded-xl transition-all duration-200 font-semibold shadow-lg"
                >
                  Block Customer
                </button>
                <button
                  onClick={closeModal}
                  className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-xl transition-colors font-semibold"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Message Modal with Preview */}
      {showMessageModal && selectedCustomer && (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-2xl max-w-md w-full border border-gray-700 shadow-2xl">
            <div className="flex justify-between items-center p-6 border-b border-gray-700">
              <h2 className="text-xl font-bold text-white">Send Message</h2>
              <button
                onClick={closeMessageModal}
                className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-gray-700 rounded-xl"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6">
              <div className="mb-6 bg-gray-700/50 rounded-xl p-4 border border-gray-600">
                <label className="block text-sm font-medium text-gray-300 mb-2">Customer</label>
                <p className="text-white font-semibold">{selectedCustomer.name || selectedCustomer.email}</p>
                <div className="flex items-center gap-4 mt-2 text-sm text-gray-400">
                  {selectedCustomer.phone && (
                    <span className="flex items-center gap-1">
                      <Smartphone size={14} />
                      {selectedCustomer.phone}
                    </span>
                  )}
                  {selectedCustomer.email && (
                    <span className="flex items-center gap-1">
                      <Mail size={14} />
                      {selectedCustomer.email}
                    </span>
                  )}
                </div>
              </div>
              
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-300 mb-3">Message Content</label>
                <textarea
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  className="w-full bg-gray-700 text-white p-4 rounded-xl border border-gray-600 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none"
                  rows="4"
                  placeholder="Type your message here..."
                />
              </div>
              
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-300 mb-3">Send Via</label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    onClick={() => handleSendConfirmation('whatsapp')}
                    disabled={!selectedCustomer.phone}
                    className={`flex items-center justify-center gap-2 p-3 rounded-xl font-semibold transition-all duration-200 ${
                      selectedCustomer.phone 
                        ? 'bg-green-600 hover:bg-green-700 text-white shadow-lg hover:shadow-xl' 
                        : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    <MessageCircle size={18} />
                    WhatsApp
                  </button>
                  <button
                    onClick={() => handleSendConfirmation('gmail')}
                    disabled={!selectedCustomer.email}
                    className={`flex items-center justify-center gap-2 p-3 rounded-xl font-semibold transition-all duration-200 ${
                      selectedCustomer.email 
                        ? 'bg-red-600 hover:bg-red-700 text-white shadow-lg hover:shadow-xl' 
                        : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    <Mail size={18} />
                    Gmail
                  </button>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={closeMessageModal}
                  className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-xl transition-colors font-semibold"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmationModal && selectedCustomer && (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-2xl max-w-md w-full border border-gray-700 shadow-2xl">
            <div className="flex justify-between items-center p-6 border-b border-gray-700">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                {sending ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Sending...
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-5 w-5 text-yellow-400" />
                    Confirm Send
                  </>
                )}
              </h2>
              {!sending && (
                <button
                  onClick={closeConfirmationModal}
                  className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-gray-700 rounded-xl"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>
            <div className="p-6">
              {!sending ? (
                <>
                  <div className="mb-6">
                    <p className="text-gray-300 mb-4">
                      Are you sure you want to send this message via{' '}
                      <span className="font-semibold text-white">
                        {selectedChannel === 'whatsapp' ? 'WhatsApp' : selectedChannel === 'gmail' ? 'Gmail' : 'Email (Mailto)'}
                      </span>?
                    </p>
                    <div className="bg-gray-700/50 rounded-xl p-4 border border-gray-600">
                      <label className="block text-sm font-medium text-gray-300 mb-2">Message Preview</label>
                      <p className="text-white text-sm whitespace-pre-wrap">{messageText}</p>
                    </div>
                  </div>
                  
                  <div className="flex justify-end space-x-3">
                    <button
                      onClick={closeConfirmationModal}
                      className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-xl transition-colors font-semibold"
                      disabled={sending}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSendMessage}
                      className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-6 py-3 rounded-xl transition-all duration-200 font-semibold shadow-lg flex items-center gap-2"
                      disabled={sending}
                    >
                      <Send size={18} />
                      Send Message
                    </button>
                  </div>
                </>
              ) : (
                <div className="text-center py-8">
                  <CheckCircle className="h-16 w-16 text-green-400 mx-auto mb-4" />
                  <p className="text-white font-semibold">Message sent successfully!</p>
                  <p className="text-gray-400 text-sm mt-2">Redirecting you back...</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Customers;