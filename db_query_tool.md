# Custom Tool: `execute_sql_query`

## Tool Details

**Tool Name:** `execute_sql_query`

**Tool Description:**
Executes a read-only SQL SELECT query against the AuditIQ PostgreSQL database (Neon). Use this tool to look up invoice data, audit results, vendor risk ratings, flagged transactions, and company policy details. Only use for SELECT queries — never for INSERT, UPDATE, or DELETE.

**Tool Icon Source:** `https://raw.githubusercontent.com/gilbarbara/logos/main/logos/postgresql.svg`

---

## Input Schema

```json
[
    {
        "property": "query",
        "type": "string",
        "description": "A valid read-only PostgreSQL SELECT query to execute against the audit database.",
        "required": true
    }
]
```

---

## JavaScript Function

```javascript
const https = require('https');

const connectionString = "postgresql://neondb_owner:npg_NafhUtWPF51V@ep-bitter-credit-a1ffz9vw.ap-southeast-1.aws.neon.tech/neondb?sslmode=require";

async function execute({ query }) {
    // Safety guard — block any non-SELECT query
    const normalizedQuery = query.trim().toUpperCase();
    if (!normalizedQuery.startsWith('SELECT') && !normalizedQuery.startsWith('WITH')) {
        return JSON.stringify({ error: "Only SELECT queries are permitted." });
    }

    return new Promise((resolve, reject) => {
        const postData = JSON.stringify({ query });

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

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    try {
                        const parsed = JSON.parse(data);
                        const rows = Array.isArray(parsed) ? parsed : (parsed.rows || []);
                        resolve(JSON.stringify({ 
                            row_count: rows.length, 
                            rows: rows.slice(0, 20) // cap at 20 rows for LLM context
                        }));
                    } catch (e) {
                        resolve(JSON.stringify({ error: "Failed to parse DB response", raw: data.substring(0, 200) }));
                    }
                } else {
                    resolve(JSON.stringify({ error: `DB Error ${res.statusCode}`, detail: data.substring(0, 300) }));
                }
            });
        });

        req.on('error', err => resolve(JSON.stringify({ error: err.message })));
        req.write(postData);
        req.end();
    });
}

return await execute({ query: $query });
```

---

## Database Schema Reference

| Table | Key Columns | Notes |
|---|---|---|
| `invoices` | invoice_id, vendor_id, po_id, amount, date, gstin, status | Core transaction records |
| `purchase_orders` | po_id, vendor_id, total_amount, status | PO raised by procurement |
| `goods_receipts` | grn_id, po_id, received_quantity, accepted_quantity | Warehouse confirmations |
| `vendor_master` | vendor_id, risk_rating, blacklist_status | Vendor risk registry |
| `approval_logs` | log_id, invoice_id, approver_id, status, timestamp | Approval chain audit trail |
| `audit_results` | invoice_id, **risk_rating**, **flags_detected** (JSONB), **policy_version_applied**, **session_id** | Agent audit outputs |
| `company_policies` | policy_id, version_number, markdown_content, **is_active** | Active SOP rules |

### JSONB Query Examples (flags_detected column)

```sql
-- Count flags per invoice
SELECT invoice_id, jsonb_array_length(flags_detected) AS flag_count
FROM audit_results WHERE flags_detected IS NOT NULL
ORDER BY flag_count DESC LIMIT 10;

-- Find CRITICAL severity flags
SELECT invoice_id FROM audit_results
WHERE flags_detected @> '[{"severity": "CRITICAL"}]';

-- Get HITL queue (paused for human review)
SELECT invoice_id, session_id FROM audit_results
WHERE risk_rating = 'Pending Auditor Review';
```
