import React, { useEffect, useState } from 'react';
import { getFirestore, collection, onSnapshot, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { Package, Eye, Trash2, Edit, Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const FeaturedProducts = () => {
  const [featured, setFeatured] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const db = getFirestore();
    const colRef = collection(db, 'featuredProducts');

    const unsub = onSnapshot(colRef, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setFeatured(items);
      setLoading(false);
    }, (err) => {
      console.error('featuredProducts snapshot error:', err);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const handleView = (item) => {
    // If there is a product page, navigate; otherwise do nothing
    // We'll attempt to open product details in '/': the Dashboard viewer can handle viewing by id if implemented.
    navigate('/');
    // Optionally, place logic to open modal via global state or query param.
  };

  const handleRemoveFeatured = async (itemId) => {
    if (!window.confirm('Remove this product from featured?')) return;
    try {
      const db = getFirestore();
      // Delete featuredProducts doc
      await deleteDoc(doc(db, 'featuredProducts', itemId));

      // Update products document to clear isFeatured flag
      const productRef = doc(db, 'products', itemId);
      try {
        await updateDoc(productRef, {
          isFeatured: false,
          productType: 'regular product',
          updatedAt: new Date()
        });
      } catch (err) {
        console.warn('Could not update products doc after removing featured:', err.message || err);
      }

      setFeatured(prev => prev.filter(f => f.id !== itemId));
    } catch (error) {
      console.error('Error removing featured product:', error);
      alert('Failed to remove featured product');
    }
  };

  return (
    <div className="p-6">
      <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 rounded-2xl border border-gray-700/50 p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Featured Products</h2>

        {loading ? (
          <div className="text-gray-400">Loading...</div>
        ) : featured.length === 0 ? (
          <div className="text-gray-400">No featured products.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="text-xs text-gray-300 uppercase tracking-wider border-b border-gray-700/50">
                <tr>
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3">Price</th>
                  <th className="px-4 py-3">Seller</th>
                  <th className="px-4 py-3">Order</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700/50">
                {featured.map(item => (
                  <tr key={item.id} className="hover:bg-gray-800/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gray-700 rounded-lg overflow-hidden">
                          {item.images?.[0] ? (
                            // eslint-disable-next-line jsx-a11y/img-redundant-alt
                            <img src={item.images[0]} alt={`Image`} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400"><Package /></div>
                          )}
                        </div>
                        <div>
                          <div className="text-white font-medium">{item.name}</div>
                          <div className="text-sm text-gray-400">{item.featuredProductInfo?.title || ''}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-white">₹{item.price ?? 0}</td>
                    <td className="px-4 py-3 text-gray-400">{item.sellerid || 'N/A'}</td>
                    <td className="px-4 py-3 text-gray-400">{item.featuredProductInfo?.displayOrder ?? '-'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => handleView(item)} className="p-2 rounded-lg text-blue-400 hover:bg-blue-500/10">
                          <Eye className="w-4 h-4" />
                        </button>

                        <button onClick={() => handleRemoveFeatured(item.id)} className="p-2 rounded-lg text-red-400 hover:bg-red-500/10">
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

export default FeaturedProducts;

