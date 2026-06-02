### GenW Custom Tool: Three-Way Match (Phase 2A)

**Tool Name:** `check_threeway_match`
**Tool Description:** `Queries the matching purchase_orders and goods_receipts records for a given po_id. Used by Phase 2A to verify if the invoice quantities and amounts perfectly match the corresponding Purchase Order and Goods Receipt Note. If items mismatch, flag it.`

**Tool Icon Source:** `https://raw.githubusercontent.com/gilbarbara/logos/main/logos/postgresql.svg`

**Input Schema:**
```json
[
    {
        "property": "po_id",
        "type": "string",
        "description": "The exact Purchase Order ID from the invoice data (e.g., PO-1051).",
        "required": true
    }
]
```

**JavaScript Function:**
```javascript
const https = require('https');

// Highly recommend moving this to the Key Store later!
const connectionString = "postgresql://neondb_owner:npg_NafhUtWPF51V@ep-bitter-credit-a1ffz9vw.ap-southeast-1.aws.neon.tech/neondb?sslmode=require";

async function execute({ po_id }) {
    return new Promise((resolve, reject) => {
        try {
            if (!po_id) return resolve(JSON.stringify({ error: "Missing po_id parameter" }));

            // Join the PO and GRN tables to return a unified match comparison
            const postData = JSON.stringify({
                query: `
                    SELECT 
                        p.po_id, p.total_amount AS po_amount, p.item_description AS po_desc, p.status AS po_status,
                        g.grn_id, g.received_quantity, g.accepted_quantity, g.status AS grn_status
                    FROM purchase_orders p
                    LEFT JOIN goods_receipts g ON p.po_id = g.po_id
                    WHERE p.po_id = $1 LIMIT 1;
                `,
                params: [po_id.toUpperCase()]
            });

            const options = {
                hostname: 'ep-bitter-credit-a1ffz9vw.ap-southeast-1.aws.neon.tech', port: 443, path: '/sql', method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Neon-Connection-String': connectionString, 'Content-Length': Buffer.byteLength(postData) }
            };

            const req = https.request(options, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        try {
                            const parsedData = JSON.parse(data);
                            const rows = Array.isArray(parsedData) ? parsedData : parsedData.rows;
                            resolve(JSON.stringify((rows && rows.length > 0) ? rows[0] : { error: `No PO data found for ${po_id}` }, null, 2));
                        } catch (e) { resolve(JSON.stringify({ error: "Parse Error" })); }
                    } else { resolve(JSON.stringify({ error: `API Error: ${res.statusCode}` })); }
                });
            });
            req.on('error', (e) => resolve(JSON.stringify({ error: "Request Failed" })));
            req.write(postData); req.end();
        } catch (err) { resolve(JSON.stringify({ error: err.message })); }
    });
}
```
