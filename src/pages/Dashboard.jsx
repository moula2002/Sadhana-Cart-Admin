import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Plus, RefreshCw, Package, AlertTriangle, Clock, Truck, CheckCircle, X, Camera, Edit, 
  Trash2, Upload, Search, Eye, DollarSign, Barcode,
  Ruler, Weight, Filter,
  ChevronRight, ShoppingBag, Zap, Star
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { productService, categoryService, subCategoryService, orderService } from '../firebase/services';
import { doc, updateDoc, getFirestore, setDoc, deleteDoc, serverTimestamp, } from 'firebase/firestore';
import AddProduct from '../components/AddProduct';

// Skeleton Loader Component
const SkeletonLoader = () => (
  <div className="w-full">
    <table className="w-full">
      <thead className="bg-gray-800/30">
        <tr>
          <th className="px-6 py-4 text-left">
            <div className="h-4 bg-gray-600 rounded w-24 animate-pulse"></div>
          </th>
          <th className="px-6 py-4 text-left hidden md:table-cell">
            <div className="h-4 bg-gray-600 rounded w-20 animate-pulse"></div>
          </th>
          <th className="px-6 py-4 text-left">
            <div className="h-4 bg-gray-600 rounded w-16 animate-pulse"></div>
          </th>
          <th className="px-6 py-4 text-left hidden sm:table-cell">
            <div className="h-4 bg-gray-600 rounded w-20 animate-pulse"></div>
          </th>
          <th className="px-6 py-4 text-left">
            <div className="h-4 bg-gray-600 rounded w-16 animate-pulse"></div>
          </th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-700/50">
        {Array.from({ length: 8 }).map((_, i) => (
          <tr key={i} className="hover:bg-gray-800/30">
            <td className="px-6 py-4">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gray-600 rounded-lg animate-pulse"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-600 rounded w-3/4 mb-2 animate-pulse"></div>
                  <div className="h-3 bg-gray-600 rounded w-1/2 animate-pulse"></div>
                </div>
              </div>
            </td>
            <td className="px-6 py-4 hidden md:table-cell">
              <div className="h-4 bg-gray-600 rounded w-20 animate-pulse"></div>
            </td>
            <td className="px-6 py-4">
              <div className="h-4 bg-gray-600 rounded w-16 animate-pulse"></div>
            </td>
            <td className="px-6 py-4 hidden sm:table-cell">
              <div className="h-6 bg-gray-600 rounded w-20 animate-pulse"></div>
            </td>
            <td className="px-6 py-4">
              <div className="flex space-x-2">
                <div className="w-8 h-8 bg-gray-600 rounded animate-pulse"></div>
                <div className="w-8 h-8 bg-gray-600 rounded animate-pulse"></div>
                <div className="w-8 h-8 bg-gray-600 rounded animate-pulse"></div>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const safeText = (val) =>
  typeof val === 'object' && val !== null
    ? val.category || val.subcategory || 'N/A'
    : val ?? 'N/A';


const Dashboard = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [lastVisible, setLastVisible] = useState(null); // TRACK FOR PAGINATION
  const [hasMore, setHasMore] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [categories, setCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [viewingProduct, setViewingProduct] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState('all'); // 'all' or 'featured'
  const [totalProductCount, setTotalProductCount] = useState(0);


  const [orderStats, setOrderStats] = useState({
    all: 0,
    pending: 0,
    processing: 0,
    shipped: 0,
    delivered: 0,
    cancelled: 0
  });


const loadMoreProducts = async () => {
  if (!lastVisible || isFetchingMore) return;

  try {
    setIsFetchingMore(true);

    const { products: newProducts, lastDoc } =
      await productService.getPaginated(50, lastVisible);

    if (!newProducts.length) {
      setHasMore(false);
      return;
    }

    setProducts(prev => [...prev, ...newProducts]);
    setLastVisible(lastDoc);

  } catch (error) {
    console.error("Error loading more products:", error);
  } finally {
    setIsFetchingMore(false);
  }
};
  // Optimized data fetching with debouncing
  const fetchAllData = useCallback(async () => {
    try {
      setLoading(true);
      setIsRefreshing(true);

      // Fetch all data with individual error handling
      let productsData = [];
      let categoriesData = [];
      let subCategoriesData = [];
      let ordersData = [];
      try {
  const count = await productService.getTotalCount();
  setTotalProductCount(count);
} catch (err) {
  console.error("Error fetching count:", err);
}
    try {
  let result;

 if (searchTerm) {
  result = await productService.searchProducts(searchTerm);
  productsData = result.products;
} else {
  productsData = await productService.getAll();
}

  productsData = result.products;
  setLastVisible(result.lastDoc || null);

} catch (err) {
  console.error('Error fetching products:', err);
}

      try {
        categoriesData = await categoryService.getAll();
      } catch (err) {
        console.error('Error fetching categories:', err);
      }

      try {
        subCategoriesData = await subCategoryService.getAll();
      } catch (err) {
        console.error('Error fetching subcategories:', err);
      }

      try {
        ordersData = await orderService.getAll();
      } catch (err) {
        console.error('Error fetching orders:', err);
      }

   const productsWithNames = productsData.map(product => {
  const attrs = product.attributes || {};

  // HELPER: Safely extract a string from a potential object (handles the confidence object)
  const getSafeString = (val, fieldName) => {
    if (typeof val === 'object' && val !== null) {
      return val[fieldName] || val.category || val.subcategory || val.name || 'N/A';
    }
    return val || 'N/A';
  };

  return {
    ...product,
    // Ensure ID and Name are solid
    id: product.id || product.productid || 'no-id', 
    name: String(product.name || product.title || product.productName || 'Unknown Product'),

    // Force category to be a string for filtering
    category: getSafeString(product.category, 'category'),
    subCategory: getSafeString(product.subcategory || product.subCategory || attrs.Category2, 'subcategory'),

    // Numeric conversions
    price: Number(product.price ?? attrs.MRP ?? 0),
    offerPrice: Number(product.offerprice ?? product.offerPrice ?? 0),
    stock: Number(product.stock ?? attrs.Stock ?? 0),

    sku: product.basesku || product.sku || 'N/A',
    sellerid: product.sellerId || product.sellerid || 'N/A',
    images: product.images || []
  };
});

// Update stats and state
const stats = {
  all: ordersData.length,
  pending: ordersData.filter(order => order.orderStatus === 'pending').length,
  processing: ordersData.filter(order => order.orderStatus === 'processing').length,
  shipped: ordersData.filter(order => order.orderStatus === 'shipped').length,
  delivered: ordersData.filter(order => order.orderStatus === 'delivered').length,
  cancelled: ordersData.filter(order => order.orderStatus === 'cancelled').length
};

setOrderStats(stats);
setProducts(productsWithNames);
setCategories(categoriesData);
setSubCategories(subCategoriesData);

    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  const toggleRecommended = async (product) => {
  try {
    const db = getFirestore();
    const productRef = doc(db, "products", product.id);

    const newStatus = !product.recommended;

    await updateDoc(productRef, {
      recommended: newStatus,
      updatedAt: serverTimestamp()
    });

    // update UI
    setProducts(prev =>
      prev.map(p =>
        p.id === product.id
          ? { ...p, recommended: newStatus }
          : p
      )
    );

  } catch (error) {
    console.error("Error updating recommended:", error);
  }
};

  // Initial fetch
  useEffect(() => {
    // Safety timeout - if loading takes more than 15 seconds, force it off
    const loadingTimeout = setTimeout(() => {
      setLoading(false);
      setIsRefreshing(false);
    }, 15000);

    fetchAllData();

    return () => clearTimeout(loadingTimeout);
  }, [fetchAllData]);

  // Reset pagination when filters/search change
useEffect(() => {
  setCurrentPage(1);
}, [searchTerm, selectedCategory, selectedStatus]);


  // Memoized filtered products
 const filteredProducts = useMemo(() => {
  let filtered = [...products];

  // 1. Search Filter (Checks Name, Category, and SKU)
  if (searchTerm) {
    const term = searchTerm.toLowerCase().trim();
    filtered = filtered.filter(product =>
      String(product.name).toLowerCase().includes(term) ||
      String(product.category).toLowerCase().includes(term) ||
     String(product.sku || product.basesku).toLowerCase().includes(term)
    );
  }

  // 2. Category Filter (Case-insensitive)
  if (selectedCategory !== 'all') {
    const targetCat = selectedCategory.toLowerCase().trim();
    filtered = filtered.filter(product => 
      String(product.category).toLowerCase().trim() === targetCat
    );
  }

  console.log("Total products loaded:", products.length);

  // 3. Status Filter
  if (selectedStatus !== 'all') {
    switch (selectedStatus) {
      case 'in-stock': filtered = filtered.filter(p => p.stock > 10); break;
      case 'low-stock': filtered = filtered.filter(p => p.stock > 0 && p.stock <= 10); break;
      case 'out-of-stock': filtered = filtered.filter(p => p.stock === 0); break;
    }
  }

  // 4. Sorting
  filtered.sort((a, b) => {
    let aVal = a[sortBy] || '';
    let bVal = b[sortBy] || '';
    if (sortBy === 'price' || sortBy === 'stock') {
      return sortOrder === 'asc' ? Number(aVal) - Number(bVal) : Number(bVal) - Number(aVal);
    }
    return sortOrder === 'asc' 
      ? String(aVal).localeCompare(String(bVal)) 
      : String(bVal).localeCompare(String(aVal));
  });

  return filtered;
}, [products, searchTerm, selectedCategory, selectedStatus, sortBy, sortOrder]);

  // Pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredProducts.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  // Product statistics
  const productStats = useMemo(() => {
    const totalProducts = totalProductCount;
    const outOfStock = products.filter(p => (p.stock || 0) === 0).length;
    const lowStock = products.filter(p => (p.stock || 0) > 0 && (p.stock || 0) <= 10).length;
    const inStock = products.filter(p => (p.stock || 0) > 10).length;

    return [
      {
        title: 'Total Products',
        count: totalProducts,
        icon: Package,
        color: 'from-blue-500 to-cyan-500',
        trend: '+12%',
        iconColor: 'text-blue-400'
      },
      {
        title: 'In Stock',
        count: inStock,
        icon: CheckCircle,
        color: 'from-green-500 to-emerald-500',
        trend: '+5%',
        iconColor: 'text-green-400'
      },
      {
        title: 'Low Stock',
        count: lowStock,
        icon: AlertTriangle,
        color: 'from-yellow-500 to-amber-500',
        trend: lowStock > 0 ? 'Needs Restock' : 'Optimal',
        iconColor: 'text-yellow-400'
      },
      {
        title: 'Out of Stock',
        count: outOfStock,
        icon: Clock,
        color: 'from-red-500 to-rose-500',
        trend: outOfStock > 0 ? 'Attention' : 'All Good',
        iconColor: 'text-red-400'
      }
    ];
  }, [products]);

  // Quick actions
  const quickActions = [
    {
      title: 'Add New Product',
      description: 'Create a new product listing',
      icon: Plus,
      color: 'from-blue-600 to-indigo-600',
      action: () => {
        setSelectedProduct(null);
        setIsModalOpen(true);
      }
    },
    {
      title: 'Bulk Upload',
      description: 'Upload multiple products via CSV/JSON',
      icon: Upload,
      color: 'from-green-600 to-emerald-600',
      action: () => navigate('/json-upload')
    },
    
    {
      title: 'Manage Orders',
      description: 'Process and track customer orders',
      icon: ShoppingBag,
      color: 'from-orange-600 to-red-600',
      action: () => navigate('/orders')
    }
    
  ];

  // Handle actions
  const handleEdit = (product) => {
    setSelectedProduct(product);
    setIsModalOpen(true);
  };

  const handleView = (product) => {
    setViewingProduct(product);
    setIsViewModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        await productService.delete(id);
        setProducts(prev => prev.filter(p => p.id !== id));
      } catch (error) {
        console.error('Error deleting product:', error);
        alert('Failed to delete product');
      }
    }
  };

  const toggleFeatured = async (product) => {
    try {
      const db = getFirestore();
      const productRef = doc(db, 'products', product.id);

      const newFeaturedStatus = !product.isFeatured;

      // Update the product document to reflect featured status
      await updateDoc(productRef, {
        isFeatured: newFeaturedStatus,
        productType: newFeaturedStatus ? 'featured product' : 'regular product',
        updatedAt: new Date()
      });

      // If marking as featured, create/update an entry in the featuredProducts collection
      if (newFeaturedStatus) {
        const featuredDocRef = doc(db, 'featuredProducts', product.id);

        // Prepare featured payload - include summary fields and any featuredProductInfo
        const featuredPayload = {
          productId: product.id,
          name: product.name || '',
          images: product.images || [],
          price: product.price || 0,
          offerPrice: product.offerPrice || null,
          sku: product.sku || null,
          sellerid: product.sellerid || product.sellerId || null,
          featuredProductInfo: product.featuredProductInfo || {
            title: product.name || '',
            description: '',
            displayOrder: null
          },
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };

        await setDoc(featuredDocRef, featuredPayload, { merge: true });
      } else {
        // If unmarking, remove entry from featuredProducts collection
        const featuredDocRef = doc(db, 'featuredProducts', product.id);
        try {
          await deleteDoc(featuredDocRef);
        } catch (err) {
          // If delete fails because doc doesn't exist, ignore
          console.warn('featuredProducts deleteDoc failed (may not exist):', err.message || err);
        }
      }

      // Update local state
      setProducts(prev => prev.map(p =>
        p.id === product.id
          ? {
              ...p,
              isFeatured: newFeaturedStatus,
              productType: newFeaturedStatus ? 'featured product' : 'regular product'
            }
          : p
      ));

      alert(`Product ${newFeaturedStatus ? 'marked as featured' : 'removed from featured'} successfully!`);

      // Navigate to featured products page when newly marked as featured
      if (newFeaturedStatus) {
        navigate('/featured');
      }
    } catch (error) {
      console.error('Error toggling featured status:', error);
      alert('Failed to update featured status');
    }
  };

  const handleProductAdded = (newProduct, action) => {
    if (action === 'added') {
      setProducts(prev => [newProduct, ...prev]);
    } else if (action === 'updated') {
      setProducts(prev => prev.map(p => 
        p.id === newProduct.id ? { ...p, ...newProduct } : p
      ));
    }
    setIsModalOpen(false);
    setSelectedProduct(null);
  };

  // Order stats display
  const orderStatsDisplay = [
    { label: 'All Orders', count: orderStats.all, color: 'text-purple-400', icon: ShoppingBag },
    { label: 'Pending', count: orderStats.pending, color: 'text-yellow-400', icon: Clock },
    { label: 'Processing', count: orderStats.processing, color: 'text-blue-400', icon: RefreshCw },
    { label: 'Shipped', count: orderStats.shipped, color: 'text-indigo-400', icon: Truck },
    { label: 'Delivered', count: orderStats.delivered, color: 'text-green-400', icon: CheckCircle },
    { label: 'Cancelled', count: orderStats.cancelled, color: 'text-red-400', icon: X }
  ];

  // Product Details Modal
  const ProductDetailsModal = ({ product, isOpen, onClose }) => {
    if (!isOpen || !product) return null;

    const stockStatus = (stock) => {
      if (stock === 0) return { text: 'Out of Stock', color: 'bg-red-500/10 text-red-400' };
      if (stock <= 10) return { text: 'Low Stock', color: 'bg-yellow-500/10 text-yellow-400' };
      return { text: 'In Stock', color: 'bg-green-500/10 text-green-400' };
    };

    return (
      <div className="fixed inset-0 bg-black/90 backdrop-blur-xl flex items-center justify-center z-50 p-4">
        <div className="bg-gray-900 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden border border-gray-800 shadow-2xl">
          <div className="flex items-center justify-between p-6 bg-gradient-to-r from-gray-800 to-gray-900">
            <div>
              <h2 className="text-2xl font-bold text-white">Product Details</h2>
              <p className="text-gray-400">{product.name}</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white p-2 rounded-lg hover:bg-gray-800 transition-all"
            >
              <X size={24} />
            </button>
          </div>

          <div className="overflow-y-auto max-h-[calc(90vh-120px)] p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Images */}
              <div className="space-y-6">
                <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Camera className="w-5 h-5" />
                    Product Images
                  </h3>
                  {product.images?.length > 0 ? (
                    <div className="grid grid-cols-2 gap-4">
                      {product.images.map((img, i) => (
                        <img
                          key={i}
                          src={img} loading="lazy"
                          alt={`${product.name} ${i + 1}`}
                          className="w-full h-32 object-cover rounded-lg"
                          onError={(e) => e.target.src = 'https://via.placeholder.com/150'}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Camera className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                      <p className="text-gray-400">No images available</p>
                    </div>
                  )}
                </div>

                {/* Basic Info */}
                <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
                  <h3 className="text-lg font-semibold text-white mb-4">Basic Information</h3>
                  <div className="space-y-3">
                    {[
                      ['Product Name', product.name],
                      ['Brand', product.brand || 'N/A'],
                      ['Category', product.category || 'N/A'],
                      ['Subcategory', product.subCategory || product.subcategory || 'N/A'],

                      ['Description', product.description || 'No description']
                    ].map(([label, value]) => (
                      <div key={label} className="flex justify-between py-2 border-b border-gray-700 last:border-0">
                        <span className="text-gray-400">{label}</span>
                        <span className="text-white text-right max-w-xs">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Details */}
              <div className="space-y-6">
                {/* Pricing */}
                <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <DollarSign className="w-5 h-5" />
                    Pricing & Stock
                  </h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Price</span>
                      <span className="text-2xl font-bold text-white">₹{product.price}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Stock</span>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${stockStatus(product.stock).color}`}>
                        {product.stock} units • {stockStatus(product.stock).text}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Specifications */}
                <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
                  <h3 className="text-lg font-semibold text-white mb-4">Specifications</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      ['Height', product.height, <Ruler key="height" className="w-4 h-4" />],
                      ['Width', product.width, <Ruler key="width" className="w-4 h-4" />],
                      ['Length', product.length, <Ruler key="length" className="w-4 h-4" />],
                      ['Weight', product.weight, <Weight key="weight" className="w-4 h-4" />]
                    ].map(([label, value, icon]) => (
                      <div key={label} className="bg-gray-700/50 rounded-lg p-3 flex items-center gap-3">
                        <div className="text-blue-400">{icon}</div>
                        <div>
                          <p className="text-xs text-gray-400">{label}</p>
                          <p className="text-white font-medium">{value || 'N/A'}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Product ID */}
                <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Barcode className="w-5 h-5" />
                    Product Identification
                  </h3>
                  <div className="space-y-3">
                    {[
                      ['SKU', product.sku],
                      ['HSN Code', product.hsncode],
                      ['Seller ID', product.sellerid],
                      ['Product ID', product.id]
                    ].map(([label, value]) => (
                      <div key={label} className="flex justify-between py-2 border-b border-gray-700 last:border-0">
                        <span className="text-gray-400">{label}</span>
                        <span className="text-white font-mono">{value || 'N/A'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 p-6 border-t border-gray-800">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors"
            >
              Close
            </button>
            <button
              onClick={() => {
                onClose();
                handleEdit(product);
              }}
              className="px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg transition-all flex items-center gap-2"
            >
              <Edit className="w-4 h-4" />
              Edit Product
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
   <div className="w-full h-auto bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Header */}
      <div className="bg-gray-800/30 backdrop-blur-lg border-b border-gray-700/50 px-6 py-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">
              Dashboard <span className="text-blue-400">Overview</span>
            </h1>
            <p className="text-gray-400 mt-1">Manage your products, inventory, and orders</p>
          </div>
          
         
        </div>
      </div>

      <div className="p-6">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {productStats.map((stat, index) => (
            <div key={index} className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50 hover:border-gray-600 transition-all duration-300 hover:scale-[1.02]">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-xl bg-gradient-to-br ${stat.color}/20`}>
                  <stat.icon className={`w-6 h-6 ${stat.iconColor}`} />
                </div>
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                  stat.trend.includes('+') ? 'bg-green-500/20 text-green-400' :
                  stat.trend.includes('Needs') ? 'bg-yellow-500/20 text-yellow-400' :
                  'bg-blue-500/20 text-blue-400'
                }`}>
                  {stat.trend}
                </span>
              </div>
              <h3 className="text-gray-300 text-sm font-medium mb-2">{stat.title}</h3>
              <p className="text-3xl font-bold text-white mb-2">{stat.count}</p>
              <div className="h-1 w-full bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className={`h-full bg-gradient-to-r ${stat.color} rounded-full`}
                  style={{ width: `${Math.min(100, (stat.count / Math.max(...productStats.map(s => s.count))) * 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {quickActions.map((action, index) => {
            const Icon = action.icon;
            return (
              <button
                key={index}
                onClick={action.action}
                className="group bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm border border-gray-700/50 hover:border-gray-600 rounded-xl p-6 text-left transition-all duration-300 hover:scale-[1.02] hover:shadow-xl"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-3 rounded-xl bg-gradient-to-br ${action.color}/20 group-hover:scale-110 transition-transform`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-white group-hover:translate-x-1 transition-all" />
                </div>
                <h3 className="font-semibold text-white mb-2">{action.title}</h3>
                <p className="text-gray-400 text-sm">{action.description}</p>
              </button>
            );
          })}
        </div>

        {/* Main Content */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Products Table */}
          <div className="flex-1">
            <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm rounded-2xl border border-gray-700/50 overflow-hidden">
              <div className="p-6 border-b border-gray-700/50">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-semibold text-white">Products</h2>
                    <p className="text-gray-400 text-sm">
                      {totalProductCount} products • Page {currentPage} of {totalPages}
                    </p>
                  </div>
                  
                  
                  <div className="flex flex-wrap gap-3">
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="px-4 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    >
                      <option value="all">All Categories</option>
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.name}>{cat.name}</option>
                      ))}
                    </select>

                    <select
                      value={selectedStatus}
                      onChange={(e) => setSelectedStatus(e.target.value)}
                      className="px-4 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    >
                      <option value="all">All Status</option>
                      <option value="in-stock">In Stock</option>
                      <option value="low-stock">Low Stock</option>
                      <option value="out-of-stock">Out of Stock</option>
                    </select>

                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="px-4 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    >
                      <option value="name">Sort by Name</option>
                      <option value="price">Sort by Price</option>
                      <option value="stock">Sort by Stock</option>
                    </select>

                    <button
                      onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                      className="px-4 py-2 bg-gray-800/50 hover:bg-gray-700 border border-gray-700 rounded-lg text-white transition-colors flex items-center gap-2"
                    >
                      <Filter className="w-4 h-4" />
                      {sortOrder === 'asc' ? 'A-Z' : 'Z-A'}
                    </button>
                  </div>
                   <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-64"
              />
            </div>
            
            <button
              onClick={fetchAllData}
              disabled={isRefreshing}
              className="p-2 bg-gray-800/50 hover:bg-gray-700 text-white rounded-lg transition-colors disabled:opacity-50"
              title="Refresh"
            >
              <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                {loading ? (
                  <div className="p-6">
                    <SkeletonLoader />
                  </div>
                ) : currentItems.length > 0 ? (
                  <table className="w-full">
                    <thead className="bg-gray-800/30">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                          Product
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider hidden md:table-cell">
                          Category
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                          Price
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider hidden sm:table-cell">
                          Stock
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                          Featured
                        </th>
                        <th  className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
  Recommended
</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700/50">
                      {currentItems.map((product) => (
                        <tr key={product.id} className="hover:bg-gray-800/30 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center space-x-4">
                              <div className="relative">
                                {product.images?.[0] ? (
                                  <img
                                    src={product.images[0]}
                                    alt={product.name}
                                    className="w-12 h-12 object-cover rounded-lg"
                                   onError={(e) => {
  e.target.style.display = 'none';

  const fallback = e.target.nextElementSibling;
  if (fallback) {
    fallback.style.display = 'flex';
  }
}}

                                  />
                                ) : null}
                                <div className="w-12 h-12 bg-gradient-to-br from-gray-700 to-gray-800 rounded-lg flex items-center justify-center">
                                  <Package className="w-5 h-5 text-gray-400" />
                                </div>
                              </div>
                              <div>
                                <div className="text-white font-medium line-clamp-1">{product.name}</div>
                                <div className="text-gray-400 text-sm line-clamp-1">
                                  {product.brand && `${product.brand} • `}
                                  {product.sellerid}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-gray-300 hidden md:table-cell">
                            <div className="text-sm">
  {product.category || 'N/A'}
</div>
<div className="text-xs text-gray-400">
 {product.subCategory || product.subcategory || 'N/A'}

</div>

                          </td>
                         <td className="px-6 py-4">
  {product.offerPrice > 0 && product.offerPrice < product.price ? (
    <>
      <div className="text-gray-400 line-through text-sm">
        ₹{product.price}
      </div>
      <div className="text-green-400 font-semibold text-lg">
        ₹{product.offerPrice}
      </div>
    </>
  ) : (
    <div className="text-white font-semibold">
      ₹{product.price}
    </div>
  )}
</td>

                          <td className="px-6 py-4 hidden sm:table-cell">
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                              product.stock === 0 
                                ? 'bg-red-500/10 text-red-400'
                                : product.stock <= 10
                                ? 'bg-yellow-500/10 text-yellow-400'
                                : 'bg-green-500/10 text-green-400'
                            }`}>
                              {product.stock} units
                            </span>
                          </td>

                          {/* Featured Column */}
                          <td className="px-6 py-4">
                            <button
                              onClick={() => toggleFeatured(product)}
                              className={`p-2 rounded-lg transition-all duration-200 ${
                                product.isFeatured
                                  ? 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30'
                                  : 'bg-gray-700/50 text-gray-400 hover:bg-gray-600'
                              }`}
                              title={product.isFeatured ? 'Remove from Featured' : 'Mark as Featured'}
                            >
                              <Star
                                className={`w-4 h-4 ${product.isFeatured ? 'fill-current' : ''}`}
                              />
                            </button>
                            {product.isFeatured && (
                              <span className="ml-2 inline-block text-xs bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded">
                                Featured
                              </span>
                            )}
                          </td>

                          <td className="px-6 py-4">
  <button
    onClick={() => toggleRecommended(product)}
    className={`p-2 rounded-lg transition ${
      product.recommended
        ? "bg-purple-500/20 text-purple-400"
        : "bg-gray-700 text-gray-400 hover:text-purple-400"
    }`}
  >
    <Zap
      size={18}
      fill={product.recommended ? "currentColor" : "none"}
    />
  </button>
</td>

                          <td className="px-6 py-4">
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => handleView(product)}
                                className="p-2 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded-lg transition-colors"
                                title="View"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleEdit(product)}
                                className="p-2 text-green-400 hover:text-green-300 hover:bg-green-500/10 rounded-lg transition-colors"
                                title="Edit"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(product.id)}
                                className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="text-center py-12">
                    <Package className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-white mb-2">No products found</h3>
                    <p className="text-gray-400 mb-6">
                      {searchTerm || selectedCategory !== 'all' || selectedStatus !== 'all'
                        ? 'Try adjusting your filters'
                        : 'Add your first product to get started'
                      }
                    </p>
                    {(searchTerm || selectedCategory !== 'all' || selectedStatus !== 'all') && (
                      <button
                        onClick={() => {
                          setSearchTerm('');
                          setSelectedCategory('all');
                          setSelectedStatus('all');
                        }}
                        className="px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg transition-all"
                      >
                        Clear Filters
                      </button>
                    )}
                  </div>
                )}
              </div>

              {totalPages > 1 && (
                <div className="px-6 py-4 border-t border-gray-700/50">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-400">
                      Showing {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, filteredProducts.length)} of {filteredProducts.length}
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => paginate(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="px-4 py-2 bg-gray-800/50 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                      >
                        Previous
                      </button>
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        const page = i + 1;
                        return (
                          <button
                            key={page}
                            onClick={() => paginate(page)}
                            className={`w-10 h-10 rounded-lg transition-colors ${
                              currentPage === page
                                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white'
                                : 'bg-gray-800/50 hover:bg-gray-700 text-white'
                            }`}
                          >
                            {page}
                          </button>
                        );
                      })}
        <button
  onClick={async () => {
    if (currentPage === totalPages && hasMore) {
      await loadMoreProducts();
    }
    paginate(currentPage + 1);
  }}
  disabled={currentPage === totalPages && !hasMore}
  className="px-4 py-2 bg-gray-800/50 hover:bg-gray-700 disabled:opacity-50 text-white rounded-lg"
>
  Next
</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

         
        </div>
      </div>

      {/* Modals */}
      <AddProduct
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedProduct(null);
        }}
        onProductAdded={handleProductAdded}
        categories={categories}
        subCategories={subCategories}
        products={products}
        editingProduct={selectedProduct}
      />

      <ProductDetailsModal
        product={viewingProduct}
        isOpen={isViewModalOpen}
        onClose={() => {
          setIsViewModalOpen(false);
          setViewingProduct(null);
        }}
      />
    </div>
  );
};

export default Dashboard;