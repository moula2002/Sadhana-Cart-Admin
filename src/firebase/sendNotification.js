/**
 * This file is the browser-friendly bridge for sending notifications.
 * It handles logic for both Local Development and Vercel Production.
 */

// Use local admin server port 4000 for dev, or relative /api for production
const IS_DEV = import.meta.env.DEV;
const SERVER_URL = 'https://sadhanacart-l0ew.onrender.com/send-notification';

/**
 * Sends a notification via the relevant backend (Local Server or Vercel Function)
 */
export const sendNotification = async (token, title, body) => {
    try {
        const response = await fetch(SERVER_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token, title, body })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Server error');
        }
        
        return await response.json();
    } catch (error) {
        console.error('sendNotification error:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Sends a topic notification via the relevant backend
 */
export const sendTopicNotification = async (topic, title, body, data = {}) => {
    try {
        const response = await fetch(SERVER_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ topic, title, body, data })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Server error');
        }

        return await response.json();
    } catch (error) {
        console.error('sendTopicNotification error:', error);
        return { success: false, error: error.message };
    }
};

export default sendNotification;
