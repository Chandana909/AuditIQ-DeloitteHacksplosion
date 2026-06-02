### GenW Custom Tool: Duplicate Checker (Phase 2B)

**Tool Name:** `check_duplicate_invoices`
**Tool Description:** `Queries the main invoices table to search for historically processed invoices with identical invoice numbers or exact matching vendor_id and invoice amounts to detect duplicate submissions and fraud.`

**Tool Icon Source:** `https://raw.githubusercontent.com/gilbarbara/logos/main/logos/postgresql.svg`

**Input Schema:**
```json
[
    {
        "property": "invoice_number",
        "type": "string",
        "description": "The invoice number string (e.g. INV-1029)",
        "required": true
    },
    {
        "property": "vendor_id",
        "type": "string",
        "description": "The exact vendor identifier sending the invoice.",
        "required": true
    },
    {
        "property": "amount",
        "type": "number",
        "description": "Total invoice billing amount.",
        "required": true
    }
]
```

**JavaScript Function:**
```javascript
const https = require('https');

const connectionString = "postgresql://neondb_owner:npg_NafhUtWPF51V@ep-bitter-credit-a1ffz9vw.ap-southeast-1.aws.neon.tech/neondb?sslmode=require";

async function execute({ invoice_number, vendor_id, amount }) {
    return new Promise((resolve, reject) => {
        try {
            if (!invoice_number || !vendor_id || !amount) {
                return resolve(JSON.stringify({ error: "Missing required parameters" }));
            }

            const postData = JSON.stringify({
                query: `
                    SELECT invoice_id, invoice_number, vendor_id, amount, date 
                    FROM invoices 
                    WHERE invoice_number = $1 OR (vendor_id = $2 AND amount = $3)
                    LIMIT 5;
                `,
                params: [invoice_number.toUpperCase(), vendor_id.toUpperCase(), Number(amount)]
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
                            // Check if more than one result exists (which means duplicates exist)
                            resolve(JSON.stringify({ matching_records: rows || [] }, null, 2));
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
