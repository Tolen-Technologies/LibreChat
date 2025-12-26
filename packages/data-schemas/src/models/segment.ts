import segmentSchema from '~/schema/segment';
import type { ISegment } from '~/types';

/**
 * Creates or returns the Segment model using the provided mongoose instance and schema.
 */
export function createSegmentModel(mongoose: typeof import('mongoose')) {
  return mongoose.models.Segment || mongoose.model<ISegment>('Segment', segmentSchema);
}
