import { db } from './config';
import { ref, onDisconnect, set, serverTimestamp, onValue, off } from 'firebase/database';
import { doc, onSnapshot, updateDoc, setDoc, serverTimestamp as firestoreTimestamp } from 'firebase/firestore';

/**
 * Real-time presence system using Firestore
 * Tracks user online/offline status
 */

// Track user's online status
export const updateUserPresence = async (userId) => {
  if (!userId) return;

  try {
    const userStatusRef = doc(db, 'users', userId);
    
    // Mark user as online
    await updateDoc(userStatusRef, {
      isOnline: true,
      lastSeen: firestoreTimestamp()
    });

    console.log('🟢 User marked as online:', userId);
  } catch (error) {
    console.error('❌ Error updating user presence:', error);
  }
};

// Mark user as offline
export const markUserOffline = async (userId) => {
  if (!userId) return;

  try {
    const userStatusRef = doc(db, 'users', userId);
    
    await updateDoc(userStatusRef, {
      isOnline: false,
      lastSeen: firestoreTimestamp()
    });

    console.log('🔴 User marked as offline:', userId);
  } catch (error) {
    console.error('❌ Error marking user offline:', error);
  }
};

// Subscribe to user's presence status
export const subscribeToUserPresence = (userId, callback) => {
  if (!userId) return () => {};

  const userStatusRef = doc(db, 'users', userId);
  
  const unsubscribe = onSnapshot(userStatusRef, (doc) => {
    if (doc.exists()) {
      const userData = doc.data();
      callback({
        isOnline: userData.isOnline || false,
        lastSeen: userData.lastSeen?.toDate() || null
      });
    } else {
      callback({ isOnline: false, lastSeen: null });
    }
  }, (error) => {
    console.error('❌ Error subscribing to user presence:', error);
    callback({ isOnline: false, lastSeen: null });
  });

  return unsubscribe;
};

// Subscribe to multiple users' presence
export const subscribeToMultipleUsersPresence = (userIds, callback) => {
  if (!userIds || !Array.isArray(userIds)) return () => {};

  const presenceData = {};
  const unsubscribes = [];

  userIds.forEach(userId => {
    if (!userId) return;

    const unsubscribe = subscribeToUserPresence(userId, (presence) => {
      presenceData[userId] = presence;
      callback(presenceData);
    });
    
    unsubscribes.push(unsubscribe);
  });

  // Return cleanup function
  return () => {
    unsubscribes.forEach(unsubscribe => unsubscribe());
  };
};

// Auto presence management for current user
export const setupAutoPresence = (userId) => {
  if (!userId) return () => {};

  let isActive = true;

  // Mark user as online when they open the app
  updateUserPresence(userId);

  // Handle visibility change
  const handleVisibilityChange = async () => {
    if (document.hidden) {
      // Tab is hidden - mark as offline after 30 seconds
      setTimeout(() => {
        if (document.hidden && isActive) {
          markUserOffline(userId);
          isActive = false;
        }
      }, 30000);
    } else {
      // Tab is visible - mark as online
      if (!isActive) {
        updateUserPresence(userId);
        isActive = true;
      }
    }
  };

  // Handle window focus/blur
  const handleFocus = () => {
    if (!isActive) {
      updateUserPresence(userId);
      isActive = true;
    }
  };

  const handleBlur = () => {
    // Mark as offline after 30 seconds of blur
    setTimeout(() => {
      if (document.hidden && isActive) {
        markUserOffline(userId);
        isActive = false;
      }
    }, 30000);
  };

  // Handle before unload (page close)
  const handleBeforeUnload = () => {
    markUserOffline(userId);
  };

  // Add event listeners
  document.addEventListener('visibilitychange', handleVisibilityChange);
  window.addEventListener('focus', handleFocus);
  window.addEventListener('blur', handleBlur);
  window.addEventListener('beforeunload', handleBeforeUnload);

  // Heartbeat - update every 5 minutes to show user is still active
  const heartbeatInterval = setInterval(() => {
    if (isActive && !document.hidden) {
      updateUserPresence(userId);
    }
  }, 300000);

  // Cleanup function
  return () => {
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    window.removeEventListener('focus', handleFocus);
    window.removeEventListener('blur', handleBlur);
    window.removeEventListener('beforeunload', handleBeforeUnload);
    clearInterval(heartbeatInterval);
    
    // Mark as offline on cleanup
    markUserOffline(userId);
  };
};