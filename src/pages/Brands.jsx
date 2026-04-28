import React, { useState, useEffect, useMemo } from 'react';
import { Plus, RefreshCw, X, Edit, Trash2, Search, Image as ImageIcon, Upload } from 'lucide-react';
import { brandService, subCategoryService, categoryService } from '../firebase/services';

const Brands = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [brands, setBrands] = useState([]);
  const [customBrand, setCustomBrand] = useState("");
  const [subCategories, setSubCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBrand, setSelectedBrand] = useState(null);
  // NEW STATE: For handling search input
  const [searchTerm, setSearchTerm] = useState(''); 
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [bannerImageFile, setBannerImageFile] = useState(null);
  const [bannerImagePreview, setBannerImagePreview] = useState(null);
  
  const [formData, setFormData] = useState({
    name: '',
    subCategories: [], // Array for multiple subcategories
    description: '',
    image: '',
    bannerImage: ''
  });

  // Fetch data from Firebase on component mount
  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      const [brandsData, subCategoriesData, categoriesData] = await Promise.all([
        brandService.getAll(),
        subCategoryService.getAll(),
        categoryService.getAll()
      ]);
      setBrands(brandsData);
      setSubCategories(subCategoriesData);
      setCategories(categoriesData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, files } = e.target;
    
    if (name === 'image' && files && files[0]) {
      const file = files[0];
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    } else if (name === 'bannerImage' && files && files[0]) {
      const file = files[0];
      setBannerImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setBannerImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    } else if (name === 'subCategories') {
      // Toggle subcategory selection
      const currentSubCategories = [...formData.subCategories];
      const index = currentSubCategories.indexOf(value);
      if (index > -1) {
        currentSubCategories.splice(index, 1);
      } else {
        currentSubCategories.push(value);
      }
      setFormData(prev => ({
        ...prev,
        subCategories: currentSubCategories
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.name.trim() && formData.subCategories.length > 0) {
      try {
        setLoading(true);
        
        const dataToSubmit = {
            name: formData.name,
            subCategories: formData.subCategories,
            description: formData.description
        };

        if (selectedBrand) {
          // Update existing brand
          const updatedBrand = await brandService.update(selectedBrand.id, dataToSubmit, imageFile, bannerImageFile);
          
          // Manually update the state to reflect changes
          setBrands(prev => prev.map(brand => 
            brand.id === selectedBrand.id ? { ...brand, ...updatedBrand } : brand
          ));
        } else {
          // Add new brand
          const newBrand = await brandService.add(dataToSubmit, imageFile, bannerImageFile);
          setBrands(prev => [newBrand, ...prev]);
        }
        
        setFormData({ name: '', subCategories: [], description: '', image: '', bannerImage: '' });
        setImageFile(null);
        setImagePreview(null);
        setBannerImageFile(null);
        setBannerImagePreview(null);
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
    setFormData({ name: '', subCategories: [], description: '', image: '', bannerImage: '' });
    setImageFile(null);
    setImagePreview(null);
    setBannerImageFile(null);
    setBannerImagePreview(null);
    setSelectedBrand(null);
    setIsModalOpen(false);
  };

  const handleEdit = (brand) => {
    setSelectedBrand(brand);
    setFormData({
      name: brand.name,
      subCategories: brand.subCategories || (brand.subCategory ? [brand.subCategory] : []),
      description: brand.description || '',
      image: brand.image || '',
      bannerImage: brand.bannerImage || ''
    });
    setImagePreview(brand.image || null);
    setBannerImagePreview(brand.bannerImage || null);
    // Find category for the first subcategory if available
    if (brand.subCategories && brand.subCategories.length > 0) {
      const firstSub = subCategories.find(s => s.name === brand.subCategories[0]);
      if (firstSub) setSelectedCategory(firstSub.category);
    }
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
      // Filter by Sub Categories
      (brand.subCategories || []).some(sub => sub.toLowerCase().includes(lowerCaseSearchTerm)) ||
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
              setFormData({ name: '', subCategories: [], description: '', image: '', bannerImage: '' });
              setImageFile(null);
              setImagePreview(null);
              setBannerImageFile(null);
              setBannerImagePreview(null);
              setSelectedCategory("");
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
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-300">Logo</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-300">Banner</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-300">Brands Name</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-300">Sub Categories</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-300">Description</th>
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
                    <td className="px-6 py-4">
                      {brand.image ? (
                        <img src={brand.image} alt={brand.name} className="h-10 w-10 rounded-lg object-cover bg-gray-700" />
                      ) : (
                        <div className="h-10 w-10 rounded-lg bg-gray-700 flex items-center justify-center">
                          <ImageIcon size={20} className="text-gray-500" />
                        </div>
                      )}
                    </td>
                     <td className="px-6 py-4">
                      {brand.bannerImage ? (
                        <img src={brand.bannerImage} alt="Banner" className="h-10 w-20 rounded-lg object-cover bg-gray-700" />
                      ) : (
                        <div className="h-10 w-20 rounded-lg bg-gray-700 flex items-center justify-center">
                          <ImageIcon size={20} className="text-gray-500" />
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-white font-medium">{brand.name}</td>
                    <td className="px-6 py-4 text-gray-300">
                      <div className="flex flex-wrap gap-1">
                        {brand.subCategories ? brand.subCategories.map((sub, i) => (
                          <span key={i} className="px-2 py-1 bg-gray-700 rounded text-xs">{sub}</span>
                        )) : brand.subCategory && (
                          <span className="px-2 py-1 bg-gray-700 rounded text-xs">{brand.subCategory}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-400 text-sm max-w-xs truncate">
                      {brand.description || 'No description'}
                    </td>
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
              <div className="flex items-center space-x-4 mb-4">
                {brand.image ? (
                  <img src={brand.image} alt={brand.name} className="h-16 w-16 rounded-lg object-cover bg-gray-700 shrink-0" />
                ) : (
                  <div className="h-16 w-16 rounded-lg bg-gray-700 flex items-center justify-center shrink-0">
                    <ImageIcon size={30} className="text-gray-500" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="text-white font-medium text-lg truncate">{brand.name}</h3>
                  <p className="text-gray-300 text-sm mt-1 truncate">Sub Category: **{brand.subCategory}**</p>
                  {brand.description && (
                    <p className="text-gray-400 text-xs mt-1 line-clamp-2">{brand.description}</p>
                  )}
                </div>
              </div>
              <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-700">
                <div className="text-gray-400 text-xs">
                  Added: {brand.createdAt && brand.createdAt.seconds ? new Date(brand.createdAt.seconds * 1000).toLocaleDateString() : 'N/A'}
                </div>
                <div className="flex space-x-2">
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
              {/* Image Upload */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Brand Image
                </label>
                <div className="flex items-center space-x-4">
                  <div className="relative h-24 w-24 rounded-lg bg-gray-700 overflow-hidden flex items-center justify-center border-2 border-dashed border-gray-600">
                    {imagePreview ? (
                      <img src={imagePreview} alt="Preview" className="h-full w-full object-cover" />
                    ) : (
                      <ImageIcon size={32} className="text-gray-500" />
                    )}
                    <input
                      type="file"
                      name="image"
                      onChange={handleInputChange}
                      accept="image/*"
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-gray-400 mb-2">Recommended: Square image, max 2MB</p>
                    <label className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg cursor-pointer flex items-center justify-center space-x-2 transition-colors text-sm border border-gray-600">
                      <Upload size={16} />
                      <span>{imageFile ? 'Change Image' : 'Upload Image'}</span>
                      <input
                        type="file"
                        name="image"
                        onChange={handleInputChange}
                        accept="image/*"
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              </div>

               {/* Banner Image Upload */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Brand Banner Image
                </label>
                <div className="flex flex-col space-y-3">
                  <div className="relative h-32 w-full rounded-lg bg-gray-700 overflow-hidden flex items-center justify-center border-2 border-dashed border-gray-600">
                    {bannerImagePreview ? (
                      <img src={bannerImagePreview} alt="Banner Preview" className="h-full w-full object-cover" />
                    ) : (
                      <div className="text-center">
                        <ImageIcon size={32} className="text-gray-500 mx-auto mb-1" />
                        <span className="text-xs text-gray-500">Upload Banner</span>
                      </div>
                    )}
                    <input
                      type="file"
                      name="bannerImage"
                      onChange={handleInputChange}
                      accept="image/*"
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                  </div>
                  <p className="text-[10px] text-gray-400">Recommended: Wide banner (e.g., 1200x400), max 3MB</p>
                </div>
              </div>

              {/* Category Selection Dropdown */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  1. Select Category
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => {
                    setSelectedCategory(e.target.value);
                    setFormData(prev => ({ ...prev, subCategories: [] })); // Clear subcats when category changes
                  }}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select Category</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.name}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Sub Categories Multi-Select (Filtered) */}
              {selectedCategory && (
                <div className="mb-6 animate-in fade-in slide-in-from-top-2 duration-300">
                  <label className="block text-sm font-medium text-gray-300 mb-3">
                    2. Select Sub Categories for {selectedCategory} *
                  </label>
                  <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-3 bg-gray-900 border border-gray-700 rounded-lg custom-scrollbar">
                    {subCategories
                      .filter(sub => sub.category === selectedCategory)
                      .map((sub) => (
                        <label key={sub.id} className="flex items-center space-x-2 cursor-pointer group p-2 hover:bg-gray-800 rounded-md transition-colors">
                          <input
                            type="checkbox"
                            name="subCategories"
                            value={sub.name}
                            checked={formData.subCategories.includes(sub.name)}
                            onChange={handleInputChange}
                            className="w-4 h-4 rounded border-gray-500 bg-gray-600 text-blue-600 focus:ring-blue-500 focus:ring-offset-gray-800"
                          />
                          <span className="text-sm text-gray-300 group-hover:text-white transition-colors">{sub.name}</span>
                        </label>
                      ))}
                  </div>
                  {formData.subCategories.length === 0 && (
                    <p className="text-[10px] text-red-400 mt-2 flex items-center">
                      <span className="w-1 h-1 bg-red-400 rounded-full mr-1 animate-pulse"></span>
                      Please select at least one sub category
                    </p>
                  )}
                </div>
              )}
              
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

              {/* Brand Description */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Brand Description
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Enter brand description"
                  rows="3"
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
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