const { z } = require('zod');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const { Tool } = require('@langchain/core/tools');
const { logger } = require('@librechat/data-schemas');
const { createSegment } = require('~/models/Segment');

/**
 * Helper function to auto-detect column definitions from a sample row
 * @param {Object} sampleRow - Sample data row
 * @returns {Array} Array of column definitions
 */
function detectColumns(sampleRow) {
  if (!sampleRow) {
    return [];
  }

  return Object.keys(sampleRow).map((key) => {
    const value = sampleRow[key];
    let type = 'string';

    if (typeof value === 'number') {
      type = 'number';
    } else if (value instanceof Date || /^\d{4}-\d{2}-\d{2}/.test(String(value))) {
      type = 'date';
    } else if (
      key.toLowerCase().includes('price') ||
      key.toLowerCase().includes('total') ||
      key.toLowerCase().includes('amount')
    ) {
      type = 'currency';
    }

    // Generate label from key: custid -> Custid, custname -> Custname
    const label = key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ');

    return { key, label, type };
  });
}

class CRMQuery extends Tool {
  static lc_name() {
    return 'CRMQuery';
  }

  constructor(fields = {}) {
    super(fields);
    this.name = 'crm_query';
    this.userId = fields.userId;
    this.override = fields.override ?? false;

    this.description =
      'Buat segment pelanggan dari deskripsi natural language menggunakan perintah /segment. ' +
      'Contoh: "/segment customer aktif yang belum berbelanja 6 bulan terakhir". ' +
      'Tool ini akan menghasilkan segment dengan query SQL otomatis dan menyimpannya ke database.';

    this.schema = z.object({
      input: z
        .string()
        .min(1)
        .describe(
          'Perintah /segment diikuti deskripsi segment. Contoh: "/segment customer aktif yang belum berbelanja 6 bulan terakhir"',
        ),
    });

    // CRM Backend URL
    this.crmBackendUrl = process.env.CRM_BACKEND_URL || 'http://crm-backend:8000';
  }

  async _call(input) {
    try {
      const validationResult = this.schema.safeParse(input);
      if (!validationResult.success) {
        throw new Error(`Validation failed: ${JSON.stringify(validationResult.error.issues)}`);
      }

      const { input: userInput } = validationResult.data;
      const trimmedInput = userInput.trim();

      // Check if this is a segment creation command
      if (!trimmedInput.startsWith('/segment')) {
        return 'Perintah tidak valid. Gunakan format: /segment [deskripsi segment]\n\nContoh: /segment customer aktif yang belum berbelanja 6 bulan terakhir';
      }

      // Extract description from command
      const description = trimmedInput.replace(/^\/segment\s+/, '').trim();

      if (!description) {
        return 'Mohon berikan deskripsi segment. Contoh: /segment customer aktif yang belum berbelanja 6 bulan terakhir';
      }

      // Validate userId
      if (!this.userId) {
        logger.error('[CRMQuery] Missing userId in tool context');
        return 'Error: User ID tidak tersedia. Silakan login kembali.';
      }

      logger.info('[CRMQuery] Creating segment:', { description, userId: this.userId });

      // 1. Generate UUID for segment
      const segmentId = uuidv4();
      const currentDate = new Date().toISOString().split('T')[0];

      // 2. Call Python backend to create VIEW
      const createResponse = await axios.post(
        `${this.crmBackendUrl}/api/segments/create`,
        {
          segmentId,
          description,
          currentDate,
        },
        {
          timeout: 30000, // 30 second timeout
        },
      );

      const { name, description: segmentDesc, sql, viewName } = createResponse.data;

      logger.info('[CRMQuery] Segment VIEW created:', { segmentId, viewName });

      // 3. Execute VIEW to detect columns
      const execResponse = await axios.post(
        `${this.crmBackendUrl}/api/segments/execute-view`,
        {
          viewName,
        },
        {
          timeout: 30000,
        },
      );

      // 4. Auto-detect columns from results
      const columns = detectColumns(execResponse.data.customers[0]);

      logger.info('[CRMQuery] Segment executed successfully:', {
        segmentId,
        rowCount: execResponse.data.count,
      });

      // 5. Save to MongoDB
      const segment = await createSegment({
        segmentId,
        name,
        description: segmentDesc,
        originalPrompt: description,
        sqlQuery: sql,
        viewName,
        columns,
        createdBy: this.userId,
        createdDate: new Date(),
        isDeleted: false,
        lastExecutedAt: new Date(),
        lastRowCount: execResponse.data.count,
      });

      logger.info('[CRMQuery] Segment saved to database:', { segmentId });

      // 6. Return markdown message with link
      return (
        `✅ **Segment "${segment.name}" berhasil dibuat!**\n\n` +
        `📊 **Deskripsi:** ${segment.description}\n\n` +
        `👥 **Jumlah customer:** ${segment.lastRowCount} customer\n\n` +
        `🔗 [Lihat segment di sini](/segments?selected=${segment.segmentId})\n\n` +
        `💡 Anda dapat melihat detail segment dan customer yang termasuk dalam segment ini.`
      );
    } catch (error) {
      logger.error('[CRMQuery] Error creating segment:', error);

      // Handle specific error types
      if (error.code === 'ECONNREFUSED') {
        return '❌ Gagal membuat segment: CRM backend service tidak dapat diakses. Silakan hubungi administrator.';
      }

      if (error.response?.status === 400) {
        const errorDetail = error.response?.data?.detail || 'Invalid request';
        return `❌ Gagal membuat segment: ${errorDetail}`;
      }

      if (error.response?.status === 500) {
        const errorDetail = error.response?.data?.detail || 'Server error';
        return `❌ Gagal membuat segment: ${errorDetail}`;
      }

      const errorMessage = error.response?.data?.detail || error.message || 'Unknown error';
      return `❌ Gagal membuat segment: ${errorMessage}`;
    }
  }
}

module.exports = CRMQuery;
