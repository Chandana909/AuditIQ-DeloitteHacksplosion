const { Client } = require('pg');

const API_URL = "https://agentbuilder3.ingenw-innovation-nonprod.deloitte.com/api/v1/prediction/8570af9e-7d76-408a-b755-6821649759e9";
const connectionString = "postgresql://neondb_owner:npg_NafhUtWPF51V@ep-bitter-credit-a1ffz9vw.ap-southeast-1.aws.neon.tech/neondb?sslmode=require";

// ---------------------------------------------------------------
// Parse the agent API response into structured audit fields.
// With Structured Output enabled, rawData.text is now a JSON string.
// ---------------------------------------------------------------
function parseAgentResponse(rawData) {
  const result = {
    riskRating: "Pending",
    riskScore: null,
    flagsDetected: [],
    policyVersion: null,
    explanation: null,
    recommendedAction: null,
    citation: null,
    chatId: rawData.chatId || rawData.sessionId || null,
    isHITL: false,
  };

  // No text at all = flow paused at HITL node
  if (!rawData.text) {
    result.isHITL = true;
    return result;
  }
  // Check for HITL response since Flowise may concatenate multiple outputs
  if (rawData.text && rawData.text.includes('"type": "HITL_REQUIRED"')) {
    result.isHITL = true;
    
    // First, try parsing the entire text. If the LLM omitted the markdown backticks, 
    // the Flowise output will be perfectly valid JSON!
    try {
        const parsedText = JSON.parse(rawData.text);
        
        // Fix nested verifiedFlags if the LLM outputted the full object instead of just the array
        let unwrappedFlags = [];
        if (Array.isArray(parsedText.verifiedFlags)) {
            unwrappedFlags = parsedText.verifiedFlags;
        } else if (parsedText.verifiedFlags && Array.isArray(parsedText.verifiedFlags.verifiedFlags)) {
            unwrappedFlags = parsedText.verifiedFlags.verifiedFlags;
        }
        parsedText.verifiedFlags = unwrappedFlags;

        result.explanation = JSON.stringify(parsedText);
        result.riskRating = parsedText.riskResult?.riskLevel || "Pending";
        result.riskScore = parsedText.riskResult?.riskScore ?? null;
        result.recommendedAction = "Pending";
        return result;
    } catch (e) {
        // If it throws, it means the LLM injected markdown backticks (```json) into the string, breaking the outer JSON.
        // We must extract the fields manually using Regex.
    }
    
    // 1. Extract riskResult
    let cleanRisk = { riskScore: 0, riskLevel: "HIGH" };
    const riskMatch = rawData.text.match(/"riskResult"\s*:\s*(\{[\s\S]*?"routing"\s*:\s*"[^"]+"\s*\})/);
    if (riskMatch) {
        try { cleanRisk = JSON.parse(riskMatch[1]); } catch(e) {}
    }
    
    // 2. Extract verifiedFlags
    let cleanFlags = [];
    
    // Try finding ```json block
    const flagsMatch = rawData.text.match(/```json\s*(\{[\s\S]*?"verifiedFlags"\s*:[\s\S]*?\})\s*```/);
    if (flagsMatch) {
        try { cleanFlags = JSON.parse(flagsMatch[1]).verifiedFlags || []; } catch(e) {}
    }

    // Try extracting without backticks (object case)
    if (!cleanFlags || cleanFlags.length === 0) {
        const rawFlagsObj = rawData.text.match(/"verifiedFlags"\s*:\s*(\{[\s\S]*?"verifiedFlags"\s*:[\s\S]*?\})\s*(?:,|"extractedData")/);
        if (rawFlagsObj) {
            try { 
                const parsedBlock = JSON.parse(rawFlagsObj[1]);
                if (Array.isArray(parsedBlock.verifiedFlags)) cleanFlags = parsedBlock.verifiedFlags;
                else if (parsedBlock.verifiedFlags && Array.isArray(parsedBlock.verifiedFlags.verifiedFlags)) cleanFlags = parsedBlock.verifiedFlags.verifiedFlags;
            } catch(e) {}
        }
    }

    // Try extracting without backticks (array case)
    if (!cleanFlags || cleanFlags.length === 0) {
        const rawFlagsArr = rawData.text.match(/"verifiedFlags"\s*:\s*(\[[\s\S]*?\])\s*(?:,|"extractedData")/);
        if (rawFlagsArr) {
            try { cleanFlags = JSON.parse(rawFlagsArr[1]); } catch(e) {}
        }
    }
    
    // Final fallback to fix deeply nested arrays if any snuck through
    if (!Array.isArray(cleanFlags)) {
        if (cleanFlags && Array.isArray(cleanFlags.verifiedFlags)) cleanFlags = cleanFlags.verifiedFlags;
        else cleanFlags = [];
    }
    
    // 3. Extract extractedData
    let cleanData = {};
    const dataMatch = rawData.text.match(/"extractedData"\s*:\s*(\{[\s\S]*?\})\s*\}\s*$/);
    if (dataMatch) {
        try { cleanData = JSON.parse(dataMatch[1]); } catch(e) {}
    }

    // Build perfectly clean JSON for Appsmith to consume
    const cleanExplanation = JSON.stringify({
        type: "HITL_REQUIRED",
        riskResult: cleanRisk,
        verifiedFlags: cleanFlags,
        extractedData: cleanData
    });
    
    result.explanation = cleanExplanation;
    result.riskRating = cleanRisk.riskLevel || "Pending";
    result.riskScore = cleanRisk.riskScore ?? null;
    result.recommendedAction = "Pending";
    return result;
  }

  try {
    const structured = JSON.parse(rawData.text);

    result.riskRating = structured.risk_rating || "UNKNOWN";
    result.riskScore = structured.risk_score ?? null;
    result.flagsDetected = structured.flags_detected || [];
    result.policyVersion = structured.policy_version_applied || null;
    result.explanation = structured.explanation || "No explanation provided.";
    result.recommendedAction = structured.recommended_action || null;
    result.citation = structured.citation || null;

  } catch (e) {
    console.error("Failed to parse structured JSON. Raw text:", rawData.text.substring(0, 100));
    // If it fails to parse completely, mark it as error/pending rather than AUTO_APPROVE
    result.explanation = "Error: Invalid JSON response from Agent.";
    result.riskRating = "ERROR";
  }

  return result;
}

async function runMassAudit() {
  const client = new Client({ connectionString });
  try {
    await client.connect();

    // Join invoices table to get the invoice_amount for ABC classification
    // audit_results doesn't store invoice_amount — it lives in invoices table
    const res = await client.query(`
      SELECT ar.invoice_id,
             COALESCE(i.amount, i.invoice_amount, 0) AS invoice_amount
      FROM audit_results ar
      LEFT JOIN invoices i ON ar.invoice_id = i.invoice_id
      WHERE ar.risk_rating = 'Pending' OR ar.risk_rating IS NULL
      ORDER BY ar.invoice_id ASC;
    `);
    const invoiceRows = res.rows;

    if (invoiceRows.length === 0) {
      console.log("No pending invoices found. All audits are complete.");
      return;
    }

    console.log(`Found ${invoiceRows.length} pending invoices. Dispatching to Agent Flow...`);

    const CONCURRENCY = 10;
    let successCount = 0;
    let hitlCount = 0;
    let errorCount = 0;

    for (let i = 0; i < invoiceRows.length; i += CONCURRENCY) {
      const batch = invoiceRows.slice(i, i + CONCURRENCY);
      const batchNum = Math.floor(i / CONCURRENCY) + 1;
      console.log(`\nBatch ${batchNum}: [${batch.map(r => r.invoice_id).join(', ')}]`);

      const promises = batch.map(async ({ invoice_id: invoiceId, invoice_amount }) => {
        try {
          // ABC classification based on invoice_amount from invoices table
          const txnClass = computeTransactionClass(invoice_amount);

          const payload = {
            question: invoiceId,
            overrideConfig: { modelName: "qwen3.5-35b-hacksplosion" }
          };

          const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });

          if (!response.ok) throw new Error(`API ${response.status} ${response.statusText}`);

          const rawData = await response.json();
          const parsed = parseAgentResponse(rawData);

          // Map to exact v3 schema workflow_status values (schema default is 'Open')
          let workflowStatus;
          if (parsed.isHITL) {
            workflowStatus = 'Pending Review';
          } else if (['LOW', 'MEDIUM'].includes(parsed.riskRating)) {
            workflowStatus = 'Approved';
          } else {
            workflowStatus = 'Flagged';
          }

          // Write ALL fields back to audit_results using exact v3 schema columns
          await client.query(`
            UPDATE audit_results
            SET risk_rating             = $1,
                risk_score              = $2,
                flags_detected          = $3::jsonb,
                flag_count              = jsonb_array_length($3::jsonb),
                policy_version_applied  = $4,
                session_id              = $5,
                explanation             = $6,
                recommended_action      = $7,
                citation                = $8,
                workflow_status         = $9,
                requires_hitl           = $10,
                transaction_class       = $11,
                data_masking_applied    = FALSE,
                updated_at              = NOW()
            WHERE invoice_id = $12
          `, [
            parsed.riskRating,
            parsed.riskScore,
            JSON.stringify(parsed.flagsDetected),
            parsed.policyVersion,
            parsed.chatId,
            parsed.explanation,
            parsed.recommendedAction,
            parsed.citation,
            workflowStatus,
            parsed.isHITL,
            txnClass,
            invoiceId
          ]);

          if (parsed.isHITL) {
            hitlCount++;
            console.log(`  [HITL] ${invoiceId} -> class:${txnClass} | paused for human review (session: ${parsed.chatId})`);
          } else {
            successCount++;
            console.log(`  [OK]   ${invoiceId} -> ${parsed.riskRating} | class:${txnClass} | flags: ${parsed.flagsDetected.length} | action: ${parsed.recommendedAction}`);
          }

          return { invoiceId, status: 'dispatched', txnClass, ...parsed };

        } catch (err) {
          errorCount++;
          console.error(`  [ERR]  ${invoiceId} -> ${err.message}`);
          return { invoiceId, status: 'error', error: err.message };
        }
      });

      await Promise.all(promises);
    }

    // Post-run: check Class A fraud threshold and warn if exceeded
    await checkClassAFraudAlert(client);

    console.log(`\n=== MASS AUDIT COMPLETE ===`);
    console.log(`  Completed:    ${successCount}`);
    console.log(`  Pending HITL: ${hitlCount}`);
    console.log(`  Errors:       ${errorCount}`);
    console.log(`  Total:        ${invoiceRows.length}`);

  } catch (err) {
    console.error("Fatal error:", err);
  } finally {
    await client.end();
  }
}

