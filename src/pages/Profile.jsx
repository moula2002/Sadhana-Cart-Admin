import React, { useState } from 'react';
import { User, Mail, Phone, MapPin, Calendar, Edit, Save, X } from 'lucide-react';

const Profile = () => {
  // Mock user data - in real app this would come from authentication context
  const [user, setUser] = useState({
    name: 'Admin User',
    email: 'support@sadhanacart.com',
    phone: '+91 70195 12273',
    address: 'Ground Floor, Ward No. 24, A No. 4-14-155/36A, Teachers Colony, Near LIC Office, Gangawati – 583222, District Koppal, Karnataka.',
    joinDate: 'January 2024',
    avatar: null
  });

  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    phone: '',
    address: ''
  });

  const handleEditClick = () => {
    setEditForm({
      name: user.name,
      email: user.email,
      phone: user.phone,
      address: user.address
    });
    setIsEditing(true);
  };

  const handleSave = () => {
    setUser({
      ...user,
      name: editForm.name,
      email: editForm.email,
      phone: editForm.phone,
      address: editForm.address
    });
    setIsEditing(false);
    alert('Profile updated successfully!');
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditForm({
      name: '',
      email: '',
      phone: '',
      address: ''
    });
  };

  const handleInputChange = (field, value) => {
    setEditForm({
      ...editForm,
      [field]: value
    });
  };

  return (
    <div className="p-4 lg:p-6 bg-gray-900 h-full">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-white">Profile</h1>
          <div className="flex space-x-3">
            {isEditing ? (
              <>
                <button 
                  onClick={handleSave}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
                >
                  <Save size={20} />
                  <span>Save</span>
                </button>
                <button 
                  onClick={handleCancel}
                  className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
                >
                  <X size={20} />
                  <span>Cancel</span>
                </button>
              </>
            ) : (
              <button 
                onClick={handleEditClick}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
              >
                <Edit size={20} />
                <span>Edit Profile</span>
              </button>
            )}
          </div>
        </div>

        {/* Profile Card */}
        <div className="bg-gray-800 rounded-lg p-8">
          <div className="flex items-center space-x-6 mb-8">
            {/* Avatar */}
            <div className="w-24 h-24 bg-blue-500 rounded-full flex items-center justify-center">
              {user.avatar ? (
                <img src={user.avatar} alt="Profile" className="w-24 h-24 rounded-full object-cover" />
              ) : (
                <User size={40} className="text-white" />
              )}
            </div>
            
            {/* Basic Info */}
            <div className="flex-1">
              {isEditing ? (
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className="text-2xl font-bold bg-gray-600 text-white mb-2 p-2 rounded border border-gray-500 focus:border-blue-500 focus:outline-none w-full"
                />
              ) : (
                <h2 className="text-2xl font-bold text-white mb-2">{user.name}</h2>
              )}
              <p className="text-gray-400">Administrator</p>
            </div>
          </div>

          {/* Profile Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Email */}
            <div className="flex items-center space-x-4 p-4 bg-gray-700 rounded-lg">
              <div className="p-2 bg-blue-500 rounded-lg">
                <Mail size={20} className="text-white" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-400">Email</p>
                {isEditing ? (
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className="bg-gray-600 text-white font-medium p-2 rounded w-full border border-gray-500 focus:border-blue-500 focus:outline-none"
                  />
                ) : (
                  <p className="text-white font-medium">{user.email}</p>
                )}
              </div>
            </div>

            {/* Phone */}
            <div className="flex items-center space-x-4 p-4 bg-gray-700 rounded-lg">
              <div className="p-2 bg-green-500 rounded-lg">
                <Phone size={20} className="text-white" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-400">Phone</p>
                {isEditing ? (
                  <input
                    type="tel"
                    value={editForm.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    className="bg-gray-600 text-white font-medium p-2 rounded w-full border border-gray-500 focus:border-blue-500 focus:outline-none"
                  />
                ) : (
                  <p className="text-white font-medium">{user.phone}</p>
                )}
              </div>
            </div>

            {/* Address */}
            <div className="flex items-start space-x-4 p-4 bg-gray-700 rounded-lg">
              <div className="p-2 bg-purple-500 rounded-lg">
                <MapPin size={20} className="text-white" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-400">Address</p>
                {isEditing ? (
                  <textarea
                    value={editForm.address}
                    onChange={(e) => handleInputChange('address', e.target.value)}
                    className="bg-gray-600 text-white font-medium p-2 rounded w-full border border-gray-500 focus:border-blue-500 focus:outline-none resize-none"
                    rows="3"
                  />
                ) : (
                  <p className="text-white font-medium">{user.address}</p>
                )}
              </div>
            </div>

            {/* Join Date */}
            <div className="flex items-center space-x-4 p-4 bg-gray-700 rounded-lg">
              <div className="p-2 bg-orange-500 rounded-lg">
                <Calendar size={20} className="text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Member Since</p>
                <p className="text-white font-medium">{user.joinDate}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Activity Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          <div className="bg-gray-800 rounded-lg p-6 text-center">
            <h3 className="text-2xl font-bold text-blue-500 mb-2">150</h3>
            <p className="text-gray-400">Products Managed</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-6 text-center">
            <h3 className="text-2xl font-bold text-green-500 mb-2">89</h3>
            <p className="text-gray-400">Orders Processed</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-6 text-center">
            <h3 className="text-2xl font-bold text-purple-500 mb-2">12</h3>
            <p className="text-gray-400">Categories Created</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;