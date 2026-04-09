import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, User, Lock, ShoppingBag } from 'lucide-react';
import { adminService } from '../firebase/services';
import { fixExistingAdmins } from '../utils/adminFixer';
import { fcmUtils } from '../utils/fcmUtils';

const Login = ({ setIsAuthenticated }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [isFixing, setIsFixing] = useState(false);
  const [fixResult, setFixResult] = useState(null);
  const navigate = useNavigate();

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }
    
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    
    return newErrors;
  };

  const handleFixAdmins = async () => {
    setIsFixing(true);
    setFixResult(null);
    
    try {
      const result = await fixExistingAdmins();
      setFixResult(result);
      
      if (result.fixed > 0) {
        alert(`Fixed ${result.fixed} admin accounts. Default password is: ${result.defaultPassword}\n\nFixed admins: ${result.fixedEmails.join(', ')}\n\nPlease login with the default password and change it immediately.`);
      } else {
        alert('All admin accounts are already properly configured.');
      }
    } catch (error) {
      console.error('Error fixing admins:', error);
      alert('Error fixing admin accounts. Please check console for details.');
    } finally {
      setIsFixing(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = validateForm();
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Check if admin exists in Firebase with this email
      const admin = await adminService.getByEmail(formData.email);
      
      if (!admin) {
        setErrors({ general: 'Invalid email or password' });
        setIsLoading(false);
        return;
      }
      
      // Check if password matches
      if (admin.password !== formData.password) {
        setErrors({ general: 'Invalid email or password' });
        setIsLoading(false);
        return;
      }
      
      // Check if admin is active
      if (admin.status !== 'active') {
        setErrors({ general: 'Account is not active. Please contact administrator.' });
        setIsLoading(false);
        return;
      }
      
      // Update FCM token for logged in admin (force generate new token)
      try {
        if (fcmUtils.isSupported()) {
          console.log('🔄 Force generating new FCM token for login...');
          const fcmResult = await fcmUtils.forceGenerateNewToken();
          if (fcmResult.success) {
            await adminService.updateFCMToken(admin.id, fcmResult.token);
            console.log('✅ New FCM token generated and updated for logged in admin:', fcmResult.token);
          } else {
            console.log('⚠️ Force generation failed, trying current token...');
            // Fallback to current token if force generation fails
            const currentTokenResult = await fcmUtils.getCurrentToken();
            if (currentTokenResult.success) {
              await adminService.updateFCMToken(admin.id, currentTokenResult.token);
              console.log('✅ Current FCM token updated for logged in admin');
            }
          }
        }
      } catch (fcmError) {
        console.error('⚠️ Error updating FCM token on login:', fcmError);
        // Don't block login if FCM token update fails
      }

      // Store authentication data
      localStorage.setItem('authToken', `firebase-token-${admin.id}`);
      localStorage.setItem('userData', JSON.stringify({
        id: admin.id,
        name: admin.fullName,
        email: admin.email,
        role: admin.role,
        adminId: admin.adminId
      }));
      
      // Update authentication state
      setIsAuthenticated(true);
      
      // Navigate to dashboard
      navigate('/');
      
    } catch (error) {
      console.error('Login error:', error);
      setErrors({ general: 'Login failed. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full space-y-8">
        {/* Logo and Title */}
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center">
              <ShoppingBag size={32} className="text-white" />
            </div>
          </div>
          <h2 className="text-3xl font-bold text-white mb-2">Admin Login</h2>
          <p className="text-gray-400">Sign in to your admin account</p>
        </div>

        {/* Login Form */}
        <div className="bg-gray-800 rounded-lg shadow-xl p-8 border border-gray-700">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* General Error */}
            {errors.general && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                <p className="text-red-400 text-sm">{errors.general}</p>
              </div>
            )}

            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className={`w-full pl-10 pr-4 py-3 bg-gray-700 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-gray-400 ${
                    errors.email ? 'border-red-500' : 'border-gray-600'
                  }`}
                  placeholder="Enter your email"
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-sm text-red-400">{errors.email}</p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={handleInputChange}
                  className={`w-full pl-10 pr-12 py-3 bg-gray-700 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-gray-400 ${
                    errors.password ? 'border-red-500' : 'border-gray-600'
                  }`}
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-300" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400 hover:text-gray-300" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-sm text-red-400">{errors.password}</p>
              )}
            </div>

            {/* Remember Me and Forgot Password */}
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-600 bg-gray-700 rounded"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-300">
                  Remember me
                </label>
              </div>

              {/* FIXED Forgot Password Link (uses navigate, no page reload) */}
              <div className="text-sm">
                <span
                  onClick={() => navigate('/forgot-password')}
                  className="text-blue-400 hover:text-blue-300 cursor-pointer"
                >
                  Forgot password?
                </span>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Signing in...
                </div>
              ) : (
                'Sign in'
              )}
            </button>

            {/* Optional: Fix Admins area (if you want a visible button, uncomment below) */}
            {/* 
            <div className="mt-4">
              <button
                type="button"
                onClick={handleFixAdmins}
                disabled={isFixing}
                className="w-full py-2 px-4 rounded-lg bg-yellow-600 text-white hover:bg-yellow-700"
              >
                {isFixing ? 'Fixing...' : 'Fix Admin Accounts'}
              </button>
            </div>
            */}

          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
