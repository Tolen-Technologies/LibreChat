const express = require('express');
const axios = require('axios');
const { logger } = require('@librechat/data-schemas');
const requireJwtAuth = require('~/server/middleware/requireJwtAuth');
const {
  getSegments,
  getSegmentById,
  createSegment,
  deleteSegment,
  updateSegmentExecution,
} = require('~/models/Segment');

const router = express.Router();

// CRM Backend URL (Python FastAPI service)
const CRM_BACKEND_URL = process.env.CRM_BACKEND_URL || 'http://localhost:8000';

// All routes require authentication
router.use(requireJwtAuth);

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
    const { description, name } = req.body;

    if (!description) {
      return res.status(400).json({ error: 'Description is required' });
    }

    // Call Python backend to generate SQL from description
    const response = await axios.post(`${CRM_BACKEND_URL}/api/segments/generate`, {
      description,
    });

    const { name: generatedName, sql: sqlQuery } = response.data;

    const segment = await createSegment({
      name: name || generatedName,
      description,
      sqlQuery,
      columns: ['custid', 'custname', 'email', 'mobileno'], // Default columns
      createdBy: req.user.id,
    });

    res.status(201).json(segment);
  } catch (error) {
    logger.error('[POST /segments] Error:', error);
    const message = error.response?.data?.detail || error.message;
    res.status(500).json({ error: 'Failed to create segment: ' + message });
  }
});

/**
 * GET /api/segments/:segmentId/execute
 * Execute a segment's SQL query and return results
 */
router.get('/:segmentId/execute', async (req, res) => {
  try {
    const segment = await getSegmentById(req.params.segmentId);
    if (!segment) {
      return res.status(404).json({ error: 'Segment not found' });
    }

    // Call Python backend to execute SQL
    const response = await axios.post(`${CRM_BACKEND_URL}/api/segments/execute`, {
      sql: segment.sqlQuery,
    });

    const { customers: rows, count: rowCount } = response.data;

    // Update execution metadata
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
    res.status(500).json({ error: 'Failed to execute segment query: ' + message });
  }
});

/**
 * DELETE /api/segments/:segmentId
 * Delete a segment
 */
router.delete('/:segmentId', async (req, res) => {
  try {
    const deleted = await deleteSegment(req.params.segmentId);
    if (!deleted) {
      return res.status(404).json({ error: 'Segment not found' });
    }
    res.status(200).json({ success: true });
  } catch (error) {
    logger.error('[DELETE /segments/:id] Error:', error);
    res.status(500).json({ error: 'Failed to delete segment' });
  }
});

module.exports = router;
