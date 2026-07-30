import React, { useState, useEffect } from 'react';
import { getFirestore, collection, addDoc, getDocs, doc, deleteDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { Plus, X, Edit, Trash2, CheckCircle, XCircle } from 'lucide-react';

const StickyHeader = () => {

  const [adsData, setAdsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    content: '',
    link: '',
    isActive: true
  });
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    const db = getFirestore();
    const colRef = collection(db, 'stickyHeader');

    const unsub = onSnapshot(colRef, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAdsData(items);
      setLoading(false);
    }, (err) => {
      console.error('stickyHeader snapshot error:', err);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleOpenModal = (ad = null) => {
    if (ad) {
      setFormData({
        content: ad.content || '',
        link: ad.link || '',
        isActive: ad.isActive ?? true
      });
      setEditingId(ad.id);
    } else {
      setFormData({
        content: '',
        link: '',
        isActive: true
      });
      setEditingId(null);
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.content.trim()) return;

    try {
      const db = getFirestore();
      if (editingId) {
        await updateDoc(doc(db, 'stickyHeader', editingId), {
          ...formData,
          updatedAt: new Date().toISOString()
        });
      } else {
        await addDoc(collection(db, 'stickyHeader'), {
          ...formData,
          createdAt: new Date().toISOString()
        });
      }
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error saving ad content:', error);
      alert('Failed to save ad content');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this ad?')) return;
    try {
      const db = getFirestore();
      await deleteDoc(doc(db, 'stickyHeader', id));
    } catch (error) {
      console.error('Error deleting ad:', error);
      alert('Failed to delete ad');
    }
  };

  const toggleStatus = async (ad) => {
    try {
      const db = getFirestore();
      await updateDoc(doc(db, 'stickyHeader', ad.id), {
        isActive: !ad.isActive,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Sticky Header Ads</h2>
          <p className="text-gray-500 dark:text-gray-400">Manage promotional content for the website's top sticky header</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="bg-blue-600 hover:bg-blue-700 text-gray-900 dark:text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus size={20} />
          Add Content
        </button>
      </div>

      <div className="bg-gradient-to-br from-white/80 dark:from-gray-800/50 to-gray-50/80 dark:to-gray-900/50 rounded-2xl border border-gray-200 dark:border-gray-700/50 p-6">
        {loading ? (
          <div className="text-gray-500 dark:text-gray-400">Loading...</div>
        ) : adsData.length === 0 ? (
          <div className="text-gray-500 dark:text-gray-400 text-center py-8">No ads content found. Click "Add Content" to create one.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="text-xs text-gray-500 dark:text-gray-400 uppercase bg-white/90 dark:bg-gray-800/80 border-b border-gray-200 dark:border-gray-700/50">
                <tr>
                  <th className="px-4 py-3 rounded-tl-lg">Content</th>
                  <th className="px-4 py-3">Link</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 rounded-tr-lg text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700/50">
                {adsData.map(ad => (
                  <tr key={ad.id} className="hover:bg-white/60 dark:bg-gray-800/30 transition-colors">
                    <td className="px-4 py-4 text-gray-900 dark:text-white">
                      <div className="font-medium">{ad.content}</div>
                    </td>
                    <td className="px-4 py-4 text-gray-500 dark:text-gray-400">
                      {ad.link ? (
                        <a href={ad.link} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline">
                          {ad.link}
                        </a>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <button
                        onClick={() => toggleStatus(ad)}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                          ad.isActive
                            ? 'bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20'
                            : 'bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20'
                        }`}
                      >
                        {ad.isActive ? <CheckCircle size={14} /> : <XCircle size={14} />}
                        {ad.isActive ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenModal(ad)}
                          className="p-2 bg-blue-600/10 text-blue-400 hover:bg-blue-600 hover:text-gray-900 dark:text-white rounded-lg transition-colors border border-blue-600/20"
                          title="Edit"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(ad.id)}
                          className="p-2 bg-red-600/10 text-red-400 hover:bg-red-600 hover:text-gray-900 dark:text-white rounded-lg transition-colors border border-red-600/20"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-2xl mx-auto max-h-[90vh] overflow-y-auto custom-scrollbar shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                {editingId ? 'Edit Ad Content' : 'Add Ad Content'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:text-white transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Ad Content Text *
                </label>
                <input
                  type="text"
                  name="content"
                  value={formData.content}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
                  placeholder="e.g. Get 20% off on all products!"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Link URL (Optional)
                </label>
                <input
                  type="url"
                  name="link"
                  value={formData.link}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
                  placeholder="https://example.com/offer"
                />
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="isActive"
                  name="isActive"
                  checked={formData.isActive}
                  onChange={handleInputChange}
                  className="w-5 h-5 bg-gray-50 dark:bg-gray-900 border-gray-300 dark:border-gray-600 rounded text-blue-600 focus:ring-blue-500 focus:ring-offset-gray-800"
                />
                <label htmlFor="isActive" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Set as Active
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl hover:bg-gray-100 dark:bg-gray-600 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 bg-blue-600 text-gray-900 dark:text-white rounded-xl hover:bg-blue-700 transition-colors font-medium"
                >
                  {editingId ? 'Update' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #9ca3af; border-radius: 10px; }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb { background: #4b5563; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #6b7280; }
      `}</style>
    </div>
  );
};
export default StickyHeader;
