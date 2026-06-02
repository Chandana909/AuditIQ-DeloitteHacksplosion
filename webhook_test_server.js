const http = require('http');

const server = http.createServer((req, res) => {
    // Add CORS headers so the browser doesn't block the request from Flowise
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'OPTIONS, POST');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    if (req.method === 'POST') {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', () => {
            console.log(`\n===========================================`);
            console.log(`[${new Date().toLocaleTimeString()}] Received POST from ${req.url}`);
            try {
                console.log(JSON.stringify(JSON.parse(body), null, 2));
            } catch (e) {
                console.log(body);
            }
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 'ok' }));
        });
    } else {
        res.writeHead(404);
        res.end();
    }
});

server.listen(3000, () => {
    console.log('Webhook monitor server listening on http://localhost:3000');
    console.log('Waiting for AgentBuilder events...');
});
