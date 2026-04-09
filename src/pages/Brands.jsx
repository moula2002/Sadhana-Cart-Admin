import React, { useState, useEffect, useMemo } from 'react';
import { Plus, RefreshCw, X, Edit, Trash2, Search } from 'lucide-react';
import { brandService, subCategoryService } from '../firebase/services';

const Brands = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [brands, setBrands] = useState([]);
  const [customBrand, setCustomBrand] = useState("");
  const [subCategories, setSubCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBrand, setSelectedBrand] = useState(null);
  // NEW STATE: For handling search input
  const [searchTerm, setSearchTerm] = useState(''); 
  
  const [formData, setFormData] = useState({
    name: '',
    subCategory: ''
  });

  // Fetch data from Firebase on component mount
  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      const [brandsData, subCategoriesData] = await Promise.all([
        brandService.getAll(),
        subCategoryService.getAll()
      ]);
      setBrands(brandsData);
      setSubCategories(subCategoriesData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.name.trim() && formData.subCategory.trim()) {
      try {
        setLoading(true);
        
        const dataToSubmit = {
            name: formData.name,
            subCategory: formData.subCategory
        };

        if (selectedBrand) {
          // Update existing brand
          // Note: Assuming brandService.update updates and returns the full updated object or we update the state manually.
          await brandService.update(selectedBrand.id, dataToSubmit);
          
          // Manually update the state to reflect changes without a full refetch
          setBrands(prev => prev.map(brand => 
            brand.id === selectedBrand.id ? { ...brand, ...dataToSubmit } : brand
          ));
        } else {
          // Add new brand
          const newBrand = await brandService.add(dataToSubmit); // Assume add returns object with id
          setBrands(prev => [newBrand, ...prev]);
        }
        
        setFormData({ name: '', subCategory: '' });
        setSelectedBrand(null);
        setIsModalOpen(false);
      } catch (error) {
        console.error('Error saving brand:', error);
        alert('Error saving brand. Please try again.');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleCancel = () => {
    setFormData({ name: '', subCategory: '' });
    setSelectedBrand(null);
    setIsModalOpen(false);
  };

  const handleEdit = (brand) => {
    setSelectedBrand(brand);
    setFormData({
      name: brand.name,
      subCategory: brand.subCategory
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this brand?')) {
      try {
        setLoading(true);
        await brandService.delete(id);
        setBrands(prev => prev.filter(brand => brand.id !== id));
      } catch (error) {
        console.error('Error deleting brand:', error);
        alert('Error deleting brand. Please try again.');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleRefresh = () => {
    fetchAllData();
  };
  
  // --- SEARCH AND FILTERING LOGIC ---
  const filteredBrands = useMemo(() => {
    const lowerCaseSearchTerm = searchTerm.toLowerCase().trim();
    if (!lowerCaseSearchTerm) {
      return brands;
    }

    return brands.filter(brand => 
      // Filter by Brand Name
      (brand.name || '').toLowerCase().includes(lowerCaseSearchTerm) ||
      // Filter by Sub Category Name
      (brand.subCategory || '').toLowerCase().includes(lowerCaseSearchTerm)
    );
  }, [brands, searchTerm]);
  // ---------------------------------

  return (
    <div className="p-4 lg:p-6 bg-gray-900 h-full min-h-screen">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
        <h2 className="text-2xl font-semibold text-white">Brands Management</h2>
        <div className="flex items-center space-x-3 w-full md:w-auto">
          <button 
            onClick={() => {
              setSelectedBrand(null);
              setFormData({ name: '', subCategory: '' });
              setIsModalOpen(true);
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors text-sm"
          >
            <Plus size={20} />
            <span>Add Brand</span>
          </button>
          <button 
            onClick={handleRefresh}
            className="bg-gray-700 hover:bg-gray-600 text-white p-2 rounded-lg transition-colors"
          >
            <RefreshCw size={20} />
          </button>
        </div>
      </div>
      
      {/* --- SEARCH BAR --- */}
      <div className="mb-6 flex items-center justify-between p-4 bg-gray-800 rounded-lg">
        <h3 className="text-lg font-medium text-white hidden sm:block">
          My Brands ({filteredBrands.length})
        </h3>
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search by brand or sub category..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>
      {/* ------------------ */}


      {/* Desktop Table View */}
      <div className="hidden lg:block bg-gray-800 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-700">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-300">Brands Name</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-300">Sub Category</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-300">Added Date</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-300" colSpan="2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && brands.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-gray-400">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto"></div>
                    <p className="mt-2">Loading brands...</p>
                  </td>
                </tr>
              ) : filteredBrands.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-gray-400">
                    {searchTerm ? `No brands found matching "${searchTerm}"` : 'No brands available'}
                  </td>
                </tr>
              ) : (
                filteredBrands.map((brand) => (
                  <tr key={brand.id} className="border-t border-gray-700 hover:bg-gray-700">
                    <td className="px-6 py-4 text-white font-medium">{brand.name}</td>
                    <td className="px-6 py-4 text-gray-300">{brand.subCategory}</td>
                    <td className="px-6 py-4 text-gray-300">
                      {brand.createdAt && brand.createdAt.seconds ? new Date(brand.createdAt.seconds * 1000).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="px-6 py-4 w-1">
                      <button 
                        onClick={() => handleEdit(brand)}
                        className="text-blue-400 hover:text-blue-300 p-1"
                        disabled={loading}
                      >
                        <Edit size={16} />
                      </button>
                    </td>
                    <td className="px-6 py-4 w-1">
                      <button 
                        onClick={() => handleDelete(brand.id)}
                        className="text-red-400 hover:text-red-300 p-1"
                        disabled={loading}
                      >
                        <Trash2 size={16} />
                      </button>
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
        {loading && brands.length === 0 ? (
          <div className="bg-gray-800 rounded-lg p-6 text-center text-gray-400">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-2">Loading brands...</p>
          </div>
        ) : filteredBrands.length === 0 ? (
          <div className="bg-gray-800 rounded-lg p-6 text-center text-gray-400">
            {searchTerm ? `No brands found matching "${searchTerm}"` : 'No brands available'}
          </div>
        ) : (
          filteredBrands.map((brand) => (
            <div key={brand.id} className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <h3 className="text-white font-medium text-lg">{brand.name}</h3>
                  <p className="text-gray-300 text-sm mt-1">Sub Category: **{brand.subCategory}**</p>
                </div>
                <div className="flex space-x-2 ml-4">
                  <button 
                    onClick={() => handleEdit(brand)}
                    className="text-blue-400 hover:text-blue-300 p-2 bg-gray-700 rounded-lg"
                    disabled={loading}
                  >
                    <Edit size={16} />
                  </button>
                  <button 
                    onClick={() => handleDelete(brand.id)}
                    className="text-red-400 hover:text-red-300 p-2 bg-gray-700 rounded-lg"
                    disabled={loading}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              <div className="text-gray-400 text-xs">
                Added: {brand.createdAt && brand.createdAt.seconds ? new Date(brand.createdAt.seconds * 1000).toLocaleDateString() : 'N/A'}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Brand Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-blue-400">{selectedBrand ? 'EDIT BRAND' : 'ADD BRAND'}</h3>
              <button 
                onClick={handleCancel}
                className="text-gray-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit}>
              {/* Sub Category Dropdown */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Select Sub Category *
                </label>
                <select
                  name="subCategory"
                  value={formData.subCategory}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select Sub Category</option>
                  {subCategories.map((subCategory) => (
                    // Assuming the subCategory object contains the name as the value we need to store
                    <option key={subCategory.id} value={subCategory.name}>{subCategory.name}</option> 
                  ))}
                </select>
              </div>
              
              {/* Brand Name */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Brand Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Enter brand name"
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              
              {/* Buttons */}
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-500 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                  disabled={loading}
                >
                  {loading ? (selectedBrand ? 'Updating...' : 'Adding...') : (selectedBrand ? 'Update' : 'Submit')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Brands;