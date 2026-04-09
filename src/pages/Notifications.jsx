import React, { useState } from 'react';
import { Bell, Send, Trash2, RefreshCw, X } from 'lucide-react';
import { sendTopicNotification } from '../firebase/sendNotification';

const Notifications = () => {
    const [title, setTitle] = useState('');
    const [body, setBody] = useState('');
    const [screen, setScreen] = useState('home');
    const [loading, setLoading] = useState(false);
    const [history, setHistory] = useState([]);

    const handleSend = async (e) => {
        e.preventDefault();
        if (!title || !body) {
            alert('Please fill in both title and message');
            return;
        }

        if (window.confirm('This will send a push notification to ALL users. Continue?')) {
            try {
                setLoading(true);
                await sendTopicNotification(
                    'all_users',
                    title,
                    body,
                    { screen }
                );

                // Add to history (local only for now, could be persisted to Firestore)
                const newLog = {
                    id: Date.now(),
                    title,
                    body,
                    screen,
                    sentAt: new Date().toLocaleString()
                };
                setHistory([newLog, ...history]);

                setTitle('');
                setBody('');
                alert('Notification sent successfully!');
            } catch (error) {
                console.error('Error sending notification:', error);
                alert('Failed to send notification: ' + error.message);
            } finally {
                setLoading(false);
            }
        }
    };

    const clearHistory = () => {
        if (window.confirm('Clear your local history?')) {
            setHistory([]);
        }
    };

    return (
        <div className="p-6 bg-gray-900 min-h-screen">
            <div className="max-w-4xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                            <Bell className="text-blue-500" />
                            Push Notifications
                        </h1>
                        <p className="text-gray-400 mt-1">Broadcast messages to all customer apps</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Compose Section */}
                    <div className="bg-gray-800 rounded-2xl border border-gray-700 p-6 shadow-xl">
                        <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                            <Send size={20} className="text-green-500" />
                            Compose Announcement
                        </h2>

                        <form onSubmit={handleSend} className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Notification Title *</label>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="Enter attention-grabbing title"
                                    className="w-full bg-gray-900 border border-gray-600 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 transition-all"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Message Body *</label>
                                <textarea
                                    value={body}
                                    onChange={(e) => setBody(e.target.value)}
                                    placeholder="Enter the notification message contents..."
                                    rows="4"
                                    className="w-full bg-gray-900 border border-gray-600 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 transition-all resize-none"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Target Screen (Deep Link)</label>
                                <select
                                    value={screen}
                                    onChange={(e) => setScreen(e.target.value)}
                                    className="w-full bg-gray-900 border border-gray-600 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 transition-all"
                                >
                                    <option value="/homepage">Home Page</option>
                                    <option value="/notifications">Notification Center</option>
                                    <option value="/cart">User Cart</option>
                                    <option value="/orders">My Orders</option>
                                    <option value="/favourites">Wishlist / Favourites</option>
                                    <option value="/search">Search Products</option>
                                </select>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2"
                            >
                                {loading ? (
                                    <RefreshCw className="animate-spin" />
                                ) : (
                                    <Send size={18} />
                                )}
                                {loading ? 'Sending...' : 'Broadcast Notification Now'}
                            </button>
                        </form>
                    </div>

                    {/* Preview/History Section */}
                    <div className="space-y-6">
                        <div className="bg-gray-800 rounded-2xl border border-gray-700 p-6">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-lg font-semibold text-white">Recent Log</h2>
                                {history.length > 0 && (
                                    <button onClick={clearHistory} className="text-gray-400 hover:text-red-400 text-sm flex items-center gap-1">
                                        <Trash2 size={14} /> Clear
                                    </button>
                                )}
                            </div>

                            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                {history.length === 0 ? (
                                    <div className="text-center py-12 text-gray-500 border-2 border-dashed border-gray-700 rounded-xl">
                                        No recent notifications sent
                                    </div>
                                ) : (
                                    history.map((log) => (
                                        <div key={log.id} className="bg-gray-900 border border-gray-700 p-4 rounded-xl relative group">
                                            <div className="flex justify-between items-start mb-1">
                                                <h3 className="text-blue-400 font-bold">{log.title}</h3>
                                                <span className="text-[10px] text-gray-500">{log.sentAt}</span>
                                            </div>
                                            <p className="text-sm text-gray-300 line-clamp-2">{log.body}</p>
                                            <div className="mt-2 text-[10px] text-gray-500 uppercase tracking-widest">
                                                To: {log.screen}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Tip Box */}
                        <div className="bg-blue-600/10 border border-blue-500/30 rounded-2xl p-6">
                            <h3 className="text-blue-400 font-bold mb-2 flex items-center gap-2">
                                <Bell size={16} /> Pro Tip
                            </h3>
                            <p className="text-sm text-gray-400">
                                Broadcast notifications are sent to the "all_users" topic. 
                                Keep messages brief (under 120 characters) for better readability on lock screens.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Notifications;
