# Standard Operating Procedure (SOP): Procurement & Vendor Auditing

**Version:** 2.4  
**Effective Date:** January 1, 2026  
**Document Owner:** Deloitte Risk & Financial Advisory

## 1. Introduction
This SOP outlines the mandatory financial controls for vendor invoice processing, three-way matching, duplicate identification, and policy compliance. All transactions must be verified against these rules before approval.

## 2. Invoice & Purchase Order (PO) Processing
### 2.1 Three-Way Match Verification
Every invoice must be verified against the corresponding Purchase Order (PO) and Goods Receipt Note (GRN).
- **Rule 2.1.1:** The `invoice_amount` must equal the `po_amount`. An allowed tolerance of up to 1% is permitted for rounding/tax adjustments.
- **Rule 2.1.2:** The quantities billed on the invoice must match the `grn_amount` (goods received). Any discrepancy greater than zero is considered an exception and must be flagged as `HIGH` risk.

### 2.2 Duplicate Invoice Prevention
- **Rule 2.2.1:** No two invoices from the same vendor can share the same `invoice_number`.
- **Rule 2.2.2:** Suspected duplicates must be flagged as `CRITICAL` risk and routed to the Fraud Investigation team immediately.

## 3. GST Compliance
### 3.1 GST Identification Number (GSTIN) Validation
- **Rule 3.1.1:** A valid GSTIN must be exactly 15 alphanumeric characters.
- **Rule 3.1.2:** The first two characters of the GSTIN represent the State Code. Valid active business zones start with codes `01` to `37`. Any GSTIN starting with generic default sequences (e.g., `00` or `99`) or having missing characters must be flagged as a `MEDIUM` risk. 

## 4. Vendor Management & Intelligence
### 4.1 Transaction Splitting (Structuring)
- **Rule 4.1.1:** Any vendor submitting more than 3 invoices on a single day is flagged for potential "invoice splitting" (attempting to bypass approval limits). This is a `HIGH` risk indicator and requires a manual vendor intelligence review.

### 4.2 Timing Anomalies
- **Rule 4.2.1:** Business operations are strictly Monday to Friday. Transactions processed or invoiced on weekends (Saturday or Sunday) must be flagged for manual review (`MEDIUM` risk).

### 4.3 Suspicious Amounts (Round Numbers)
- **Rule 4.3.1:** Invoices that are suspiciously exact round numbers (e.g., exactly 50,000, 100,000, or 250,000) are statistically indicative of non-standard purchases or potential fraud. These must be flagged as `LOW` to `MEDIUM` risk depending on the vendor's history.

## 5. Approval Hierarchy
### 5.1 Financial Delegation of Authority (DOA)
- **Rule 5.1.1:** Managers have varying approval limits. If an `invoice_amount` is greater than the `approver_limit`, the transaction must be flagged as `CRITICAL` risk for "Approval Limit Violation".

## 6. Audit Actions & Recommendations
When flagging any of the above exceptions, the auditor must document the specific violation and propose Next-Best-Actions (NBA):
- For **Three-Way Match failures**: NBA is "Request physical proof of delivery from the warehouse manager and pause payment until cleared."
- For **Limit Violations**: NBA is "Escalate to Level 2 Manager for counter-signature."
- For **GSTIN/Duplicate errors**: NBA is "Contact vendor for corrected invoice re-submission and flag vendor account for 30 days."
