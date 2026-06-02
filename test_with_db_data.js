const { Client } = require('pg');

const connectionString = "postgresql://neondb_owner:npg_NafhUtWPF51V@ep-bitter-credit-a1ffz9vw.ap-southeast-1.aws.neon.tech/neondb?sslmode=require";
const API_URL = "https://agentbuilder3.ingenw-innovation-nonprod.deloitte.com/api/v1/prediction/6126be0e-4d26-4f82-9e82-04ad473feea1";

async function testWithRandomData() {
    const client = new Client({ connectionString });
    try {
        await client.connect();
        
        // Fetch 2 random invoice IDs
        console.log("Fetching random invoices from database...");
        const res = await client.query("SELECT invoice_id FROM invoices ORDER BY RANDOM() LIMIT 2;");
        const invoiceIds = res.rows.map(row => row.invoice_id);
        
        if (invoiceIds.length === 0) {
            console.log("No invoices found in database.");
            return;
        }

        console.log(`Selected for testing: ${invoiceIds.join(', ')}`);
        console.log("=".repeat(50));

        for (const invoiceId of invoiceIds) {
            console.log(`\nTesting Invoice ID: ${invoiceId}`);
            
            const payload = {
                question: invoiceId,
                overrideConfig: {
                    modelName: "qwen3.5-35b-hacksplosion"
                }
            };

            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                console.error(`Error for ${invoiceId}: ${response.status} ${response.statusText}`);
                continue;
            }

            const data = await response.json();
            
            // Log the text response which usually contains the Audit Pack
            console.log("--- Agent Response ---");
            if (data.text) {
                console.log(data.text);
            } else {
                console.log("No 'text' field in response. Full data:");
                console.log(JSON.stringify(data, null, 2));
            }
            console.log("-".repeat(50));
        }

    } catch (error) {
        console.error("Test failed:", error);
    } finally {
        await client.end();
    }
}

testWithRandomData();
