import React, { useState, useEffect } from 'react';
import { 
  Plus, Edit2, Trash2, Image as ImageIcon, Link as LinkIcon, 
  Calendar, ToggleLeft, ToggleRight, X, AlertCircle 
} from 'lucide-react';
import { 
  addPopup, getPopups, updatePopup, deletePopup, togglePopupActive 
} from '../firebase/popupService';

const Popups = () => {
  const [popups, setPopups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingPopup, setEditingPopup] = useState(null);
  
  // Form State
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    buttonText: '',
    buttonLink: '',
    frequency: 'always',
    startDate: '',
    endDate: '',
    isActive: true
  });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');

  useEffect(() => {
    fetchPopups();
  }, []);

  const fetchPopups = async () => {
    try {
      setLoading(true);
      const data = await getPopups();
      setPopups(data);
    } catch (error) {
      console.error("Failed to fetch popups:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (popup = null) => {
    if (popup) {
      setEditingPopup(popup);
      setFormData({
        title: popup.title || '',
        description: popup.description || '',
        buttonText: popup.buttonText || '',
        buttonLink: popup.buttonLink || '',
        frequency: popup.frequency || 'always',
        startDate: popup.startDate ? new Date(popup.startDate.toMillis()).toISOString().split('T')[0] : '',
        endDate: popup.endDate ? new Date(popup.endDate.toMillis()).toISOString().split('T')[0] : '',
        isActive: popup.isActive
      });
      setImagePreview(popup.imageUrl || '');
    } else {
      setEditingPopup(null);
      setFormData({
        title: '',
        description: '',
        buttonText: '',
        buttonLink: '',
        frequency: 'always',
        startDate: '',
        endDate: '',
        isActive: true
      });
      setImagePreview('');
    }
    setImageFile(null);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingPopup(null);
    setImageFile(null);
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const dataToSave = {
        title: formData.title,
        description: formData.description,
        buttonText: formData.buttonText,
        buttonLink: formData.buttonLink,
        frequency: formData.frequency,
        startDate: formData.startDate ? new Date(formData.startDate) : null,
        endDate: formData.endDate ? new Date(formData.endDate) : null,
        isActive: formData.isActive
      };

      if (editingPopup) {
        await updatePopup(editingPopup.id, dataToSave, imageFile, editingPopup.imageUrl);
      } else {
        await addPopup(dataToSave, imageFile);
      }
      
      await fetchPopups();
      handleCloseModal();
    } catch (error) {
      console.error("Error saving popup:", error);
      alert("Failed to save popup.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (popup) => {
    if (window.confirm("Are you sure you want to delete this popup?")) {
      try {
        await deletePopup(popup.id, popup.imageUrl);
        await fetchPopups();
      } catch (error) {
        console.error("Error deleting popup:", error);
        alert("Failed to delete popup.");
      }
    }
  };

  const handleToggleActive = async (popup) => {
    try {
      await togglePopupActive(popup.id, popup.isActive);
      // Update local state for immediate feedback
      setPopups(popups.map(p => 
        p.id === popup.id ? { ...p, isActive: !p.isActive } : p
      ));
    } catch (error) {
      console.error("Error toggling status:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 bg-gradient-to-br from-gray-50 dark:from-gray-900 via-white dark:via-gray-800 to-gray-50 dark:to-gray-900 min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            Popup Management
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Manage promotional popups and banners for the website.</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-gray-900 dark:text-white px-6 py-2.5 rounded-xl font-semibold shadow-lg transition-all"
        >
          <Plus size={20} />
          Create New Popup
        </button>
      </div>

      {/* Popups Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {popups.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center p-12 bg-white/80 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700">
            <ImageIcon className="w-16 h-16 text-gray-500 mb-4" />
            <h3 className="text-xl text-gray-700 dark:text-gray-300 font-semibold mb-2">No Popups Found</h3>
            <p className="text-gray-500 dark:text-gray-400 text-center">You haven't created any popups yet. Click the button above to get started.</p>
          </div>
        ) : (
          popups.map((popup) => (
            <div key={popup.id} className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700 shadow-xl flex flex-col">
              <div className="h-48 bg-gray-50 dark:bg-gray-900 relative">
                {popup.imageUrl ? (
                  <img src={popup.imageUrl} alt={popup.title} className="w-full h-full object-cover opacity-80" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageIcon className="w-12 h-12 text-gray-600" />
                  </div>
                )}
                <div className="absolute top-3 right-3 flex gap-2">
                  <button 
                    onClick={() => handleToggleActive(popup)}
                    className={`p-2 rounded-lg backdrop-blur-md ${popup.isActive ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-500 dark:text-gray-400'} hover:bg-opacity-40 transition-all`}
                    title={popup.isActive ? 'Deactivate' : 'Activate'}
                  >
                    {popup.isActive ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                  </button>
                </div>
              </div>
              <div className="p-5 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-3">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white line-clamp-1">{popup.title || 'Untitled Popup'}</h3>
                  <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${popup.isActive ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-500 dark:text-gray-400'}`}>
                    {popup.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <p className="text-gray-500 dark:text-gray-400 text-sm mb-4 line-clamp-2 flex-1">
                  {popup.description || 'No description provided.'}
                </p>
                
                <div className="space-y-2 mb-4 pt-4 border-t border-gray-200 dark:border-gray-700 text-sm">
                  <div className="flex items-center text-gray-700 dark:text-gray-300">
                    <Calendar size={16} className="mr-2 text-purple-400" />
                    <span>
                      {popup.startDate ? new Date(popup.startDate.toMillis()).toLocaleDateString() : 'N/A'} - {popup.endDate ? new Date(popup.endDate.toMillis()).toLocaleDateString() : 'N/A'}
                    </span>
                  </div>
                  <div className="flex items-center text-gray-700 dark:text-gray-300">
                    <ToggleRight size={16} className="mr-2 text-blue-400" />
                    <span className="capitalize">Frequency: {popup.frequency.replace('_', ' ')}</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button 
                    onClick={() => handleOpenModal(popup)}
                    className="flex-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-100 dark:bg-gray-600 text-gray-900 dark:text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    <Edit2 size={16} /> Edit
                  </button>
                  <button 
                    onClick={() => handleDelete(popup)}
                    className="flex-1 bg-red-600/20 hover:bg-red-600/30 text-red-400 px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 border border-red-500/20"
                  >
                    <Trash2 size={16} /> Delete
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-4xl w-full border border-gray-200 dark:border-gray-700 shadow-2xl my-8">
            <div className="flex justify-between items-center p-5 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {editingPopup ? 'Edit Popup' : 'Create New Popup'}
              </h2>
              <button onClick={handleCloseModal} className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:text-white p-2 rounded-xl hover:bg-gray-100 dark:bg-gray-700">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                {/* Image Upload - Left Side */}
                <div className="lg:col-span-4 flex flex-col">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Popup Image</label>
                  <label className="flex-1 flex flex-col items-center justify-center w-full min-h-[250px] border-2 border-gray-300 dark:border-gray-600 border-dashed rounded-xl cursor-pointer bg-gray-100/80 dark:bg-gray-700/30 hover:bg-gray-100/80 dark:bg-gray-700/50 overflow-hidden relative transition-colors">
                    {imagePreview ? (
                      <img src={imagePreview} alt="Preview" className="w-full h-full object-cover absolute inset-0" />
                    ) : (
                      <div className="flex flex-col items-center justify-center p-4 text-center">
                        <ImageIcon className="w-10 h-10 mb-3 text-gray-500 dark:text-gray-400" />
                        <p className="mb-2 text-sm text-gray-500 dark:text-gray-400"><span className="font-semibold">Click to upload</span></p>
                        <p className="text-xs text-gray-500">PNG, JPG or WEBP<br/>(MAX. 2MB)</p>
                      </div>
                    )}
                    <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
                  </label>
                </div>

                {/* Form Fields - Right Side */}
                <div className="lg:col-span-8 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Title</label>
                      <input
                        type="text"
                        required
                        value={formData.title}
                        onChange={(e) => setFormData({...formData, title: e.target.value})}
                        className="w-full bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                        placeholder="e.g. Summer Sale is Here!"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Description</label>
                      <textarea
                        required
                        rows="2"
                        value={formData.description}
                        onChange={(e) => setFormData({...formData, description: e.target.value})}
                        className="w-full bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none resize-none"
                        placeholder="Enter a compelling description for your popup..."
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Button Text</label>
                      <input
                        type="text"
                        required
                        value={formData.buttonText}
                        onChange={(e) => setFormData({...formData, buttonText: e.target.value})}
                        className="w-full bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                        placeholder="e.g. Shop Now"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Button Link</label>
                      <input
                        type="text"
                        required
                        value={formData.buttonLink}
                        onChange={(e) => setFormData({...formData, buttonLink: e.target.value})}
                        className="w-full bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                        placeholder="e.g. /category/sale"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Start Date</label>
                      <input
                        type="date"
                        required
                        value={formData.startDate}
                        onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                        className="w-full bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none [color-scheme:dark]"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">End Date</label>
                      <input
                        type="date"
                        required
                        value={formData.endDate}
                        onChange={(e) => setFormData({...formData, endDate: e.target.value})}
                        className="w-full bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none [color-scheme:dark]"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Display Frequency</label>
                      <select
                        value={formData.frequency}
                        onChange={(e) => setFormData({...formData, frequency: e.target.value})}
                        className="w-full bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                      >
                        <option value="always">Always (Every page load)</option>
                        <option value="session">Once per session (Until browser closes)</option>
                        <option value="daily">Once per day (Every 24 hours)</option>
                        <option value="once">Once per user (Ever)</option>
                      </select>
                    </div>

                    <div className="md:col-span-2 flex items-center pt-2">
                      <label className="flex items-center cursor-pointer group">
                        <div className="relative">
                          <input 
                            type="checkbox" 
                            className="sr-only" 
                            checked={formData.isActive}
                            onChange={(e) => setFormData({...formData, isActive: e.target.checked})}
                          />
                          <div className={`block w-12 h-7 rounded-full transition-colors ${formData.isActive ? 'bg-purple-600' : 'bg-gray-100 dark:bg-gray-600 group-hover:bg-gray-500'}`}></div>
                          <div className={`dot absolute left-1 top-1 bg-white w-5 h-5 rounded-full transition-transform ${formData.isActive ? 'transform translate-x-5' : ''}`}></div>
                        </div>
                        <div className="ml-3 text-gray-700 dark:text-gray-300 font-medium group-hover:text-gray-900 dark:text-white transition-colors">
                          Set as Active Popup
                        </div>
                      </label>
                    </div>

                  </div>
                </div>
              </div>

              <div className="mt-8 flex justify-end gap-3 pt-5 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-6 py-2.5 rounded-xl text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:text-white hover:bg-gray-100 dark:bg-gray-700 font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-8 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-gray-900 dark:text-white font-semibold shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Saving...
                    </>
                  ) : 'Save Popup'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default Popups;
