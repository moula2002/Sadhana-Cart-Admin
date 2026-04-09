// File: Category.jsx

import React, { useState, useEffect, useMemo } from 'react';
import { Plus, RefreshCw, X, Camera, Edit, Trash2, Search } from 'lucide-react';
import { categoryService } from '../firebase/categoryService.js'; // <--- ASSUMING THIS PATH IS CORRECT

const Category = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [searchTerm, setSearchTerm] = useState(''); 
    
    const [formData, setFormData] = useState({
        name: '',
        commission: 0, 
        image: null // Holds the image URL if editing, or null
    });
    
    const [imagePreview, setImagePreview] = useState(null);
    const [imageFile, setImageFile] = useState(null); // Holds the actual File object for upload

    useEffect(() => {
        fetchCategories();
    }, []);

 const fetchCategories = async () => {
    try {
        setLoading(true);
        const fetchedCategories = await categoryService.getAll();

        // FILTER OUT INVALID IDs THAT DO NOT EXIST IN FIRESTORE
        const valid = fetchedCategories.filter(cat => 
            !cat.id.startsWith("CAT_")
        );

        console.log("Valid Firestore Categories:", valid);

        setCategories(valid);
    } catch (error) {
        console.error('Error fetching categories:', error);
    } finally {
        setLoading(false);
    }
};

    const handleInputChange = (e) => {
        const { name, value, type } = e.target;
        // Correctly parse commission as a float/number
        const finalValue = type === 'number' ? parseFloat(value) : value; 

        setFormData(prev => ({
            ...prev,
            [name]: finalValue
        }));
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setImageFile(file); // Store the actual file
            
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result); // Store data URL for preview
            };
            reader.readAsDataURL(file);
        }
    };
    
    const handleRemoveImage = () => {
        setImagePreview(null);
        setImageFile(null); 
        setFormData(prev => ({ ...prev, image: null })); // Clears the image URL for deletion logic
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (formData.name.trim() && formData.commission >= 0) {
            try {
                setLoading(true);
                
                const categoryData = {
                    name: formData.name.trim(),
                    commission: formData.commission,
                    image: formData.image // Pass the current URL for the service to handle
                };

                if (selectedCategory) {
                    const updatedCategory = await categoryService.update(
                        selectedCategory.id, 
                        categoryData, 
                        imageFile
                    );
                    setCategories(prev => prev.map(cat => 
                        cat.id === selectedCategory.id ? updatedCategory : cat
                    ));
                } else {
                    const newCategory = await categoryService.add(categoryData, imageFile);
                    setCategories(prev => [newCategory, ...prev]);
                }
                
                handleCancel();
            } catch (error) {
                console.error('Error saving category:', error);
                alert('Error saving category. Please check console for details.');
            } finally {
                setLoading(false);
            }
        }
    };

    const handleCancel = () => {
        setFormData({ name: '', commission: 0, image: null });
        setImagePreview(null);
        setImageFile(null);
        setSelectedCategory(null);
        setIsModalOpen(false);
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this category?')) {
            try {
                setLoading(true);
                await categoryService.delete(id);
                setCategories(prev => prev.filter(cat => cat.id !== id));
            } catch (error) {
                console.error('Error deleting category:', error);
                alert(`Error deleting category: ${error.message}.`);
            } finally {
                setLoading(false);
            }
        }
    };

    const handleEdit = (category) => {
        setSelectedCategory(category);
        setFormData({
            name: category.name,
            commission: category.commission || 0,
            image: category.image 
        });
        setImagePreview(category.image); 
        setImageFile(undefined); 
        setIsModalOpen(true);
    };

    const handleRefresh = () => {
        setSearchTerm('');
        fetchCategories();
    };

    const filteredCategories = useMemo(() => {
        const lowerCaseSearchTerm = searchTerm.toLowerCase().trim();
        if (!lowerCaseSearchTerm) {
            return categories;
        }

        return categories.filter(category => 
            (category.name || '').toLowerCase().includes(lowerCaseSearchTerm)
        );
    }, [categories, searchTerm]);

    return (
        <div className="p-4 lg:p-6 bg-gray-900 h-full min-h-screen">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
                <h2 className="text-2xl font-semibold text-white">Category Management</h2>
                <div className="flex items-center space-x-3 w-full md:w-auto">
                    <button 
                        onClick={() => { handleCancel(); setIsModalOpen(true); }}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors text-sm"
                    >
                        <Plus size={20} />
                        <span>Add Category</span>
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
                    Categories ({filteredCategories.length})
                </h3>
                <div className="relative w-full sm:w-80">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search category name..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
            </div>

            {/* Desktop Table View */}
            <div className="hidden lg:block bg-gray-800 rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-700">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Category Name</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Commission (%)</th> 
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Image</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="4" className="px-6 py-4 text-center text-gray-400">
                                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto"></div>
                                        <p className="mt-2">Loading categories...</p>
                                    </td>
                                </tr>
                            ) : filteredCategories.length === 0 ? (
                                <tr>
                                    <td colSpan="4" className="px-6 py-4 text-center text-gray-400">
                                        {searchTerm ? `No categories found matching "${searchTerm}"` : 'No categories found'}
                                    </td>
                                </tr>
                            ) : (
                                filteredCategories.map((category) => (
                                    <tr key={category.id} className="border-b border-gray-700 hover:bg-gray-700/50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300 font-medium">{category.name}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{category.commission ? `${category.commission}%` : '0%'}</td> 
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {category.image ? (
                                                <img src={category.image} alt={category.name} className="h-10 w-10 rounded-full object-cover" />
                                            ) : (
                                                <Camera size={24} className="text-gray-500" />
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-right">
                                            <div className="flex space-x-2 justify-end">
                                                <button
                                                    onClick={() => handleEdit(category)}
                                                    className="text-indigo-400 hover:text-indigo-300 p-2 rounded-lg hover:bg-gray-700"
                                                >
                                                    <Edit size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(category.id)}
                                                    className="text-red-400 hover:text-red-300 p-2 rounded-lg hover:bg-gray-700"
                                                >
                                                    <Trash2 size={16} />
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

            {/* Mobile Card View (For Tailwind Mobile Responsiveness) */}
            <div className="lg:hidden space-y-4">
                {loading ? (
                    <div className="bg-gray-800 rounded-lg p-6 text-center text-gray-400">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto"></div>
                        <p className="mt-2">Loading categories...</p>
                    </div>
                ) : filteredCategories.length === 0 ? (
                    <div className="bg-gray-800 rounded-lg p-6 text-center text-gray-400">
                        {searchTerm ? `No categories found matching "${searchTerm}"` : 'No categories found'}
                    </div>
                ) : (
                    filteredCategories.map((category) => (
                        <div key={category.id} className="bg-gray-800 rounded-lg p-4 flex items-center justify-between hover:bg-gray-700/50 transition-colors">
                            <div className="flex items-center space-x-4">
                                {category.image ? (
                                    <img src={category.image} alt={category.name} className="h-16 w-16 rounded-full object-cover" />
                                ) : (
                                    <div className="h-16 w-16 rounded-full bg-gray-700 flex items-center justify-center">
                                        <Camera size={24} className="text-gray-500" />
                                    </div>
                                )}
                                <div>
                                    <h3 className="text-white font-medium text-lg">{category.name}</h3>
                                    <p className="text-sm text-gray-400">Commission: {category.commission ? `${category.commission}%` : '0%'}</p> 
                                </div>
                            </div>
                            <div className="flex space-x-2">
                                <button
                                    onClick={() => handleEdit(category)}
                                    className="text-indigo-400 hover:text-indigo-300 p-2 bg-gray-700 rounded-lg"
                                >
                                    <Edit size={16} />
                                </button>
                                <button
                                    onClick={() => handleDelete(category.id)}
                                    className="text-red-400 hover:text-red-300 p-2 bg-gray-700 rounded-lg"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Add/Edit Category Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-gray-800 rounded-xl shadow-2xl p-6 w-full max-w-md mx-4">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h3 className="text-xl font-semibold text-white">{selectedCategory ? 'Edit Category' : 'Add New Category'}</h3>
                                <p className="text-sm text-gray-400 mt-1">{selectedCategory ? 'Update the details below to edit the category' : 'Fill in the details below to create a new category'}</p>
                            </div>
                            <button 
                                onClick={handleCancel}
                                className="text-gray-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-gray-700"
                                disabled={loading}
                            >
                                <X size={20} />
                            </button>
                        </div>
                        
                        <form onSubmit={handleSubmit}>
                            {/* Image Upload */}
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-300 mb-3">
                                    Category Image
                                </label>
                                <div className="flex justify-center">
                                    <div className="relative">
                                        {/* Input for file selection */}
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleImageChange}
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                            id="image-upload"
                                        />
                                        <label 
                                            htmlFor="image-upload"
                                            className="w-32 h-32 bg-gray-700 border-2 border-dashed border-gray-600 rounded-lg flex items-center justify-center cursor-pointer hover:bg-gray-600 hover:border-gray-500 transition-all duration-200"
                                        >
                                            {imagePreview ? (
                                                <>
                                                    <img 
                                                        src={imagePreview} 
                                                        alt="Preview" 
                                                        className="w-full h-full object-cover rounded-lg"
                                                    />
                                                    {/* Remove button overlay */}
                                                    <button 
                                                        type="button" 
                                                        onClick={(e) => { e.preventDefault(); handleRemoveImage(); }} 
                                                        className="absolute top-1 right-1 p-1 bg-red-600 rounded-full text-white hover:bg-red-700 z-10"
                                                    >
                                                        <X size={14} />
                                                    </button>
                                                </>
                                            ) : (
                                                <div className="text-center">
                                                    <Camera size={32} className="text-gray-400 mx-auto mb-2" />
                                                    <span className="text-sm text-gray-400 font-medium">Upload Image</span>
                                                    <span className="text-xs text-gray-500 block mt-1">Click to browse</span>
                                                </div>
                                            )}
                                        </label>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Category Name */}
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Category Name *
                                </label>
                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleInputChange}
                                    placeholder="Enter category name"
                                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    required
                                />
                            </div>

                            {/* Commission Percentage Input */}
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Commission Percentage (%) *
                                </label>
                                <input
                                    type="number"
                                    name="commission"
                                    value={formData.commission}
                                    onChange={handleInputChange}
                                    placeholder="Enter commission percentage (e.g., 10)"
                                    min="0"
                                    max="100"
                                    step="0.01"
                                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    required
                                />
                            </div>
                            
                            {/* Buttons */}
                            <div className="flex space-x-4 pt-4">
                                <button
                                    type="button"
                                    onClick={handleCancel}
                                    className="flex-1 px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-500 transition-all duration-200 font-medium"
                                    disabled={loading}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                    disabled={loading || !formData.name.trim() || formData.commission < 0 || formData.commission > 100}
                                >
                                    {loading ? (selectedCategory ? 'Updating...' : 'Adding...') : (selectedCategory ? 'Update Category' : 'Add Category')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
  
export default Category;