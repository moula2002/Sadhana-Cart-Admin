import React, { useState, useEffect } from 'react';
import { Plus, RefreshCw, X, Camera, Edit, Trash2, Search } from 'lucide-react';
import { posterService, productService } from '../firebase/services';
import { sendTopicNotification } from '../firebase/sendNotification';

const Posters = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isProductFormModalOpen, setIsProductFormModalOpen] = useState(false);
  const [posters, setPosters] = useState([]);
  const [filteredPosters, setFilteredPosters] = useState([]);
  const [posterSearchTerm, setPosterSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    bannerName: '',
    description: '',
    status: 'active',
    image: null
  });
  const [productFormData, setProductFormData] = useState({
    bannerName: '',
    image: null
  });
  const [imagePreview, setImagePreview] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [productImagePreview, setProductImagePreview] = useState(null);
  const [productImageFile, setProductImageFile] = useState(null);
  const [selectedPoster, setSelectedPoster] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);

  // Fetch posters on component mount
  useEffect(() => {
    fetchPosters();
  }, []);


  // Filter posters based on search term
  useEffect(() => {
    if (posterSearchTerm.trim() === '') {
      setFilteredPosters(posters);
    } else {
      const filtered = posters.filter(poster =>
        poster.bannerName?.toLowerCase().includes(posterSearchTerm.toLowerCase()) ||
        poster.status?.toLowerCase().includes(posterSearchTerm.toLowerCase())
      );
      setFilteredPosters(filtered);
    }
  }, [posterSearchTerm, posters]);

  const fetchPosters = async () => {
    try {
      setLoading(true);
      const postersData = await posterService.getAll();
      setPosters(postersData);
      setFilteredPosters(postersData);
    } catch (error) {
      console.error('Error fetching posters:', error);
      alert('Error fetching posters. Please try again.');
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

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setFormData(prev => ({
        ...prev,
        image: file
      }));
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('Submitting form data:', formData);
    console.log('Image file:', imageFile);
    
    if (formData.bannerName.trim()) {
      try {
        setLoading(true);
        
        if (selectedPoster) {
          // Update existing poster
          console.log('Updating poster:', selectedPoster.id);
          const updatedPoster = await posterService.update(selectedPoster.id, formData, imageFile);
          setPosters(prev => prev.map(poster => 
            poster.id === selectedPoster.id ? updatedPoster : poster
          ));
          setFilteredPosters(prev => prev.map(poster => 
            poster.id === selectedPoster.id ? updatedPoster : poster
          ));
          alert('Poster updated successfully!');
        } else {
          // Add new poster
          console.log('Adding new poster');
          const newPoster = await posterService.add(formData, imageFile);
          setPosters(prev => [newPoster, ...prev]);
          setFilteredPosters(prev => [newPoster, ...prev]);
          alert('Poster added successfully!');
          
          // Send notification to all users
          await sendTopicNotification(
            'all_users',
            'New Offer!',
            `Check out our new offer: ${formData.bannerName}`,
            { screen: 'home' }
          );
        }
        
        handleCancel();
      } catch (error) {
        console.error('Error saving poster:', error);
        alert(`Error saving poster: ${error.message}`);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleCancel = () => {
    setFormData({ bannerName: '', description: '', status: 'active', image: null });
    setImagePreview(null);
    setImageFile(null);
    setSelectedPoster(null);
    setIsModalOpen(false);
  };


  const handleOpenProductForm = () => {
    setProductFormData({
      bannerName: '',
      image: null
    });
    setProductImagePreview(null);
    setProductImageFile(null);
    setIsProductFormModalOpen(true);
  };

  const handleProductFormChange = (e) => {
    const { name, value } = e.target;
    setProductFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleProductImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProductImageFile(file);
      setProductFormData(prev => ({
        ...prev,
        image: file
      }));
      const reader = new FileReader();
      reader.onload = (e) => setProductImagePreview(e.target.result);
      reader.readAsDataURL(file);
    }
  };

  const handleProductFormSubmit = async (e) => {
    e.preventDefault();
    console.log('Submitting product form data:', productFormData);
    console.log('Product image file:', productImageFile);
    
    if (productFormData.bannerName.trim()) {
      try {
        setLoading(true);
        
        // Prepare banner data with all required fields
        const bannerData = {
          bannerName: productFormData.bannerName,
          status: 'active',
          image: productFormData.image,
          createdAt: new Date().toISOString()
        };

        console.log('Attempting to create/update banner:', bannerData);

        // Check if banner already exists for this product
        const existingBanner = posters.find(poster => 
          poster.productId === productFormData.productId
        );
        
        if (existingBanner) {
          console.log('Updating existing banner:', existingBanner.id);
          // Update existing banner
          const updatedBanner = await posterService.update(existingBanner.id, bannerData, productImageFile);
          setPosters(prev => prev.map(poster => 
            poster.id === existingBanner.id ? updatedBanner : poster
          ));
          setFilteredPosters(prev => prev.map(poster => 
            poster.id === existingBanner.id ? updatedBanner : poster
          ));
          console.log('✅ Banner updated successfully:', updatedBanner.id);
        } else {
          console.log('Creating new banner');
          // Create new banner
          const newBanner = await posterService.add(bannerData, productImageFile);
          setPosters(prev => [newBanner, ...prev]);
          setFilteredPosters(prev => [newBanner, ...prev]);
          console.log('✅ New banner created successfully:', newBanner.id);

          // Send notification to all users
          await sendTopicNotification(
            'all_users',
            'Sadhana Cart Special Offer!',
            `Exciting new deal on ${bannerData.bannerName}! Grab it now.`,
            { 
              screen: 'product_details',
              productId: bannerData.productId
            }
          );
        }
        
        // Reset form
        setProductFormData({
          bannerName: '',
          image: null
        });
        setProductImagePreview(null);
        setProductImageFile(null);
        setSelectedProduct(null);
        setIsProductFormModalOpen(false);
        
        alert('Banner created/updated successfully!');
      } catch (error) {
        console.error('Error creating banner:', error);
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
        alert(`Error creating banner: ${error.message}`);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleProductFormCancel = () => {
    setProductFormData({
      bannerName: '',
      image: null
    });
    setProductImagePreview(null);
    setProductImageFile(null);
    setSelectedProduct(null);
    setIsProductFormModalOpen(false);
  };

  const handleEdit = (poster) => {
    setSelectedPoster(poster);
    setFormData({
      bannerName: poster.bannerName || '',
      description: poster.description || '',
      status: poster.status || 'active',
      image: poster.image || null
    });
    setImagePreview(poster.image || null);
    setImageFile(null);
    setIsModalOpen(true);
  };

  const handleDelete = async (posterId) => {
    if (window.confirm('Are you sure you want to delete this poster?')) {
      try {
        setLoading(true);
        await posterService.delete(posterId);
        setPosters(prev => prev.filter(poster => poster.id !== posterId));
        setFilteredPosters(prev => prev.filter(poster => poster.id !== posterId));
        alert('Poster deleted successfully!');
      } catch (error) {
        console.error('Error deleting poster:', error);
        alert('Error deleting poster. Please try again.');
      } finally {
        setLoading(false);
      }
    }
  };


  return (
    <div className="p-4 lg:p-8 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 min-h-screen font-sans">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-10 gap-6">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-blue-600/20 rounded-2xl border border-blue-500/20">
              <Plus className="h-8 w-8 text-blue-500" />
            </div>
            <div>
              <h2 className="text-3xl font-black text-white tracking-tight">Posters & Banners</h2>
              <p className="text-gray-400 font-medium">Manage your storefront visual offers</p>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 group-focus-within:text-blue-500 transition-colors" size={18} />
              <input
                type="text"
                placeholder="Search banners..."
                value={posterSearchTerm}
                onChange={(e) => setPosterSearchTerm(e.target.value)}
                className="w-full sm:w-72 pl-12 pr-4 py-3 bg-gray-800/50 backdrop-blur-md border border-gray-700 rounded-2xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-medium"
              />
            </div>
            
            <div className="flex items-center gap-3">
              <button 
                onClick={handleOpenProductForm}
                className="flex-1 sm:flex-none bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-6 py-3 rounded-2xl flex items-center justify-center space-x-2 transition-all font-bold shadow-lg shadow-green-900/20 transform active:scale-95"
              >
                <Plus size={20} />
                <span>Add Banner</span>
              </button>
              <button 
                onClick={fetchPosters}
                className="p-3 bg-gray-800 text-gray-400 hover:text-white rounded-2xl border border-gray-700 transition-colors"
              >
                <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>
        </div>

      {/* Desktop Table View */}
      <div className="hidden md:block bg-gray-800/40 backdrop-blur-xl rounded-3xl overflow-hidden border border-gray-700/50 shadow-2xl">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-800/60 border-b border-gray-700/50">
                <th className="px-6 py-5 text-xs font-bold text-gray-500 uppercase tracking-[0.15em]">Banner Asset</th>
                <th className="px-6 py-5 text-xs font-bold text-gray-500 uppercase tracking-[0.15em]">Status</th>
                <th className="px-6 py-5 text-right text-xs font-bold text-gray-500 uppercase tracking-[0.15em]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700/50">
              {loading && filteredPosters.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center">
                      <RefreshCw size={32} className="animate-spin text-blue-500 mb-4" />
                      <p className="text-gray-400 font-medium">Synchronizing catalogs...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredPosters.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-20 text-center text-gray-500 font-medium">
                    {posterSearchTerm ? 'No search results found.' : 'Your gallery is empty.'}
                  </td>
                </tr>
              ) : (
                filteredPosters.map((poster) => (
                  <tr key={poster.id} className="group hover:bg-gray-700/30 transition-colors">
                    <td className="px-6 py-6">
                      <div className="flex items-center space-x-4">
                        {poster.image ? (
                          <img 
                            src={poster.image} 
                            alt={poster.bannerName}
                            className="w-14 h-14 object-cover rounded-xl shadow-lg border border-gray-700"
                          />
                        ) : (
                          <div className="w-14 h-14 bg-gray-700 rounded-xl flex items-center justify-center border border-gray-600">
                            <Camera size={20} className="text-gray-400" />
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-bold text-white leading-tight mb-1">{poster.bannerName}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-6">
                      <span className={`inline-flex px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                        poster.status === 'active' 
                          ? 'bg-green-500/10 text-green-400 border border-green-500/20' 
                          : 'bg-red-500/10 text-red-400 border border-red-500/20'
                      }`}>
                        {poster.status}
                      </span>
                    </td>
                    <td className="px-6 py-6 text-right">
                      <div className="flex items-center justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleEdit(poster)}
                          className="p-2.5 bg-blue-600/10 text-blue-400 hover:bg-blue-600 hover:text-white rounded-xl transition-all border border-blue-600/20"
                          title="Edit"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(poster.id)}
                          className="p-2.5 bg-red-600/10 text-red-400 hover:bg-red-600 hover:text-white rounded-xl transition-all border border-red-600/20"
                          title="Delete"
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

      {/* Mobile Card View */}
      <div className="md:hidden space-y-4">
        {loading ? (
          <div className="bg-gray-800 rounded-lg p-6 text-center">
            <p className="text-gray-400">Loading posters...</p>
          </div>
        ) : filteredPosters.length === 0 ? (
          <div className="bg-gray-800 rounded-lg p-6 text-center">
            <p className="text-gray-400">
              {posterSearchTerm ? 'No posters found matching your search.' : 'No posters available'}
            </p>
          </div>
        ) : (
          filteredPosters.map((poster) => (
            <div key={poster.id} className="bg-gray-800/50 backdrop-blur-md rounded-3xl p-5 border border-gray-700/50 relative overflow-hidden">
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0">
                  {poster.image ? (
                    <img 
                      src={poster.image} 
                      alt={poster.bannerName}
                      className="w-20 h-24 object-cover rounded-2xl shadow-lg"
                    />
                  ) : (
                    <div className="w-20 h-24 bg-gray-700 rounded-2xl flex items-center justify-center border border-gray-600">
                      <Camera size={28} className="text-gray-500" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-end mb-2">
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest ${
                      poster.status === 'active' 
                        ? 'bg-green-500/10 text-green-400 border border-green-500/20' 
                        : 'bg-red-500/10 text-red-400 border border-red-500/20'
                    }`}>
                      {poster.status}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-white mb-1 truncate">
                    {poster.bannerName}
                  </h3>
                </div>
              </div>

              <div className="flex space-x-3 mt-6">
                <button
                  onClick={() => handleEdit(poster)}
                  className="flex-1 bg-gray-800 hover:bg-gray-700 text-white py-3 rounded-2xl text-xs font-bold transition-all border border-gray-700 flex items-center justify-center gap-2"
                >
                  <Edit size={14} />
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(poster.id)}
                  className="flex-1 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white py-3 rounded-2xl text-xs font-bold transition-all border border-red-500/20 flex items-center justify-center gap-2"
                >
                  <Trash2 size={14} />
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add/Edit Poster Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">
                  {selectedPoster ? 'Edit Poster' : 'Add New Poster'}
                </h3>
                <button
                  onClick={handleCancel}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Poster Image */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Poster Image
                  </label>
                  <div className="border-2 border-dashed border-gray-600 rounded-lg p-4 text-center">
                    {imagePreview ? (
                      <div className="relative">
                        <img 
                          src={imagePreview} 
                          alt="Preview" 
                          className="w-full h-48 object-cover rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setImagePreview(null);
                            setImageFile(null);
                            setFormData(prev => ({ ...prev, image: null }));
                          }}
                          className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ) : (
                      <div>
                        <Camera className="mx-auto h-12 w-12 text-gray-400 mb-2" />
                        <p className="text-gray-400 mb-2">Upload Poster Image</p>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageChange}
                          className="hidden"
                          id="poster-image"
                        />
                        <label
                          htmlFor="poster-image"
                          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg cursor-pointer transition-colors"
                        >
                          Choose Image
                        </label>
                      </div>
                    )}
                  </div>
                </div>

                {/* Poster Title */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Banner Name *
                  </label>
                  <input
                    type="text"
                    name="bannerName"
                    value={formData.bannerName}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter banner name"
                    required
                  />
                </div>

                {/* Status */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Status
                  </label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>

                {/* Form Actions */}
                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    {loading ? 'Saving...' : (selectedPoster ? 'Update Poster' : 'Add Poster')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}


      {/* Product Form Modal */}
      {isProductFormModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">
                  Create Banner
                </h3>
                <button
                  onClick={handleProductFormCancel}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleProductFormSubmit} className="space-y-4">
                {/* Banner Image */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Banner Image
                  </label>
                  <div className="flex items-center justify-center w-full">
                    {productImagePreview ? (
                      <div className="relative">
                        <img
                          src={productImagePreview}
                          alt="Banner preview"
                          className="w-32 h-32 object-cover rounded-lg"
                        />
                        <label
                          htmlFor="productImageUpload"
                          className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-lg cursor-pointer opacity-0 hover:opacity-100 transition-opacity"
                        >
                          <Camera className="w-6 h-6 text-white" />
                        </label>
                        <input
                          id="productImageUpload"
                          type="file"
                          accept="image/*"
                          onChange={handleProductImageChange}
                          className="hidden"
                        />
                      </div>
                    ) : (
                      <div className="w-full">
                        <input
                          id="productImageUpload"
                          type="file"
                          accept="image/*"
                          onChange={handleProductImageChange}
                          className="hidden"
                        />
                        <label
                          htmlFor="productImageUpload"
                          className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-600 border-dashed rounded-lg cursor-pointer bg-gray-700 hover:bg-gray-600"
                        >
                          <Camera className="w-8 h-8 mb-2 text-gray-400" />
                          <p className="text-sm text-gray-400">Choose Banner Image</p>
                        </label>
                      </div>
                    )}
                  </div>
                </div>


                {/* Banner Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Banner Name *
                  </label>
                  <input
                    type="text"
                    name="bannerName"
                    value={productFormData.bannerName}
                    onChange={handleProductFormChange}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter banner name"
                    required
                  />
                </div>

                {/* Form Actions */}
                <div className="flex space-x-4 pt-6">
                  <button
                    type="button"
                    onClick={handleProductFormCancel}
                    className="flex-1 px-4 py-4 bg-gray-700 text-white rounded-2xl font-bold hover:bg-gray-600 transition-all border border-gray-600"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 px-4 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-2xl font-bold shadow-lg shadow-blue-900/20 transition-all disabled:opacity-50"
                  >
                    {loading ? 'Processing...' : (selectedPoster ? 'Update' : 'Launch Banner')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Style for Custom Scrollbar */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; height: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #475569; }
      `}</style>
    </div>
  </div>
);
};

export default Posters;