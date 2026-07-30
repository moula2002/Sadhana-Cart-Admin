import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  FolderOpen,
  Layers,
  Tag,
  ShoppingCart,
  Ticket,
  Image,
  User,
  Users,
  UserCheck,
  Upload,
  X,
  Code,
  Wallet,
  Zap,
  Star,
  RotateCcw,
  Bell,
  MessageSquare,
  Sun,
  Moon
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const Sidebar = ({ isOpen, onClose }) => {
  const { theme, toggleTheme } = useTheme();
  const menuItems = [
    { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/featured', icon: Star, label: 'New Arrivals' },
    { path: '/best-arrivals', icon: Zap, label: 'Flash Deals' },
    { path: '/recommended', icon: Zap, label: 'Recommended' },
    { path: '/notifications', icon: Bell, label: 'Notifications' },
    { path: '/category', icon: FolderOpen, label: 'Category' },
    { path: '/sub-category', icon: Layers, label: 'Sub Category' },
    { path: '/brands', icon: Tag, label: 'Brands' },
    { path: '/orders', icon: ShoppingCart, label: 'Orders' },
    { path: '/refund-request', icon: RotateCcw, label: 'Refund Requests' }, 
    { path: '/sellers', icon: Users, label: 'Seller' },
    { path: '/customers', icon: UserCheck, label: 'Customers' },
    { path: '/coupons', icon: Ticket, label: 'Coupons' },

    // 🔥 NEW ITEM ADDED HERE
    { path: '/ratings-reviews', icon: Star, label: 'Ratings & Reviews' },

    { path: '/razorpay-offer', icon: Wallet, label: 'Razorpay Offer' },
    { path: '/sticky-header', icon: MessageSquare, label: 'Sticky Header Ads' },
    { path: '/popups', icon: Image, label: 'Popups' },
    { path: '/posters', icon: Image, label: 'Posters' },
    { path: '/json-upload', icon: Upload, label: 'JSON Upload' },
    { path: '/python-automation', icon: Code, label: 'Python Automation' },
    { path: '/profile', icon: User, label: 'Profile' },
  ];

  return (
    <>
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}
      
      <div className={`w-64 bg-white dark:bg-gray-900 text-gray-800 dark:text-white h-full fixed left-0 top-0 overflow-y-auto z-50 transform transition-transform duration-300 ease-in-out ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      } lg:translate-x-0 flex flex-col`}>
        
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <img 
                src="/sadhanacutlogo.png" 
                alt="Sadhana Logo" 
                className="h-10 w-auto rounded"
              />
              <span className="text-xl font-semibold">Sadhana cart</span>
            </div>

            <button 
              onClick={onClose}
              className="lg:hidden p-1 rounded-md hover:bg-gray-100 dark:hover:bg-white dark:bg-gray-800 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <nav className="flex-1 mt-6 overflow-y-auto">
          <ul className="space-y-1 px-3">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.path}>
                  <NavLink
                    to={item.path}
                    onClick={() => window.innerWidth < 1024 && onClose()}
                    className={({ isActive }) =>
                      `flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-colors duration-200 ${
                        isActive
                          ? 'bg-blue-600 text-gray-900 dark:text-white'
                          : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white dark:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-900 dark:text-white'
                      }`
                    }
                  >
                    <Icon size={20} />
                    <span className="font-medium">{item.label}</span>
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Theme Toggle Button */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 shrink-0">
          <button
            onClick={toggleTheme}
            className="flex items-center justify-center w-full space-x-2 px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors duration-200"
          >
            {theme === 'dark' ? (
              <>
                <Sun size={20} />
                <span className="font-medium">Light Mode</span>
              </>
            ) : (
              <>
                <Moon size={20} />
                <span className="font-medium">Dark Mode</span>
              </>
            )}
          </button>
        </div>
      </div>
    </>
  );
};

export default Sidebar;