"""Prompt templates for CRM NL-to-SQL conversion."""

TEXT_TO_SQL_PROMPT = """
You are an expert data analyst with access to a SQL database.
Given an input question, write a syntactically correct {dialect} SQL query to answer it,
then interpret the query result to provide a concise natural-language answer **in Indonesian**.

SCHEMA REFERENCE (clonecrm cheat sheet):
- Branches, customers, leads, invoices, and products are joined via these keys:
  * branch.branchno ⇄ customer.branchno, invoice.branchno
  * city.cityid ⇄ customer.cityid; city.countryid/stateid give geo hierarchy
  * customer.custid ⇄ invoice.custid, lead.custid, customer_area.custid
  * customertype.custtype (1–7) and customertypedtl.custtypedetail (1–8) classify customers
  * product.prodcode (DO, HT, OT, TK, TR) ⇄ productdtl.proddtlcode (e.g., TKTD, TRPD)
  * invoice.invno ⇄ invoice_* line tables (DO/HT/OT/TK/TR/TRADD)
  * ticket/tour codes: invoice_tk.faretype → tkfaretype.faretypecode; tickettype → tktype.tktypecode
- Key tables:
  * customer: custid PK, custcode, custname, custtype (→ customertype), custtypedetail (via mapping to customertypedtl), joindate, birthday, mobileno, cityid, branchno, status ACTIVE/INACTIVE.
  * lead: leadid PK, contact info, leadsource (Instagram, TikTok, Facebook, Survey, Email, Pameran, Greta), product interest, custid (optional link to customer).
  * invoice: invno PK, invoiceno, custid, branchno, invdate, invoicestatus {{PAID, OUTS, VOID}}, balanceinvoice/discount/taxes, product (HT/TK/TR/DO/OT), currid (often IDR).
  * product/productdtl: prodcode (DO/HT/OT/TK/TR) and proddtlcode (e.g., TKTD, TRPD, HTHD).
  * branch: branchno PK, name, basecurr (IDR), city/state/country ids.
  * city: cityid PK, citycode/citydesc, countryid/stateid.
- Currency: monetary fields are IDR unless currid overrides.
- Customer segmentation (Recency/Frequency/Monetary) exists but is derived; use invoice dates and balanceinvoice if needed.
- Sales data should use the field balanceinvoice from the table invoice as the DEFAULT TOTAL SELL data of the invoice.
- Do not dedupe customers by name; custid is the truth key. Fits vs corporate: customertypedtl=2 is FIT NON CORPORATE (retail); 6 is CORPORATE.

Follow this format strictly:
Question: <user question>
SQLQuery: <SQL statement>   (omit unless the user explicitly asks for the SQL)
SQLResult: <real results as a well-formatted markdown table with headers>
Answer: <final natural language answer in Indonesian, summarizing the table>

Rules:
- Only use tables and columns from the schema below.
- Prefer selecting limited, relevant columns (avoid SELECT *).
- Use backticks "`" when you want to specify the table name in the SQL query, for example "`lead`" instead of just "lead".
- The environment only allows one SQL statement execution at a time, do not try to execute two or more at the same time.
- Use LIMIT 10 unless otherwise specified (explicitly or implicitly).
- Use DISTINCT when helpful.
- Qualify column names when needed.
- Column values are case-sensitive. Match the exact casing shown in the schema
  (e.g., customer_type = 'CORPORATE').
- Never hallucinate columns or tables.
- Data cutoff date is 2025-11-10, any data after this date is not considered.
- If the user's asks for today's data, present them with the latest data which is on 2025-11-10. So, if they asks for yesterday's data, present them with the data from 2025-11-9.

{schema}

Question: {query_str}
SQLQuery:
"""

SEGMENT_GENERATION_PROMPT = """
Based on this segment description, generate:
1. A SQL query that returns customer data matching the criteria
2. A short name for this segment (max 50 chars, in Indonesian)

Description: "{description}"

Requirements for SQL:
- Must return: custid, custname, email, mobileno
- Include calculated fields if relevant: last_transaction_date, total_spending, transaction_count
- Use appropriate JOINs between customer and invoice tables
- Apply filters based on the description
- Do NOT use LIMIT unless specified in the description
- Use MySQL syntax (backticks for identifiers, LIMIT for row limiting)

SCHEMA REFERENCE (clonecrm):
- customer: custid PK, custcode, custname, email, mobileno, custtype, custtypedetail, joindate, birthday, cityid, branchno, status ACTIVE/INACTIVE
- invoice: invno PK, invoiceno, custid, branchno, invdate, invoicestatus {{PAID, OUTS, VOID}}, balanceinvoice, discount, taxes, product (HT/TK/TR/DO/OT)
- customertype: custtype PK (1-7), custtypename
- customertypedtl: custtypedetail PK (1-8), custtypedetailname (FIT=2, CORPORATE=6)

Return in this exact JSON format:
{{
  "name": "Short segment name in Indonesian",
  "sql": "SELECT ... FROM ... WHERE ..."
}}

JSON Response:
"""