// ---------------------------------------------------------------
// ABC classification: based on invoice_amount from invoices table
// A = > 500,000 | B = 100,001–500,000 | C = ≤ 100,000
// ---------------------------------------------------------------
function computeTransactionClass(invoiceAmount) {
  const amt = parseFloat(invoiceAmount) || 0;
  if (amt > 500000) return 'A';
  if (amt > 100000) return 'B';
  return 'C';
}

// ---------------------------------------------------------------
// Class A Fraud Alert
// Fires if % of Class A invoices that are HIGH/CRITICAL > threshold
// ---------------------------------------------------------------

async function checkClassAFraudAlert(client) {
  const CLASS_A_FRAUD_THRESHOLD_PCT = 5; // alert if >5% of Class A are HIGH or CRITICAL

  const res = await client.query(`
    SELECT
      COUNT(*) FILTER (WHERE transaction_class = 'A')                                          AS total_class_a,
      COUNT(*) FILTER (WHERE transaction_class = 'A' AND risk_rating IN ('HIGH','CRITICAL'))   AS fraud_class_a,
      ROUND(
        100.0 * COUNT(*) FILTER (WHERE transaction_class = 'A' AND risk_rating IN ('HIGH','CRITICAL'))
              / NULLIF(COUNT(*) FILTER (WHERE transaction_class = 'A'), 0),
        1
      )                                                                                         AS fraud_pct_class_a,
      COUNT(*) FILTER (WHERE transaction_class = 'B' AND risk_rating IN ('HIGH','CRITICAL'))   AS fraud_class_b,
      COUNT(*) FILTER (WHERE transaction_class = 'C' AND risk_rating IN ('HIGH','CRITICAL'))   AS fraud_class_c
    FROM audit_results
    WHERE risk_rating IS NOT NULL AND risk_rating != 'Pending';
  `);

  if (res.rows.length > 0) {
    const stats = res.rows[0];
    const pct = parseFloat(stats.fraud_pct_class_a) || 0;

    console.log(`\n=== ABC FRAUD ANALYSIS ===`);
    console.log(`  Class A total: ${stats.total_class_a} | fraud: ${stats.fraud_class_a} (${pct}%)`);
    console.log(`  Class B fraud: ${stats.fraud_class_b}`);
    console.log(`  Class C fraud: ${stats.fraud_class_c}`);

    if (pct >= CLASS_A_FRAUD_THRESHOLD_PCT) {
      console.warn(`\n⚠️  ALERT: Class A fraud rate is ${pct}% — exceeds ${CLASS_A_FRAUD_THRESHOLD_PCT}% threshold!`);
      console.warn(`   → ACTION: Triggering MailAgent flow...`);
      
      try {
        const MAILAGENT_API_URL = "https://agentbuilder3.ingenw-innovation-nonprod.deloitte.com/api/v1/prediction/7d82d3ee-ddfd-46ee-9211-b1228072f3c9";
        const mailResponse = await fetch(MAILAGENT_API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            question: \`ALERT: Class A fraud rate is \${pct}% (\${stats.fraud_class_a} out of \${stats.total_class_a} Class A invoices). Please notify the audit team immediately.\`
          })
        });
        
        if (mailResponse.ok) {
           console.log(\`   ✅ MailAgent successfully triggered!\`);
        } else {
           console.error(\`   ❌ Failed to trigger MailAgent: \${mailResponse.statusText}\`);
        }
      } catch(err) {
        console.error(\`   ❌ Error triggering MailAgent: \${err.message}\`);
      }
    }
  }
}

runMassAudit();
