### GenW Custom Tool: Vendor Intelligence Lookup (Phase 2C)

**Tool Name:** `fetch_vendor_master`
**Tool Description:** `Fetches the historical risk rating and blacklist status of a vendor from the master database. Use this tool whenever you need to verify a vendor's background or check for behavioral anomalies using their vendor_id.`

**Tool Icon Source:** `https://raw.githubusercontent.com/gilbarbara/logos/main/logos/postgresql.svg`

**Input Schema:**
```json
[
    {
        "property": "vendor_id",
        "type": "string",
        "description": "The exact unique identifier of the vendor extracted from the transaction data (e.g., VEND1001).",
        "required": true
    }
]
```

**JavaScript Function:**
```javascript
const https = require('https');

// We are temporarily using your existing connection string for functionality. 
// Highly recommend moving this to the Key Store later!
const connectionString = "postgresql://neondb_owner:npg_NafhUtWPF51V@ep-bitter-credit-a1ffz9vw.ap-southeast-1.aws.neon.tech/neondb?sslmode=require";

async function execute({ vendor_id }) {
    return new Promise((resolve, reject) => {
        try {
            if (!vendor_id) {
                return resolve(JSON.stringify({ error: "Missing vendor_id parameter" }));
            }

            // Prepare the payload targeting the correct table and columns
            const postData = JSON.stringify({
                query: "SELECT risk_rating, blacklist_status FROM vendor_master WHERE vendor_id = $1 LIMIT 1;",
                params: [vendor_id.toUpperCase()]
            });

            // Configure the HTTPS request matching your Neon setup
            const options = {
                hostname: 'ep-bitter-credit-a1ffz9vw.ap-southeast-1.aws.neon.tech',
                port: 443,
                path: '/sql',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Neon-Connection-String': connectionString,
                    'Content-Length': Buffer.byteLength(postData)
                }
            };

            // Execute the request
            const req = https.request(options, (res) => {
                let data = '';
                
                res.on('data', (chunk) => { 
                    data += chunk; 
                });

                res.on('end', () => {
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        try {
                            const parsedData = JSON.parse(data);
                            const rows = Array.isArray(parsedData) ? parsedData : parsedData.rows;
                            
                            // Return the specific record or a clean error message if not found
                            const resultObj = (rows && rows.length > 0) ? rows[0] : { error: `No records found in database for ${vendor_id}` };
                            
                            resolve(JSON.stringify(resultObj, null, 2));
                        } catch (e) {
                            resolve(JSON.stringify({ error: "Failed to parse JSON response", details: e.message }));
                        }
                    } else {
                        resolve(JSON.stringify({ error: `Neon HTTP API Error: ${res.statusCode}`, details: data }));
                    }
                });
            });

            // Handle network-level errors
            req.on('error', (e) => {
                resolve(JSON.stringify({ error_string: "HTTPS Request failed", message: e.message }, null, 2));
            });

            // Send payload and finalize
            req.write(postData);
            req.end();

        } catch (err) {
            resolve(JSON.stringify({ error_string: String(err), message: err.message }, null, 2));
        }
    });
}
```
