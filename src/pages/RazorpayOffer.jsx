import React, { useEffect, useState } from "react";
import { db } from "../firebase/config";
import { collection, getDocs, doc, setDoc } from "firebase/firestore";
import { 
  Settings, 
  PlusCircle, 
  Tag, 
  CheckCircle, 
  AlertCircle, 
  Layers, 
  CreditCard, 
  Activity,
  ArrowRight,
  Trash2
} from "lucide-react";
import { deleteDoc } from "firebase/firestore";

function RazorpayOffer() {
  const [offers, setOffers] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(true);

  const [offer, setOffer] = useState({
    offerId: "",
    offerName: "",
    displayText1: "",
    terms: "",
    offerUsage: "",
    onOfferFailure: "",
    checkoutVisibility: "",
    minPayment: "",
    maxPayment: "",
    startOfOffer: "",
    expiryOfOffer: "",
    offerType: "",
    bankName: "",
    maximumUsage: "",
    discountType: "",
    discountWorth: "",
    maxCashback: "",
    offerLevelUsageLimit: "",
    status: "Enabled",
    isBankOffer: false,
  });

  useEffect(() => {
    fetchOffers();
  }, []);

  const fetchOffers = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "razorpay_offers"));
      const list = querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setOffers(list);
    } catch (error) {
      console.error("Error fetching offers:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (item) => {
    setSelectedId(item.id);
    setOffer({ ...item, offerId: item.id });
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setOffer((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSave = async () => {
    try {
      const id = offer.offerId;
      if (!id) { alert("Please enter Offer ID"); return; }

      const docRef = doc(db, "razorpay_offers", id);
      await setDoc(docRef, offer, { merge: true });

      alert("✨ Offer successfully updated!");
      fetchOffers();
      resetForm();
    } catch (error) {
      console.error("Error saving offer:", error);
      alert("Error saving offer");
    }
  };

  const handleDelete = async (idToDelete) => {
    const id = idToDelete || selectedId;
    if (!id) return;
    
    if (!window.confirm("🗑️ Are you sure you want to permanently delete this offer configuration?")) return;
    
    try {
      await deleteDoc(doc(db, "razorpay_offers", id));
      alert("🗑️ Offer deleted successfully!");
      fetchOffers();
      if (id === selectedId) resetForm();
    } catch (error) {
      console.error("Error deleting offer:", error);
      alert("Error deleting offer");
    }
  };

  const resetForm = () => {
    setSelectedId(null);
    setOffer({
      offerId: "",
      offerName: "",
      displayText1: "",
      terms: "",
      offerUsage: "",
      onOfferFailure: "",
      checkoutVisibility: "",
      minPayment: "",
      maxPayment: "",
      startOfOffer: "",
      expiryOfOffer: "",
      offerType: "",
      bankName: "",
      maximumUsage: "",
      discountType: "",
      discountWorth: "",
      maxCashback: "",
      offerLevelUsageLimit: "",
      status: "Enabled",
      isBankOffer: false
    });
  };

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-gray-900">
      <div className="relative flex flex-col items-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-blue-500 border-opacity-20"></div>
        <div className="absolute animate-spin rounded-full h-16 w-16 border-t-4 border-blue-500 border-solid"></div>
        <p className="mt-4 text-gray-400 font-medium animate-pulse">Initializing Gateway Catalog...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-4 lg:p-8 font-sans">
      <div className="max-w-7xl mx-auto">
        
        {/* --- Header Section --- */}
        <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-blue-500 to-cyan-500 p-2.5 rounded-xl shadow-lg shadow-blue-500/20 text-white">
                <CreditCard size={24} />
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-white bg-gradient-to-r from-green-400 to-blue-400 bg-clip-text text-transparent italic">
                Payment Gateway Offers
              </h1>
            </div>
            <p className="text-gray-400 font-medium pl-1">Configure and manage Razorpay promotion IDs</p>
          </div>
          <button 
            onClick={resetForm}
            className="flex items-center justify-center gap-2 bg-gray-700/50 hover:bg-gray-700 text-white font-bold px-8 py-3.5 rounded-2xl border border-gray-600 shadow-xl transition-all duration-300 hover:scale-105 active:scale-95 group"
          >
            <PlusCircle size={20} className="text-blue-400 group-hover:rotate-90 transition-transform" /> 
            New Configuration
          </button>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* --- LEFT: OFFERS LIST --- */}
          <div className="lg:col-span-5 space-y-5">
            <div className="flex items-center justify-between px-2">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
                <Layers size={14} className="text-blue-400" /> Active Catalog
              </h3>
              <span className="bg-gray-800 text-blue-400 text-xs font-bold px-3 py-1 rounded-full border border-gray-700">{offers.length}</span>
            </div>
            
            <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-3 custom-scrollbar p-1">
              {offers.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleEdit(item)}
                  className={`group relative p-6 rounded-3xl border transition-all cursor-pointer overflow-hidden backdrop-blur-md
                    ${selectedId === item.id 
                      ? 'bg-blue-500/10 border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.2)]' 
                      : 'bg-gray-800/40 border-gray-700 shadow-lg hover:border-gray-500/50 hover:bg-gray-800/60'}`}
                >
                  <div className="flex justify-between items-start relative z-10">
                    <div>
                      <h4 className={`text-lg font-bold transition-colors ${selectedId === item.id ? 'text-blue-400' : 'text-gray-100'}`}>
                        {item.offerName || "Untitled Offer"}
                      </h4>
                      <code className="text-[10px] bg-gray-900/50 text-gray-500 border border-gray-700 px-2.5 py-1 rounded-lg mt-2 inline-block font-mono tracking-wider">
                        {item.id}
                      </code>
                    </div>
                    <div className="text-right flex flex-col items-end gap-2">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(item.id);
                        }}
                        className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl transition-all opacity-0 group-hover:opacity-100 border border-red-500/10"
                        title="Quick Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                      <div>
                        <span className="block text-xl font-black text-white leading-none tracking-tight">{item.discountWorth}</span>
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mt-1">{item.discountType}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-5 flex items-center justify-between border-t border-gray-700/50 pt-4">
                    <div className="flex items-center gap-2.5">
                      <div className={`h-2.5 w-2.5 rounded-full shadow-lg ${item.status === 'Enabled' ? 'bg-green-500 shadow-green-500/20' : 'bg-gray-600'}`}></div>
                      <span className={`text-xs font-bold ${item.status === 'Enabled' ? 'text-green-400' : 'text-gray-500'}`}>{item.status}</span>
                    </div>
                    {item.isBankOffer && (
                      <span className="text-[10px] bg-amber-500/10 text-amber-500 border border-amber-500/20 font-black px-2.5 py-1 rounded-lg uppercase tracking-wider">Bank Only</span>
                    )}
                  </div>
                </div>
              ))}
              {offers.length === 0 && (
                <div className="text-center py-10 border-2 border-dashed border-gray-700 rounded-3xl">
                  <CreditCard className="mx-auto text-gray-600 mb-3 opacity-20" size={40} />
                  <p className="text-gray-500 font-medium">No offers configured yet</p>
                </div>
              )}
            </div>
          </div>

          {/* --- RIGHT: CONFIGURATION FORM --- */}
          <div className="lg:col-span-7">
            <div className="bg-gray-800/50 border border-gray-700 rounded-[2.5rem] shadow-2xl overflow-hidden backdrop-blur-lg sticky top-8">
              <div className="bg-gradient-to-r from-gray-900 to-gray-800 px-10 py-8 text-white flex justify-between items-center border-b border-gray-700">
                <div className="space-y-1">
                  <h2 className="text-2xl font-bold flex items-center gap-3">
                    <Settings className="text-blue-400 animate-spin-slow" size={24} /> 
                    {selectedId ? "Update Configuration" : "New Promotion Setup"}
                  </h2>
                  <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">Global parameters & rules</p>
                </div>
                <Activity size={24} className="text-gray-700" />
              </div>
              
              <div className="p-8 md:p-10 space-y-8">
                {/* ID Input Section */}
                <div className="p-6 bg-blue-500/5 rounded-3xl border border-blue-500/20 mb-2 group focus-within:border-blue-500/40 transition-all">
                  <label className="block text-xs font-bold text-blue-400 uppercase mb-3 tracking-[0.2em]">Razorpay Offer ID (Primary Key)</label>
                  <div className="relative">
                    <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-500/50" size={18} />
                    <input
                      name="offerId"
                      value={offer.offerId}
                      onChange={handleChange}
                      placeholder="e.g., offer_Nl8W5jH2x9Pq"
                      className="w-full bg-gray-900/50 text-white pl-12 pr-4 py-4 rounded-2xl border border-blue-500/10 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none font-mono text-blue-400 font-bold tracking-wider placeholder:text-gray-700 transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2.5">Offer Name</label>
                    <input
                      name="offerName"
                      value={offer.offerName}
                      onChange={handleChange}
                      placeholder="e.g. FLAT 10% OFF"
                      className="w-full bg-gray-700/30 text-white px-5 py-4 rounded-2xl border border-gray-600 focus:border-blue-500 outline-none transition-all placeholder:text-gray-600"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2.5">Display Text</label>
                    <input
                      name="displayText1"
                      value={offer.displayText1}
                      onChange={handleChange}
                      placeholder="Visible to customer during checkout"
                      className="w-full bg-gray-700/30 text-white px-5 py-4 rounded-2xl border border-gray-600 focus:border-blue-500 outline-none transition-all placeholder:text-gray-600"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2.5">Terms & Conditions</label>
                    <textarea
                      name="terms"
                      value={offer.terms}
                      onChange={handleChange}
                      placeholder="Detailed offer rules..."
                      className="w-full bg-gray-700/30 text-white px-5 py-4 rounded-2xl border border-gray-600 focus:border-blue-500 outline-none transition-all min-h-[100px] placeholder:text-gray-600 resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2.5">Offer Usage</label>
                    <input
                      name="offerUsage"
                      value={offer.offerUsage}
                      onChange={handleChange}
                      placeholder="e.g. single_use"
                      className="w-full bg-gray-700/30 text-white px-5 py-4 rounded-2xl border border-gray-600 focus:border-blue-500 outline-none placeholder:text-gray-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2.5">Failure Action</label>
                    <select
                      name="onOfferFailure"
                      value={offer.onOfferFailure}
                      onChange={handleChange}
                      className="w-full bg-gray-700/30 text-white px-5 py-4 rounded-2xl border border-gray-600 focus:border-blue-500 outline-none appearance-none cursor-pointer"
                    >
                      <option value="" className="bg-gray-800">Select Action</option>
                      <option value="continue" className="bg-gray-800">Continue Payment</option>
                      <option value="abort" className="bg-gray-800">Abort Session</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2.5">Visibility</label>
                    <select
                      name="checkoutVisibility"
                      value={offer.checkoutVisibility}
                      onChange={handleChange}
                      className="w-full bg-gray-700/30 text-white px-5 py-4 rounded-2xl border border-gray-600 focus:border-blue-500 outline-none appearance-none cursor-pointer"
                    >
                      <option value="show" className="bg-gray-800">Visible</option>
                      <option value="hide" className="bg-gray-800">Hidden</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2.5">Min Payment (₹)</label>
                    <input
                      type="number"
                      name="minPayment"
                      value={offer.minPayment}
                      onChange={handleChange}
                      placeholder="0.00"
                      className="w-full bg-gray-700/30 text-white px-5 py-4 rounded-2xl border border-gray-600 focus:border-blue-500 outline-none placeholder:text-gray-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2.5">Max Payment (₹)</label>
                    <input
                      type="number"
                      name="maxPayment"
                      value={offer.maxPayment}
                      onChange={handleChange}
                      placeholder="N/A"
                      className="w-full bg-gray-700/30 text-white px-5 py-4 rounded-2xl border border-gray-600 focus:border-blue-500 outline-none placeholder:text-gray-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2.5">Valid From</label>
                    <input
                      type="datetime-local"
                      name="startOfOffer"
                      value={offer.startOfOffer}
                      onChange={handleChange}
                      className="w-full bg-gray-700/30 text-white px-5 py-4 rounded-2xl border border-gray-600 focus:border-blue-500 outline-none [color-scheme:dark]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2.5">Valid Till</label>
                    <input
                      type="datetime-local"
                      name="expiryOfOffer"
                      value={offer.expiryOfOffer}
                      onChange={handleChange}
                      className="w-full bg-gray-700/30 text-white px-5 py-4 rounded-2xl border border-gray-600 focus:border-blue-500 outline-none [color-scheme:dark]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2.5">Gateway Type</label>
                    <input
                      name="offerType"
                      value={offer.offerType}
                      onChange={handleChange}
                      placeholder="e.g. instant"
                      className="w-full bg-gray-700/30 text-white px-5 py-4 rounded-2xl border border-gray-600 focus:border-blue-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2.5">Target Bank</label>
                    <input
                      name="bankName"
                      value={offer.bankName}
                      onChange={handleChange}
                      placeholder="e.g. HDFC"
                      className="w-full bg-gray-700/30 text-white px-5 py-4 rounded-2xl border border-gray-600 focus:border-blue-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2.5">Maximum Usage</label>
                    <input
                      type="number"
                      name="maximumUsage"
                      value={offer.maximumUsage}
                      onChange={handleChange}
                      placeholder="Limit"
                      className="w-full bg-gray-700/30 text-white px-5 py-4 rounded-2xl border border-gray-600 focus:border-blue-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2.5">Discount Logic</label>
                    <select
                      name="discountType"
                      value={offer.discountType}
                      onChange={handleChange}
                      className="w-full bg-gray-700/30 text-white px-5 py-4 rounded-2xl border border-gray-600 focus:border-blue-500 outline-none appearance-none cursor-pointer"
                    >
                      <option value="percentage" className="bg-gray-800">Percentage %</option>
                      <option value="flat" className="bg-gray-800">Flat Amount ₹</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2.5">Worth</label>
                    <input
                      type="number"
                      name="discountWorth"
                      value={offer.discountWorth}
                      onChange={handleChange}
                      placeholder="Value"
                      className="w-full bg-gray-700/30 text-white px-5 py-4 rounded-2xl border border-gray-600 focus:border-blue-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2.5">Max Cashback (₹)</label>
                    <input
                      type="number"
                      name="maxCashback"
                      value={offer.maxCashback}
                      onChange={handleChange}
                      placeholder="0.00"
                      className="w-full bg-gray-700/30 text-white px-5 py-4 rounded-2xl border border-gray-600 focus:border-blue-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2.5">User Limit</label>
                    <input
                      type="number"
                      name="offerLevelUsageLimit"
                      value={offer.offerLevelUsageLimit}
                      onChange={handleChange}
                      className="w-full bg-gray-700/30 text-white px-5 py-4 rounded-2xl border border-gray-600 focus:border-blue-500 outline-none"
                      placeholder="1"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2.5">Status</label>
                    <select
                      name="status"
                      value={offer.status}
                      onChange={handleChange}
                      className="w-full bg-gray-700/30 text-white px-5 py-4 rounded-2xl border border-gray-600 focus:border-blue-500 outline-none appearance-none cursor-pointer"
                    >
                      <option value="Enabled" className="bg-gray-800">🟢 Enabled</option>
                      <option value="Disabled" className="bg-gray-800">⚪ Disabled</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-center md:justify-start pt-4">
                    <label className="flex items-center gap-4 cursor-pointer group bg-gray-700/20 px-6 py-4 rounded-2xl border border-gray-700/50 hover:border-blue-500/30 transition-all">
                      <div className="relative">
                        <input
                          type="checkbox"
                          name="isBankOffer"
                          checked={offer.isBankOffer}
                          onChange={handleChange}
                          className="sr-only peer"
                        />
                        <div className="w-14 h-7 bg-gray-700 rounded-full peer peer-checked:bg-blue-600 transition-all after:content-[''] after:absolute after:top-1 after:left-1 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-7 shadow-inner"></div>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-white tracking-wide">Bank Specific Promotion</span>
                        <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Restrict to specific issuers</span>
                      </div>
                    </label>
                  </div>
                </div>

                <div className="flex gap-5 pt-4">
                  <button 
                    onClick={handleSave} 
                    className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-black py-4.5 rounded-3xl transition-all shadow-xl shadow-blue-500/20 active:scale-[0.98] flex justify-center items-center gap-3 text-lg group"
                  >
                    {selectedId ? "Sync Changes" : "Deploy Promotion"} 
                    <ArrowRight size={22} className="group-hover:translate-x-1 transition-transform" />
                  </button>

                  {selectedId && (
                    <button 
                      onClick={handleDelete}
                      className="bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold px-8 rounded-3xl border border-red-500/20 transition-all active:scale-95 flex items-center justify-center group"
                      title="Delete Offer"
                    >
                      <Trash2 size={24} className="group-hover:scale-110 transition-transform" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Warning Footer */}
            <div className="mt-8 flex items-start gap-4 px-6 py-5 bg-amber-500/5 border border-amber-500/10 rounded-3xl">
              <AlertCircle className="text-amber-500 shrink-0 mt-0.5 shadow-glow-amber" size={20} />
              <p className="text-xs text-gray-400 leading-relaxed font-medium">
                <strong className="text-amber-400">Critical Note:</strong> Ensure the <strong className="text-white">Offer ID</strong> matches exactly with the one created in your Razorpay Dashboard. 
                Incorrect IDs will cause discrepancies between the calculated total and the actual payment amount processed by the gateway.
              </p>
            </div>
          </div>

        </div>
      </div>
      
      {/* Scrollbar CSS */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #374151; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #4b5563; }
        .shadow-glow { box-shadow: 0 0 15px rgba(59,130,246,0.3); }
        .shadow-glow-amber { filter: drop-shadow(0 0 5px rgba(245,158,11,0.3)); }
        .animate-spin-slow { animation: spin 4s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

export default RazorpayOffer;