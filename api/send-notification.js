import admin from 'firebase-admin';

// Vercel Serverless Function
export default async function handler(req, res) {
    // Add CORS headers
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // Initialize Admin SDK
        if (!admin.apps.length) {
            let serviceAccount;
            
            // On Vercel, use Environment Variable
            if (process.env.FIREBASE_SERVICE_ACCOUNT) {
                serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
            } else {
                // Locally, try to find the file (Vercel won't have this because it's gitignored)
                // Note: In serverless environments, file paths can be tricky.
                // It's much better to use the ENV VAR approach for production.
                throw new Error("FIREBASE_SERVICE_ACCOUNT environment variable is not set");
            }

            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount)
            });
        }

        const { token, topic, title, body, data } = req.body;

        const message = {
            notification: { title, body },
            data: data || {},
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


        if (topic) {
            message.topic = topic;
        } else if (token) {
            message.token = token;
        } else {
            return res.status(400).json({ success: false, error: 'Missing token or topic' });
        }

        const response = await admin.messaging().send(message);
        return res.status(200).json({ success: true, response });

    } catch (error) {
        console.error('Vercel API Error:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
}
