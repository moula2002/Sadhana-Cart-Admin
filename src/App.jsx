import React, { useState, useEffect, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { auth } from "./firebase/config";

import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './components/ForgotPass';
import RefundRequests from './pages/RefundRequests';

// Lazy loaded pages
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Category = lazy(() => import('./pages/Category'));
const SubCategory = lazy(() => import('./pages/SubCategory'));
const SubUnderCategory = lazy(() => import('./pages/SubUnderCategory'));
const Brands = lazy(() => import('./pages/Brands'));
const VariantType = lazy(() => import('./pages/VariantType'));
const Variants = lazy(() => import('./pages/Variants'));
const Orders = lazy(() => import('./pages/Orders'));
const Sellers = lazy(() => import('./pages/Sellers'));
const Customers = lazy(() => import('./pages/Customers'));
const Coupons = lazy(() => import('./pages/Coupons'));
const Posters = lazy(() => import('./pages/Posters'));
const Profile = lazy(() => import('./pages/Profile'));
const RazorpayOffer = lazy(() => import('./pages/RazorpayOffer'));
const JsonUploadPage = lazy(() => import('./pages/JsonUploadPage'));
const PythonAutomation = lazy(() => import('./pages/PythonAutomation'));
const CommissionManagement = lazy(() => import('./pages/CommissionManagement'));
const FeaturedProducts = lazy(() => import('./pages/FeaturedProducts'));
const RecommendedProducts = lazy(() => import('./pages/Recomented'));
const Notifications = lazy(() => import('./pages/Notifications'));

const App = () => {

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    const token = localStorage.getItem("authToken");
    return !!token;
  });

  const [isLoading, setIsLoading] = useState(true);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  const closeSidebar = () => setIsSidebarOpen(false);

  useEffect(() => {
    const token = localStorage.getItem("authToken");

    if (token) {
      setIsAuthenticated(true);
    } else {
      setIsAuthenticated(false);
    }

    setIsLoading(false);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>

        <Route
          path="/login"
          element={
            isAuthenticated
              ? <Navigate to="/" replace />
              : <Login setIsAuthenticated={setIsAuthenticated} />
          }
        />

        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />

        <Route
          path="/*"
          element={
            isAuthenticated ? (
              <div className="flex bg-gray-900 min-h-screen">

                <Sidebar isOpen={isSidebarOpen} onClose={closeSidebar} />

                <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">

                  <Header
                    onToggleSidebar={toggleSidebar}
                    setIsAuthenticated={setIsAuthenticated}
                  />

                  <main className="flex-1 overflow-auto bg-gray-900">

                    <Suspense
                      fallback={
                        <div className="text-white text-center mt-10">
                          Loading Page...
                        </div>
                      }
                    >

                      <Routes>
                        <Route path="/" element={<Dashboard />} />
                        <Route path="/category" element={<Category />} />
                        <Route path="/sub-category" element={<SubCategory />} />
                        <Route path="/sub-under-category" element={<SubUnderCategory />} />
                        <Route path="/brands" element={<Brands />} />
                        <Route path="/variant-type" element={<VariantType />} />
                        <Route path="/variants" element={<Variants />} />
                        <Route path="/orders" element={<Orders />} />
                        <Route path="/sellers" element={<Sellers />} />
                        <Route path="/commission" element={<CommissionManagement />} />
                        <Route path="/customers" element={<Customers />} />
                        <Route path="/coupons" element={<Coupons />} />
                        <Route path="/posters" element={<Posters />} />
                        <Route path="/json-upload" element={<JsonUploadPage />} />
                        <Route path="/python-automation" element={<PythonAutomation />} />
                        <Route path="/profile" element={<Profile />} />
                        <Route path="/featured" element={<FeaturedProducts />} />
                        <Route path="/recommended" element={<RecommendedProducts />} />
                        <Route path="/notifications" element={<Notifications />} />
                        <Route path="/refund-request" element={<RefundRequests/>}/>
                        <Route path="/razorpay-offer" element={<RazorpayOffer />} /> {/* NEW ROUTE ADDED */}
                      </Routes>

                    </Suspense>

                  </main>

                </div>
              </div>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

      </Routes>
    </Router>
  );
};

export default App;