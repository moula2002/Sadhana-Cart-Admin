import React, { useState, useEffect } from 'react';
import { ChevronDown, User, LogOut, UserCircle, Menu, ShoppingBag, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Header = ({ onToggleSidebar, setIsAuthenticated }) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [userData, setUserData] = useState({ name: 'Support Admin', email: 'support@sadhanacart.com' });
  const navigate = useNavigate();

  useEffect(() => {
    const storedUserData = localStorage.getItem('userData');
    if (storedUserData) {
      const parsedData = JSON.parse(storedUserData);
      setUserData({
        name: parsedData.name || 'Support Admin',
        email: parsedData.email || 'support@sadhanacart.com'
      });
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    setIsAuthenticated(false);
    navigate('/login');
  };

  return (
    <header className="bg-gray-800/80 backdrop-blur-lg border-b border-gray-700 px-6 py-4 sticky top-0 z-40">
      <div className="flex items-center justify-between">
        {/* Left Section - Menu Button & Title */}
        <div className="flex items-center space-x-4">
          <button 
            onClick={onToggleSidebar}
            className="lg:hidden p-2 rounded-lg hover:bg-gray-700 transition-colors"
          >
            <Menu size={20} />
          </button>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl flex items-center justify-center">
              <ShoppingBag size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                SadhanaCart
              </h1>
              <p className="text-gray-400 text-sm">Admin Dashboard</p>
            </div>
          </div>
        </div>

        {/* Right Section - User Profile Dropdown */}
        <div className="flex items-center space-x-4">
          {/* User Profile Dropdown */}
          <div className="relative">
            <button 
              className="flex items-center space-x-3 bg-gray-700/50 hover:bg-gray-700 px-3 py-2 rounded-xl transition-all duration-300 border border-gray-600 hover:border-gray-500"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            >
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center shadow-lg">
                <User size={16} className="text-white" />
              </div>
              <div className="hidden sm:block text-left">
                <div className="text-white font-medium text-sm">{userData.name}</div>
                <div className="text-gray-400 text-xs">{userData.email}</div>
              </div>
              <ChevronDown 
                size={16} 
                className={`text-gray-400 transition-transform duration-300 ${
                  isDropdownOpen ? 'rotate-180' : ''
                } hidden sm:block`} 
              />
            </button>

            {/* Dropdown Menu */}
            {isDropdownOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-gray-800 rounded-xl shadow-2xl border border-gray-700 z-50 animate-in fade-in slide-in-from-top-5">
                {/* User Info */}
                <div className="p-4 border-b border-gray-700">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                      <User size={20} className="text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-semibold truncate">{userData.name}</p>
                      <p className="text-gray-400 text-sm truncate">{userData.email}</p>
                    </div>
                  </div>
                </div>

                {/* Menu Items */}
                <div className="p-2">
                  <button 
                    onClick={() => {
                      navigate('/profile');
                      setIsDropdownOpen(false);
                    }}
                    className="w-full flex items-center space-x-3 px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white rounded-lg transition-colors"
                  >
                    <UserCircle size={18} />
                    <span>My Profile</span>
                  </button>
                  
                  <button 
                    onClick={() => {
                      navigate('/settings');
                      setIsDropdownOpen(false);
                    }}
                    className="w-full flex items-center space-x-3 px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white rounded-lg transition-colors"
                  >
                    <Settings size={18} />
                    <span>Settings</span>
                  </button>

                  <button 
                    onClick={() => {
                      navigate('/orders');
                      setIsDropdownOpen(false);
                    }}
                    className="w-full flex items-center space-x-3 px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white rounded-lg transition-colors"
                  >
                    <ShoppingBag size={18} />
                    <span>Order Management</span>
                  </button>

                  {/* Logout */}
                  <div className="border-t border-gray-700 mt-2 pt-2">
                    <button 
                      onClick={handleLogout}
                      className="w-full flex items-center space-x-3 px-3 py-2 text-sm text-red-400 hover:bg-red-500/20 hover:text-red-300 rounded-lg transition-colors"
                    >
                      <LogOut size={18} />
                      <span>Logout</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
