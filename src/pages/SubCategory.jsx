import React, { useState, useEffect, useMemo } from 'react';
import { Plus, RefreshCw, X, Edit, Trash2, Search, Image as ImageIcon, Upload } from 'lucide-react';
import { subCategoryService, categoryService } from '../firebase/services';

const SubCategory = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [subCategories, setSubCategories] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubCategory, setSelectedSubCategory] = useState(null);
  // NEW STATE: For handling search input
  const [searchTerm, setSearchTerm] = useState(''); 

  const [formData, setFormData] = useState({
    name: '',
    category: '',
    image: ''
  });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  // Fetch data from Firebase on component mount
  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      const [subCategoriesData, categoriesData] = await Promise.all([
        subCategoryService.getAll(),
        categoryService.getAll()
      ]);
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
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.name.trim() && formData.category.trim()) {
      try {
        setLoading(true);
        
        console.log('Form data being sent:', formData);
        
        const dataToSubmit = {
          name: formData.name,
          category: formData.category
        };

        if (selectedSubCategory) {
          // Update existing sub category
          const updatedData = await subCategoryService.update(selectedSubCategory.id, dataToSubmit, imageFile);
          
          setSubCategories(prev => 
            prev.map(subCat => 
              subCat.id === selectedSubCategory.id 
                ? { ...subCat, ...updatedData } 
                : subCat
            )
          );
          
          alert('Sub category updated successfully!');
        } else {
          // Add new sub category 
          const newSubCategory = await subCategoryService.add(dataToSubmit, imageFile);
          setSubCategories(prev => [newSubCategory, ...prev]);
          alert(`Sub category added successfully!`);
        }
        
        setFormData({ name: '', category: '', image: '' });
        setImageFile(null);
        setImagePreview(null);
        setSelectedSubCategory(null);
        setIsModalOpen(false);
      } catch (error) {
        console.error('Error saving sub category:', error);
        alert('Error saving sub category. Please try again.');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleCancel = () => {
    setFormData({ name: '', category: '', image: '' });
    setImageFile(null);
    setImagePreview(null);
    setSelectedSubCategory(null);
    setIsModalOpen(false);
  };

  const handleEdit = (subCategory) => {
    setSelectedSubCategory(subCategory);
    setFormData({
      name: subCategory.name,
      category: subCategory.category,
      image: subCategory.image || ''
    });
    setImagePreview(subCategory.image || null);
    setIsModalOpen(true);
  };

  const handleDelete = async (subCategoryId) => {
    if (window.confirm('Are you sure you want to delete this sub category?')) {
      try {
        await subCategoryService.delete(subCategoryId);
        setSubCategories(prev => prev.filter(subCat => subCat.id !== subCategoryId));
        alert('Sub category deleted successfully!');
      } catch (error) {
        console.error('Error deleting sub category:', error);
        alert('Error deleting sub category. Please try again.');
      }
    }
  };

  const handleRefresh = () => {
    fetchAllData();
  };

  // --- SEARCH AND FILTERING LOGIC ---
  const filteredSubCategories = useMemo(() => {
    const lowerCaseSearchTerm = searchTerm.toLowerCase().trim();
    if (!lowerCaseSearchTerm) {
      return subCategories;
    }

    return subCategories.filter(subCategory => 
      // Filter by Sub Category Name
      (subCategory.name || '').toLowerCase().includes(lowerCaseSearchTerm) ||
      // Optional: Filter by Category Name as well
      (subCategory.category || '').toLowerCase().includes(lowerCaseSearchTerm)
    );
  }, [subCategories, searchTerm]);
  // ---------------------------------

  return (
    <div className="p-4 lg:p-6 bg-gray-900 h-full min-h-screen">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
        <h2 className="text-2xl font-semibold text-white">Sub Category Management</h2>
        <div className="flex items-center space-x-3 w-full md:w-auto">
          <button 
            onClick={() => {
              setSelectedSubCategory(null);
              setFormData({ name: '', category: '', image: '' });
              setImageFile(null);
              setImagePreview(null);
              setIsModalOpen(true);
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors text-sm"
          >
            <Plus size={20} />
            <span>Add Sub Category</span>
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
          Sub Categories ({filteredSubCategories.length})
        </h3>
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search by name or category..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>
      {/* ------------------ */}

      <div className="bg-gray-800 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-700">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-300">Image</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-300">SubCategory Name</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-300">Category</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-300">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="3" className="px-6 py-12 text-center text-gray-400">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto"></div>
                    <p className="mt-2">Loading sub categories...</p>
                  </td>
                </tr>
              ) : filteredSubCategories.length === 0 ? (
                <tr>
                  <td colSpan="3" className="px-6 py-12 text-center text-gray-400">
                    {searchTerm ? `No sub categories found matching "${searchTerm}"` : 'No sub categories available'}
                  </td>
                </tr>
              ) : (
                filteredSubCategories.map((subCategory) => (
                  <tr key={subCategory.id} className="border-t border-gray-700 hover:bg-gray-700">
                    <td className="px-6 py-4">
                      {subCategory.image ? (
                        <img src={subCategory.image} alt={subCategory.name} className="h-10 w-10 rounded-lg object-cover bg-gray-700" />
                      ) : (
                        <div className="h-10 w-10 rounded-lg bg-gray-700 flex items-center justify-center">
                          <ImageIcon size={20} className="text-gray-500" />
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-white font-medium">{subCategory.name}</td>
                    <td className="px-6 py-4 text-gray-300">{subCategory.category}</td>
                    <td className="px-6 py-4 text-sm font-medium space-x-2">
                      <button
                        onClick={() => handleEdit(subCategory)}
                        className="text-blue-400 hover:text-blue-300 transition-colors p-1"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(subCategory.id)}
                        className="text-red-400 hover:text-red-300 transition-colors p-1"
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

      {/* Add Sub Category Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-blue-400">
                {selectedSubCategory ? 'EDIT SUB CATEGORY' : 'ADD SUB CATEGORY'}
              </h3>
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
                  Sub Category Image
                </label>
                <div className="flex items-center space-x-4">
                  <div className="relative h-20 w-20 rounded-lg bg-gray-700 overflow-hidden flex items-center justify-center border-2 border-dashed border-gray-600">
                    {imagePreview ? (
                      <img src={imagePreview} alt="Preview" className="h-full w-full object-cover" />
                    ) : (
                      <ImageIcon size={28} className="text-gray-500" />
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
                    <label className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-1.5 rounded-lg cursor-pointer flex items-center justify-center space-x-2 transition-colors text-xs border border-gray-600">
                      <Upload size={14} />
                      <span>{imageFile ? 'Change' : 'Upload'}</span>
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
              {/* Category Dropdown */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Select Parent Category *
                </label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="" disabled>Select Category</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.name}>{category.name}</option>
                  ))}
                </select>
              </div>
              
              {/* Sub Category Name */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Sub Category Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Enter sub category name"
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
                  {loading ? (selectedSubCategory ? 'Updating...' : 'Adding...') : (selectedSubCategory ? 'Update' : 'Submit')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubCategory;