import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import { request } from 'librechat-data-provider';

/**
 * Represents a column in a segment result.
 */
export interface SegmentColumn {
  key: string;
  label: string;
  type: 'string' | 'number' | 'date' | 'currency';
}

/**
 * Represents a customer segment.
 */
export interface Segment {
  segmentId: string;
  name: string;
  description: string;
  sqlQuery: string;
  columns: SegmentColumn[];
  createdBy: string;
  lastExecutedAt?: string;
  lastRowCount?: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Request payload for creating a new segment.
 */
export interface CreateSegmentRequest {
  description: string;
  name?: string;
}

/**
 * Result of executing a segment query.
 */
export interface SegmentExecuteResult {
  columns: SegmentColumn[];
  rows: Record<string, unknown>[];
  rowCount: number;
  executedAt: string;
}

// API functions
const segmentsApi = {
  getSegments: (): Promise<Segment[]> => request.get('/api/segments'),
  getSegment: (segmentId: string): Promise<Segment> => request.get(`/api/segments/${segmentId}`),
  createSegment: (data: CreateSegmentRequest): Promise<Segment> =>
    request.post('/api/segments', data),
  executeSegment: (segmentId: string): Promise<SegmentExecuteResult> =>
    request.get(`/api/segments/${segmentId}/execute`),
  deleteSegment: (segmentId: string): Promise<{ success: boolean }> =>
    request.delete(`/api/segments/${segmentId}`),
};

// Query key factory
export const segmentsQueryKeys = {
  all: ['segments'] as const,
  lists: () => [...segmentsQueryKeys.all, 'list'] as const,
  list: () => [...segmentsQueryKeys.lists()] as const,
  details: () => [...segmentsQueryKeys.all, 'detail'] as const,
  detail: (segmentId: string) => [...segmentsQueryKeys.details(), segmentId] as const,
  executions: () => [...segmentsQueryKeys.all, 'execution'] as const,
  execution: (segmentId: string) => [...segmentsQueryKeys.executions(), segmentId] as const,
};

/**
 * Hook to fetch all segments.
 */
export const useSegmentsQuery = (
  config?: Omit<UseQueryOptions<Segment[], Error>, 'queryKey' | 'queryFn'>,
) => {
  return useQuery<Segment[], Error>({
    queryKey: segmentsQueryKeys.list(),
    queryFn: segmentsApi.getSegments,
    refetchOnWindowFocus: false,
    ...config,
  });
};

/**
 * Hook to fetch a single segment by ID.
 */
export const useSegmentQuery = (
  segmentId: string,
  config?: Omit<UseQueryOptions<Segment, Error>, 'queryKey' | 'queryFn'>,
) => {
  return useQuery<Segment, Error>({
    queryKey: segmentsQueryKeys.detail(segmentId),
    queryFn: () => segmentsApi.getSegment(segmentId),
    enabled: !!segmentId,
    refetchOnWindowFocus: false,
    ...config,
  });
};

/**
 * Hook to create a new segment.
 */
export const useCreateSegmentMutation = (
  config?: Omit<UseMutationOptions<Segment, Error, CreateSegmentRequest>, 'mutationFn'>,
) => {
  const queryClient = useQueryClient();

  return useMutation<Segment, Error, CreateSegmentRequest>({
    mutationFn: segmentsApi.createSegment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: segmentsQueryKeys.lists() });
    },
    ...config,
  });
};

/**
 * Hook to execute a segment query.
 */
export const useExecuteSegmentMutation = (
  segmentId: string,
  config?: Omit<UseMutationOptions<SegmentExecuteResult, Error, void>, 'mutationFn'>,
) => {
  const queryClient = useQueryClient();

  return useMutation<SegmentExecuteResult, Error, void>({
    mutationFn: () => segmentsApi.executeSegment(segmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: segmentsQueryKeys.detail(segmentId) });
    },
    ...config,
  });
};

/**
 * Hook to delete a segment.
 */
export const useDeleteSegmentMutation = (
  config?: Omit<UseMutationOptions<{ success: boolean }, Error, string>, 'mutationFn'>,
) => {
  const queryClient = useQueryClient();

  return useMutation<{ success: boolean }, Error, string>({
    mutationFn: segmentsApi.deleteSegment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: segmentsQueryKeys.lists() });
    },
    ...config,
  });
};

/**
 * Standalone function to create a segment (for use outside React components).
 */
export const createSegment = segmentsApi.createSegment;

export default segmentsApi;
