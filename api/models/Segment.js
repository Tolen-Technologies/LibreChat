const { v4: uuidv4 } = require('uuid');
const { logger } = require('@librechat/data-schemas');
const { Segment } = require('~/db/models');

/**
 * Get all segments, sorted by creation date (newest first).
 * Filters out soft-deleted segments by default.
 * @returns {Promise<Array>} Array of segment documents
 */
async function getSegments() {
  try {
    return await Segment.find({ $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }] })
      .sort({ createdAt: -1 })
      .lean();
  } catch (error) {
    logger.error('[getSegments] Error:', error);
    throw new Error('Failed to fetch segments');
  }
}

/**
 * Get a single segment by its segmentId.
 * Filters out soft-deleted segments by default.
 * @param {string} segmentId - The unique segment identifier
 * @returns {Promise<Object|null>} The segment document or null if not found
 */
async function getSegmentById(segmentId) {
  try {
    return await Segment.findOne({
      segmentId,
      $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }],
    }).lean();
  } catch (error) {
    logger.error('[getSegmentById] Error:', error);
    throw new Error('Failed to fetch segment');
  }
}

/**
 * Create a new segment.
 * @param {Object} params - Segment creation parameters
 * @param {string} [params.segmentId] - Optional pre-generated segment ID (UUID)
 * @param {string} params.name - Segment name
 * @param {string} params.description - Natural language description
 * @param {string} [params.originalPrompt] - Original user prompt for segment creation
 * @param {string} params.sqlQuery - Generated SQL query
 * @param {string} [params.viewName] - PostgreSQL view name
 * @param {Array} params.columns - Column definitions
 * @param {string} params.createdBy - User ID of creator
 * @param {Date} [params.createdDate] - Custom creation date
 * @param {boolean} [params.isDeleted] - Soft delete flag
 * @param {Date} [params.lastExecutedAt] - Last execution timestamp
 * @param {number} [params.lastRowCount] - Last row count
 * @returns {Promise<Object>} The created segment document
 */
async function createSegment({
  segmentId,
  name,
  description,
  originalPrompt,
  sqlQuery,
  viewName,
  columns,
  createdBy,
  createdDate,
  isDeleted,
  lastExecutedAt,
  lastRowCount,
}) {
  try {
    const segment = await Segment.create({
      segmentId: segmentId || uuidv4(),
      name,
      description,
      originalPrompt: originalPrompt || description,
      sqlQuery,
      viewName,
      columns,
      createdBy,
      createdDate,
      isDeleted: isDeleted || false,
      lastExecutedAt,
      lastRowCount,
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
 * Update a segment's fields.
 * @param {string} segmentId - The unique segment identifier
 * @param {Object} updates - Fields to update
 * @param {string} [updates.name] - New segment name
 * @param {string} [updates.description] - New segment description
 * @param {string} [updates.sqlQuery] - New SQL query
 * @param {Date} [updates.createdDate] - New created date
 * @param {boolean} [updates.isDeleted] - Soft delete flag
 * @param {Date} [updates.deletedAt] - Deletion timestamp
 * @returns {Promise<Object|null>} The updated segment document
 */
async function updateSegment(segmentId, updates) {
  try {
    const allowedFields = [
      'name',
      'description',
      'sqlQuery',
      'createdDate',
      'isDeleted',
      'deletedAt',
    ];
    const allowedUpdates = {};

    allowedFields.forEach((field) => {
      if (updates[field] !== undefined) {
        allowedUpdates[field] = updates[field];
      }
    });

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
