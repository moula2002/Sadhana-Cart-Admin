import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { messaging } from './config';

// FCM Token generate करना
export const generateToken = async () => {
  try {
    // Notification permission check करना
    const permission = await Notification.requestPermission();
    console.log('Notification permission:', permission);
    
    if (permission === 'granted') {
      const token = await getToken(messaging, {
        vapidKey: 'BGY0Eoylfn3ZeHntJRMbXYLlkJUzJyFTe0T7q2bkqE4la6a_GAhKroGstESMkrqsWZhSIYVmONRc86_rvcx9Kbc'
      });
      
      if (token) {
        console.log('FCM Token generated successfully:', token);
        return token;
      } else {
        console.log('No registration token available');
        return null;
      }
    } else {
      console.log('Notification permission denied');
      return null;
    }
  } catch (error) {
    console.error('Error getting FCM token:', error);
    return null;
  }
};

// Foreground messages handle करना
export const onMessageListener = () => {
  return new Promise((resolve) => {
    onMessage(messaging, (payload) => {
      console.log('Foreground message received:', payload);
      resolve(payload);
    });
  });
};

// Background message handler setup
export const setupBackgroundMessageHandler = () => {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/firebase-messaging-sw.js')
      .then((registration) => {
        console.log('Service Worker registered:', registration);
      })
      .catch((error) => {
        console.error('Service Worker registration failed:', error);
      });
  }
};

// Token refresh handler
export const onTokenRefresh = () => {
  // Token refresh logic यहां add करें जब जरूरत हो
  console.log('Token refresh handler setup');
};

export default {
  generateToken,
  onMessageListener,
  setupBackgroundMessageHandler,
  onTokenRefresh
};