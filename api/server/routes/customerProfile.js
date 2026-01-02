const express = require('express');
const { logger } = require('@librechat/data-schemas');
const requireJwtAuth = require('~/server/middleware/requireJwtAuth');
const { getCustomerProfileByCustomerId, upsertCustomerProfile } = require('~/models');

const router = express.Router();

// All routes require authentication
router.use(requireJwtAuth);

/**
 * GET /api/customer-profile/:customerId
 * Get customer profile by MySQL customer ID
 */
router.get('/:customerId', async (req, res) => {
  try {
    const customerId = parseInt(req.params.customerId, 10);
    const userId = req.user.id;

    if (isNaN(customerId)) {
      return res.status(400).json({ error: 'Invalid customer ID' });
    }

    const profile = await getCustomerProfileByCustomerId({
      mysqlCustomerId: customerId,
      userId,
    });

    res.status(200).json(profile);
  } catch (error) {
    logger.error('[GET /customer-profile/:customerId] Error:', error);
    res.status(500).json({ error: 'Failed to fetch customer profile' });
  }
});

/**
 * PUT /api/customer-profile/:customerId
 * Upsert customer profile (personality, notes, conversationId)
 */
router.put('/:customerId', async (req, res) => {
  try {
    const customerId = parseInt(req.params.customerId, 10);
    const userId = req.user.id;
    const { personality, notes, conversationId } = req.body;

    if (isNaN(customerId)) {
      return res.status(400).json({ error: 'Invalid customer ID' });
    }

    const profile = await upsertCustomerProfile({
      mysqlCustomerId: customerId,
      userId,
      personality,
      notes,
      conversationId,
    });

    res.status(200).json(profile);
  } catch (error) {
    logger.error('[PUT /customer-profile/:customerId] Error:', error);
    res.status(500).json({ error: 'Failed to update customer profile' });
  }
});

/**
 * PUT /api/customer-profile/:customerId/notes
 * Update only notes field (for auto-save) - uses upsert to create profile if not exists
 */
router.put('/:customerId/notes', async (req, res) => {
  try {
    const customerId = parseInt(req.params.customerId, 10);
    const userId = req.user.id;
    const { notes } = req.body;

    if (isNaN(customerId)) {
      return res.status(400).json({ error: 'Invalid customer ID' });
    }

    if (notes === undefined) {
      return res.status(400).json({ error: 'Notes field is required' });
    }

    // Use upsert to create profile if it doesn't exist
    const profile = await upsertCustomerProfile({
      mysqlCustomerId: customerId,
      userId,
      notes,
    });

    res.status(200).json(profile);
  } catch (error) {
    logger.error('[PUT /customer-profile/:customerId/notes] Error:', error);
    res.status(500).json({ error: 'Failed to update customer notes' });
  }
});

/**
 * PUT /api/customer-profile/:customerId/personality
 * Update only personality field - uses upsert to create profile if not exists
 */
router.put('/:customerId/personality', async (req, res) => {
  try {
    const customerId = parseInt(req.params.customerId, 10);
    const userId = req.user.id;
    const { summary, preferences } = req.body;

    if (isNaN(customerId)) {
      return res.status(400).json({ error: 'Invalid customer ID' });
    }

    if (!summary || !preferences) {
      return res.status(400).json({ error: 'Summary and preferences are required' });
    }

    // Use upsert to create profile if it doesn't exist
    const profile = await upsertCustomerProfile({
      mysqlCustomerId: customerId,
      userId,
      personality: {
        summary,
        preferences,
        generatedAt: new Date(),
      },
    });

    res.status(200).json(profile);
  } catch (error) {
    logger.error('[PUT /customer-profile/:customerId/personality] Error:', error);
    res.status(500).json({ error: 'Failed to update customer personality' });
  }
});

module.exports = router;
