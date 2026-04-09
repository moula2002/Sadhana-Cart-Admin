import admin from "firebase-admin";
import { createRequire } from "module";
import dotenv from "dotenv";
dotenv.config();

const require = createRequire(import.meta.url);
const serviceAccount = {
  type: "service_account",
  project_id: process.env.FIREBASE_PROJECT_ID,
  private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
  private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  client_id: process.env.FIREBASE_CLIENT_ID,
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url: "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40sadhana-cart.iam.gserviceaccount.com",
  universe_domain: "googleapis.com"
};

// Initialize Firebase Admin SDK if not already initialized
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

/**
 * Sends a notification to a specific device token (Backend ONLY)
 */
export const sendNotification = async (token, title, body) => {
  const message = {
    token: token,
    notification: {
      title: title,
      body: body,
    },
    android: {
      notification: {
        icon: 'ic_launcher', // Matches your Flutter app's launcher icon
        color: '#1E40AF',    // Optional: Primary color for the icon background
        sound: 'default'
      }
    },
    apns: {
      payload: {
        aps: {
          sound: 'default',
          badge: 1
        }
      }
    }
  };

  try {
    const response = await admin.messaging().send(message);
    console.log("Notification sent successfully:", response);
    return { success: true, response };
  } catch (error) {
    console.error("Notification error:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Sends a notification to a specific topic (Backend ONLY)
 */
export const sendTopicNotification = async (topic, title, body, data = {}) => {
  const message = {
    topic: topic,
    notification: {
      title: title,
      body: body
    },
    data: data,
    android: {
      notification: {
        icon: 'ic_launcher',
        color: '#1E40AF',
        sound: 'default'
      }
    },
    apns: {
      payload: {
        aps: {
          sound: 'default',
          badge: 1
        }
      }
    }
  };

  try {
    const response = await admin.messaging().send(message);
    console.log(`Notification sent to topic ${topic} successfully:`, response);
    return { success: true, response };
  } catch (error) {
    console.error(`Topic notification error (${topic}):`, error);
    return { success: false, error: error.message };
  }
};

