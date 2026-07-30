import React, { useEffect, useState } from 'react';
import { getFirestore, collection, onSnapshot, doc, deleteDoc, updateDoc, setDoc, getDoc } from 'firebase/firestore';
import { Package, Eye, Trash2, Clock, Save } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const BestArrivals = () => {
  const [bestArrivals, setBestArrivals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timerDate, setTimerDate] = useState('');
  const [savedTimer, setSavedTimer] = useState(null);
  const [savingTimer, setSavingTimer] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const db = getFirestore();
    const colRef = collection(db, 'bestArrivals');

    const unsub = onSnapshot(colRef, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setBestArrivals(items);
      setLoading(false);
    }, (err) => {
      console.error('bestArrivals snapshot error:', err);
      setLoading(false);
    });

    // Fetch existing timer config
    const fetchTimerConfig = async () => {
      try {
        const timerDoc = await getDoc(doc(db, 'settings', 'bestArrivalsConfig'));
        if (timerDoc.exists() && timerDoc.data().targetDate) {
          // Convert from Firestore timestamp or ISO string to input format
          const date = new Date(timerDoc.data().targetDate);
          setSavedTimer(date);
          
          // Format for datetime-local input: YYYY-MM-DDThh:mm
          const formattedDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0,16);
          setTimerDate(formattedDate);
        }
      } catch (err) {
        console.error('Error fetching timer config:', err);
      }
    };
    fetchTimerConfig();

    return () => unsub();
  }, []);

  const handleSaveTimer = async () => {
    if (!timerDate) {
      alert("Please select a date and time.");
      return;
    }
    
    setSavingTimer(true);
    try {
      const db = getFirestore();
      const newTargetDate = new Date(timerDate).toISOString();
      await setDoc(doc(db, 'settings', 'bestArrivalsConfig'), {
        targetDate: newTargetDate,
        updatedAt: new Date()
      }, { merge: true });
      setSavedTimer(new Date(timerDate));
      alert("Timer configuration saved successfully!");
    } catch (err) {
      console.error('Error saving timer config:', err);
      alert("Failed to save timer configuration.");
    } finally {
      setSavingTimer(false);
    }
  };

  const handleView = (item) => {
    navigate('/');
  };

  const handleRemoveBestArrival = async (itemId) => {
    if (!window.confirm('Remove this product from flash deals?')) return;
    try {
      const db = getFirestore();
      
      // Delete from bestArrivals collection
      await deleteDoc(doc(db, 'bestArrivals', itemId));

      // Update products document to clear isBestArrival flag
      const productRef = doc(db, 'products', itemId);
      try {
        await updateDoc(productRef, {
          isBestArrival: false,
          updatedAt: new Date()
        });
      } catch (err) {
        console.warn('Could not update products doc after removing best arrival:', err.message || err);
      }

      setBestArrivals(prev => prev.filter(f => f.id !== itemId));
    } catch (error) {
      console.error('Error removing best arrival product:', error);
      alert('Failed to remove flash deals product');
    }
  };

  return (
    <div className="p-6">
      
      {/* Timer Configuration Section */}
      <div className="bg-gradient-to-br from-white/80 dark:from-gray-800/50 to-gray-50/80 dark:to-gray-900/50 rounded-2xl border border-gray-200 dark:border-gray-700/50 p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-blue-400" />
          Timer Configuration
        </h2>
        <div className="flex flex-col sm:flex-row gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
              Offer End Date & Time
            </label>
            <input
              type="datetime-local"
              value={timerDate}
              onChange={(e) => setTimerDate(e.target.value)}
              className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
            />
          </div>
          <button
            onClick={handleSaveTimer}
            disabled={savingTimer}
            className="bg-blue-600 hover:bg-blue-700 text-gray-900 dark:text-white px-6 py-2 rounded-lg flex items-center gap-2 disabled:opacity-50 transition-colors"
          >
            <Save className="w-4 h-4" />
            {savingTimer ? "Saving..." : "Save Timer"}
          </button>
        </div>
        
        {savedTimer && (
          <div className="mt-4 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center gap-2">
            <span className="text-gray-500 dark:text-gray-400 text-sm">Currently Active Timer:</span>
            <span className="text-green-400 font-medium">
              {savedTimer.toLocaleString('en-US', {
                dateStyle: 'medium',
                timeStyle: 'short'
              })}
            </span>
          </div>
        )}
      </div>

      <div className="bg-gradient-to-br from-white/80 dark:from-gray-800/50 to-gray-50/80 dark:to-gray-900/50 rounded-2xl border border-gray-200 dark:border-gray-700/50 p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Flash Deals</h2>

        {loading ? (
          <div className="text-gray-500 dark:text-gray-400">Loading...</div>
        ) : bestArrivals.length === 0 ? (
          <div className="text-gray-500 dark:text-gray-400">No flash deals products.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="text-xs text-gray-700 dark:text-gray-300 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700/50">
                <tr>
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3">Price</th>
                  <th className="px-4 py-3">Seller</th>
                  <th className="px-4 py-3">Order</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700/50">
                {bestArrivals.map(item => (
                  <tr key={item.id} className="hover:bg-white/60 dark:bg-gray-800/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden">
                          {item.images?.[0] ? (
                            <img src={item.images[0]} alt={`Image`} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-500 dark:text-gray-400"><Package /></div>
                          )}
                        </div>
                        <div>
                          <div className="text-gray-900 dark:text-white font-medium">{item.name}</div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">{item.bestArrivalInfo?.title || ''}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-900 dark:text-white">₹{item.price ?? 0}</td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{item.sellerid || 'N/A'}</td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{item.bestArrivalInfo?.displayOrder ?? '-'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => handleView(item)} className="p-2 rounded-lg text-blue-400 hover:bg-blue-500/10">
                          <Eye className="w-4 h-4" />
                        </button>

                        <button onClick={() => handleRemoveBestArrival(item.id)} className="p-2 rounded-lg text-red-400 hover:bg-red-500/10">
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

export default BestArrivals;
