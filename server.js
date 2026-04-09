import http from 'http';
import { sendNotification, sendTopicNotification } from './src/firebase/sendNotificationAdmin.js';
import dotenv from "dotenv";
dotenv.config();

const PORT = 4000;

const server = http.createServer(async (req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    if (req.method === 'POST' && req.url === '/send-notification') {
        let bodyContent = '';
        req.on('data', chunk => {
            bodyContent += chunk.toString();
        });

        req.on('end', async () => {
            try {
                const data = JSON.parse(bodyContent);
                const { token, topic, title, body, data: extraData } = data;

                console.log('--- New Notification Request ---');
                console.log('Target:', topic ? `Topic: ${topic}` : `Token: ${token}`);
                console.log('Title:', title);
                console.log('Body:', body);

                let result;
                if (topic) {
                    result = await sendTopicNotification(topic, title, body, extraData || {});
                } else if (token) {
                    result = await sendNotification(token, title, body);
                } else {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, error: 'Missing token or topic' }));
                    return;
                }

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(result));
            } catch (error) {
                console.error('Server error:', error);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: error.message }));
            }
        });
    } else {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('Sadhana Cart Admin Notification Server is running.\n');
    }
});

server.listen(PORT, () => {
    console.log(`\n🚀 Admin Server started successfully!`);
    console.log(`📍 Listening at http://localhost:${PORT}`);
    console.log(`🔧 Endpoint: POST http://localhost:${PORT}/send-notification`);
    console.log(`📄 API expects: { "token": "...", "title": "...", "body": "..." } OR { "topic": "...", "title": "...", "body": "..." }\n`);
});