SEGMENT_VIEW_GENERATION_PROMPT = """
You are a MySQL expert. Generate a segment definition from this description.

TODAY'S DATE: {current_date}

IMPORTANT RULES:
1. For time-based filters (e.g., "6 months ago"):
   - Calculate the exact date based on TODAY'S DATE
   - Use DATE('YYYY-MM-DD') function with hardcoded dates
   - Example: If today is 2025-12-26 and query asks for "6 months ago", use DATE('2025-06-26') NOT DATE_SUB(CURDATE(), INTERVAL 6 MONTH)

2. SQL format:
   - Do NOT include a semicolon (;) at the end of the SQL
   - Do NOT include comments in the SQL
   - Use proper table aliases for clarity

Database schema:
- customer table: custid (PK, int), custcode, custname, custemail, mobileno, status (ACTIVE/INACTIVE), joindate, birthday, branchno, cityid
- invoice table: invno (PK), invoiceno, custid (FK to customer), invdate (date - use this for transaction dates!), balanceinvoice, invoicestatus (PAID/OUTS/VOID), branchno

IMPORTANT: The invoice date column is "invdate", NOT "invoicedate"!

Description: {description}

Return JSON with:
{{
  "name": "Short segment name (Indonesian)",
  "description": "Detailed explanation (Indonesian)",
  "sql": "SELECT c.custid, c.custcode, c.custname, c.custemail, c.mobileno FROM customer c WHERE ..."
}}
"""

# SQL-only prompt for NLSQLTableQueryEngine - used for segment generation
SEGMENT_SQL_ONLY_PROMPT = """Given an input question, create a syntactically correct {dialect} query to run.

TODAY'S DATE: {current_date}

IMPORTANT RULES:
1. For time-based filters (e.g., "6 months ago", "last year"):
   - Calculate the exact date based on TODAY'S DATE above
   - Use DATE('YYYY-MM-DD') function with hardcoded dates
   - Example: If today is 2025-12-28 and query asks for "6 months ago", use DATE('2025-06-28')
   - Do NOT use DATE_SUB, CURDATE(), NOW(), or any dynamic date functions

2. SQL format:
   - Return ONLY the SQL query, nothing else
   - Do NOT include markdown code blocks (no ```)
   - Do NOT include semicolon (;) at the end
   - Do NOT include any comments or explanations
   - Use proper table aliases for clarity

3. Required output columns for customer segments:
   - Always SELECT: custid, custcode, custname, custemail, mobileno
   - Use table alias 'c' for customer table

Here is the relevant table info: {schema}

Question: {query_str}
SQLQuery: """

# Prompt for generating segment name and description (separate LLM call)
SEGMENT_METADATA_PROMPT = """Based on the following segment description and SQL query, generate a short name and detailed description in Indonesian.

User's segment description: {description}

Generated SQL query: {sql}

Return a JSON object with exactly these keys:
{{
  "name": "Short segment name in Indonesian (max 50 chars)",
  "description": "Detailed explanation of what this segment contains in Indonesian"
}}

Only return the JSON, no markdown formatting or additional text.
"""

# Prompt for generating customer personality based on customer data
CUSTOMER_PERSONALITY_PROMPT = """Anda adalah analis CRM yang berpengalaman di industri travel. Berdasarkan data pelanggan berikut, buatlah analisis kepribadian dan preferensi pelanggan.

Data Pelanggan:
{customer_data}

Analisis dan hasilkan dalam format JSON dengan struktur berikut:

{{
  "summary": "Ringkasan singkat tentang pelanggan ini (pola perjalanan, tipe pelanggan, tingkat engagement). Tulis dalam 2-3 kalimat dalam Bahasa Indonesia.",
  "preferences": "Preferensi perjalanan yang dapat disimpulkan (destinasi favorit, gaya perjalanan, tier anggaran). Tulis dalam 2-3 kalimat dalam Bahasa Indonesia."
}}

Pertimbangkan faktor-faktor berikut dalam analisis:
- Frekuensi transaksi dan total pengeluaran
- Jenis produk yang sering dibeli (tiket pesawat, hotel, tour, dll)
- Tanggal bergabung dan aktivitas terakhir
- Status pelanggan (aktif/tidak aktif)
- Tipe pelanggan (FIT/Corporate)

Berikan analisis yang realistis dan actionable untuk tim marketing.

Hanya kembalikan JSON, tanpa markdown formatting atau teks tambahan.
"""
