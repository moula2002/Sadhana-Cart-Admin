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
  Bell
} from 'lucide-react';

const Sidebar = ({ isOpen, onClose }) => {
  const menuItems = [
    { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/featured', icon: Star, label: 'Featured' },
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
      
      <div className={`w-64 bg-gray-900 text-white h-full fixed left-0 top-0 overflow-y-auto z-50 transform transition-transform duration-300 ease-in-out ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      } lg:translate-x-0`}>
        
        <div className="p-6 border-b border-gray-700">
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
              className="lg:hidden p-1 rounded-md hover:bg-gray-800 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <nav className="mt-6">
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
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-300 hover:bg-gray-800 hover:text-white'
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
      </div>
    </>
  );
};

export default Sidebar;