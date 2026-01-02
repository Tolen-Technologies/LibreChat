const express = require('express');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const { logger } = require('@librechat/data-schemas');
const requireJwtAuth = require('~/server/middleware/requireJwtAuth');
const {
  getSegments,
  getSegmentById,
  createSegment,
  updateSegment,
  deleteSegment,
  updateSegmentExecution,
} = require('~/models/Segment');

const router = express.Router();

// CRM Backend URL (Python FastAPI service)
const CRM_BACKEND_URL = process.env.CRM_BACKEND_URL || 'http://crm-backend:8000';

// All routes require authentication
router.use(requireJwtAuth);

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

/**
 * GET /api/segments
 * List all segments
 */
router.get('/', async (req, res) => {
  try {
    const segments = await getSegments();
    res.status(200).json(segments);
  } catch (error) {
    logger.error('[GET /segments] Error:', error);
    res.status(500).json({ error: 'Failed to fetch segments' });
  }
});

/**
 * GET /api/segments/:segmentId
 * Get a single segment by ID
 */
router.get('/:segmentId', async (req, res) => {
  try {
    const segment = await getSegmentById(req.params.segmentId);
    if (!segment) {
      return res.status(404).json({ error: 'Segment not found' });
    }
    res.status(200).json(segment);
  } catch (error) {
    logger.error('[GET /segments/:id] Error:', error);
    res.status(500).json({ error: 'Failed to fetch segment' });
  }
});

/**
 * POST /api/segments
 * Create a new segment from natural language description
 */
router.post('/', async (req, res) => {
  try {
    const { description } = req.body;

    if (!description) {
      return res.status(400).json({ error: 'Deskripsi segment diperlukan' });
    }

    // 1. Generate UUID for segment
    const segmentId = uuidv4();
    const currentDate = new Date().toISOString().split('T')[0]; // '2025-12-27'

    // 2. Call Python backend to create VIEW
    const response = await axios.post(`${CRM_BACKEND_URL}/api/segments/create`, {
      segmentId,
      description,
      currentDate,
    });

    const { name, description: segmentDesc, sql, viewName } = response.data;

    // 3. Execute VIEW to detect columns
    const execResponse = await axios.post(`${CRM_BACKEND_URL}/api/segments/execute-view`, {
      viewName,
    });

    // 4. Auto-detect columns from results
    const columns = detectColumns(execResponse.data.customers[0]);

    // 5. Save to MongoDB
    const segment = await createSegment({
      segmentId,
      name,
      description: segmentDesc,
      originalPrompt: description,
      sqlQuery: sql,
      viewName,
      columns,
      createdBy: req.user.id,
      createdDate: new Date(),
      isDeleted: false,
      lastExecutedAt: new Date(),
      lastRowCount: execResponse.data.count,
    });

    res.status(201).json(segment);
  } catch (error) {
    logger.error('[POST /segments] Error:', error);
    const message = error.response?.data?.detail || error.message;
    res.status(500).json({ error: 'Gagal membuat segment: ' + message });
  }
});

/**
 * GET /api/segments/:segmentId/execute
 * Execute a segment's SQL query and return results
 */
router.get('/:segmentId/execute', async (req, res) => {
  try {
    const segment = await getSegmentById(req.params.segmentId);
    if (!segment || segment.isDeleted) {
      return res.status(404).json({ error: 'Segment tidak ditemukan' });
    }

    // Execute from VIEW instead of raw SQL
    const response = await axios.post(`${CRM_BACKEND_URL}/api/segments/execute-view`, {
      viewName: segment.viewName,
    });

    const { customers: rows, count: rowCount } = response.data;

    await updateSegmentExecution(segment.segmentId, rowCount);

    res.status(200).json({
      columns: segment.columns,
      rows,
      rowCount,
      executedAt: new Date(),
    });
  } catch (error) {
    logger.error('[GET /segments/:id/execute] Error:', error);
    const message = error.response?.data?.detail || error.message;
    res.status(500).json({ error: 'Gagal mengeksekusi segment: ' + message });
  }
});

/**
 * POST /api/segments/:segmentId/refresh
 * Refresh segment with updated data from current date
 */
router.post('/:segmentId/refresh', async (req, res) => {
  try {
    const segment = await getSegmentById(req.params.segmentId);
    if (!segment || segment.isDeleted) {
      return res.status(404).json({ error: 'Segment tidak ditemukan' });
    }

    const currentDate = new Date().toISOString().split('T')[0];

    // Call Python backend to refresh VIEW
    const response = await axios.post(
      `${CRM_BACKEND_URL}/api/segments/${segment.segmentId}/refresh`,
      {
        originalDescription: segment.originalPrompt,
        currentDate,
      },
    );

    const { name, description: segmentDesc, sql } = response.data;

    // Update MongoDB
    await updateSegment(segment.segmentId, {
      name,
      description: segmentDesc,
      sqlQuery: sql,
      createdDate: new Date(),
    });

    // Auto-execute to return fresh data
    const execResponse = await axios.post(`${CRM_BACKEND_URL}/api/segments/execute-view`, {
      viewName: segment.viewName,
    });

    await updateSegmentExecution(segment.segmentId, execResponse.data.count);

    // Get updated segment
    const updatedSegment = await getSegmentById(segment.segmentId);

    res.status(200).json({
      segment: updatedSegment,
      data: {
        columns: updatedSegment.columns,
        rows: execResponse.data.customers,
        rowCount: execResponse.data.count,
        executedAt: new Date(),
      },
    });
  } catch (error) {
    logger.error('[POST /segments/:id/refresh] Error:', error);
    const message = error.response?.data?.detail || error.message;
    res.status(500).json({ error: 'Gagal memperbarui segment: ' + message });
  }
});

/**
 * DELETE /api/segments/:segmentId
 * Soft delete a segment
 */
router.delete('/:segmentId', async (req, res) => {
  try {
    const segment = await getSegmentById(req.params.segmentId);
    if (!segment) {
      return res.status(404).json({ error: 'Segment tidak ditemukan' });
    }

    // Soft delete - don't drop the VIEW
    await updateSegment(req.params.segmentId, {
      isDeleted: true,
      deletedAt: new Date(),
    });

    res.status(200).json({ success: true });
  } catch (error) {
    logger.error('[DELETE /segments/:id] Error:', error);
    res.status(500).json({ error: 'Gagal menghapus segment' });
  }
});

module.exports = router;
