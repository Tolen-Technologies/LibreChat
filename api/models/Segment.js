const { v4: uuidv4 } = require('uuid');
const { logger } = require('@librechat/data-schemas');
const { Segment } = require('~/db/models');

/**
 * Get all segments, sorted by creation date (newest first).
 * @returns {Promise<Array>} Array of segment documents
 */
async function getSegments() {
  try {
    return await Segment.find({}).sort({ createdAt: -1 }).lean();
  } catch (error) {
    logger.error('[getSegments] Error:', error);
    throw new Error('Failed to fetch segments');
  }
}

/**
 * Get a single segment by its segmentId.
 * @param {string} segmentId - The unique segment identifier
 * @returns {Promise<Object|null>} The segment document or null if not found
 */
async function getSegmentById(segmentId) {
  try {
    return await Segment.findOne({ segmentId }).lean();
  } catch (error) {
    logger.error('[getSegmentById] Error:', error);
    throw new Error('Failed to fetch segment');
  }
}

/**
 * Create a new segment.
 * @param {Object} params - Segment creation parameters
 * @param {string} params.name - Segment name
 * @param {string} params.description - Natural language description
 * @param {string} params.sqlQuery - Generated SQL query
 * @param {Array} params.columns - Column definitions
 * @param {string} params.createdBy - User ID of creator
 * @returns {Promise<Object>} The created segment document
 */
async function createSegment({ name, description, sqlQuery, columns, createdBy }) {
  try {
    const segment = await Segment.create({
      segmentId: uuidv4(),
      name,
      description,
      sqlQuery,
      columns,
      createdBy,
    });
    return segment.toObject();
  } catch (error) {
    logger.error('[createSegment] Error:', error);
    throw new Error('Failed to create segment');
  }
}

/**
 * Update segment execution metadata.
 * @param {string} segmentId - The unique segment identifier
 * @param {number} rowCount - Number of rows returned by the query
 * @returns {Promise<Object|null>} The updated segment document
 */
async function updateSegmentExecution(segmentId, rowCount) {
  try {
    return await Segment.findOneAndUpdate(
      { segmentId },
      {
        lastExecutedAt: new Date(),
        lastRowCount: rowCount,
      },
      { new: true },
    ).lean();
  } catch (error) {
    logger.error('[updateSegmentExecution] Error:', error);
    throw new Error('Failed to update segment');
  }
}

/**
 * Delete a segment by its segmentId.
 * @param {string} segmentId - The unique segment identifier
 * @returns {Promise<Object|null>} The deleted segment document or null if not found
 */
async function deleteSegment(segmentId) {
  try {
    return await Segment.findOneAndDelete({ segmentId });
  } catch (error) {
    logger.error('[deleteSegment] Error:', error);
    throw new Error('Failed to delete segment');
  }
}

/**
 * Update a segment's name and description.
 * @param {string} segmentId - The unique segment identifier
 * @param {Object} updates - Fields to update
 * @param {string} [updates.name] - New segment name
 * @param {string} [updates.description] - New segment description
 * @returns {Promise<Object|null>} The updated segment document
 */
async function updateSegment(segmentId, updates) {
  try {
    const allowedUpdates = {};
    if (updates.name) {
      allowedUpdates.name = updates.name;
    }
    if (updates.description) {
      allowedUpdates.description = updates.description;
    }

    if (Object.keys(allowedUpdates).length === 0) {
      return await getSegmentById(segmentId);
    }

    return await Segment.findOneAndUpdate({ segmentId }, allowedUpdates, { new: true }).lean();
  } catch (error) {
    logger.error('[updateSegment] Error:', error);
    throw new Error('Failed to update segment');
  }
}

module.exports = {
  getSegments,
  getSegmentById,
  createSegment,
  updateSegment,
  updateSegmentExecution,
  deleteSegment,
};
