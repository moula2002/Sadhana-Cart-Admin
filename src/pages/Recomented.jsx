import React, { useEffect, useState } from 'react';
import { getFirestore, collection, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { Package, Eye, Trash2, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const RecommendedProducts = () => {
  const [recommended, setRecommended] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const db = getFirestore();
    const colRef = collection(db, 'products');

    const unsub = onSnapshot(colRef, (snapshot) => {
      const items = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(item => item.recommended === true);

      setRecommended(items);
      setLoading(false);
    }, (err) => {
      console.error('products snapshot error:', err);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const handleView = (item) => {
    navigate('/');
  };

  const handleRemoveRecommended = async (itemId) => {
    if (!window.confirm('Remove this product from recommended?')) return;

    try {
      const db = getFirestore();
      const productRef = doc(db, 'products', itemId);

      await updateDoc(productRef, {
        recommended: false,
        updatedAt: new Date()
      });

      setRecommended(prev => prev.filter(p => p.id !== itemId));
    } catch (error) {
      console.error('Error removing recommended product:', error);
      alert('Failed to remove recommended product');
    }
  };

  return (
    <div className="p-6">
      <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 rounded-2xl border border-gray-700/50 p-6">

        <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
          <Zap className="text-yellow-400" />
          Recommended Products
        </h2>

        {loading ? (
          <div className="text-gray-400">Loading...</div>
        ) : recommended.length === 0 ? (
          <div className="text-gray-400">No recommended products.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">

              <thead className="text-xs text-gray-300 uppercase tracking-wider border-b border-gray-700/50">
                <tr>
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3">Price</th>
                  <th className="px-4 py-3">Seller</th>
                  <th className="px-4 py-3">Stock</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-700/50">
                {recommended.map(item => (
                  <tr key={item.id} className="hover:bg-gray-800/30 transition-colors">

                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gray-700 rounded-lg overflow-hidden">
                          {item.images?.[0] ? (
                            <img
                              src={item.images[0]}
                              alt="product"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                              <Package />
                            </div>
                          )}
                        </div>

                        <div>
                          <div className="text-white font-medium">{item.name}</div>
                          <div className="text-sm text-gray-400">{item.category}</div>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3 text-white">₹{item.price ?? 0}</td>

                    <td className="px-4 py-3 text-gray-400">
                      {item.sellerid || 'Admin'}
                    </td>

                    <td className="px-4 py-3 text-gray-400">
                      {item.stock ?? 0}
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">

                        <button
                          onClick={() => handleView(item)}
                          className="p-2 rounded-lg text-blue-400 hover:bg-blue-500/10"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => handleRemoveRecommended(item.id)}
                          className="p-2 rounded-lg text-red-400 hover:bg-red-500/10"
                        >
                          <Trash2 className="w-4 h-4" />
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
    </div>
  );
};

export default RecommendedProducts;