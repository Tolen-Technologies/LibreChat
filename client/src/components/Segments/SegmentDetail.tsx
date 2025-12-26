import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { RefreshCw, Trash2, Play } from 'lucide-react';
import { useToastContext } from '@librechat/client';
import {
  useSegmentQuery,
  useExecuteSegmentMutation,
  useDeleteSegmentMutation,
} from '~/data-provider/Segments';
import DataTable from './DataTable';
import type { SegmentExecuteResult } from '~/data-provider/Segments';

export default function SegmentDetail() {
  const { segmentId } = useParams<{ segmentId: string }>();
  const navigate = useNavigate();
  const { showToast } = useToastContext();
  const [executeResult, setExecuteResult] = useState<SegmentExecuteResult | null>(null);

  const { data: segment, isLoading: isLoadingSegment } = useSegmentQuery(segmentId!);
  const executeMutation = useExecuteSegmentMutation(segmentId!);
  const deleteMutation = useDeleteSegmentMutation();

  const handleExecute = async () => {
    try {
      const result = await executeMutation.mutateAsync();
      setExecuteResult(result);
      showToast({
        message: `Query berhasil! ${result.rowCount.toLocaleString('id-ID')} rows ditemukan.`,
        status: 'success',
      });
    } catch (error) {
      console.error('[SegmentDetail] Execute error:', error);
      showToast({
        message: 'Gagal menjalankan query. Silakan coba lagi.',
        status: 'error',
      });
    }
  };

  const handleDelete = async () => {
    if (!confirm('Hapus segment ini? Tindakan ini tidak dapat dibatalkan.')) {
      return;
    }

    try {
      await deleteMutation.mutateAsync(segmentId!);
      showToast({
        message: 'Segment berhasil dihapus.',
        status: 'success',
      });
      navigate('/d/segments');
    } catch (error) {
      console.error('[SegmentDetail] Delete error:', error);
      showToast({
        message: 'Gagal menghapus segment. Silakan coba lagi.',
        status: 'error',
      });
    }
  };

  if (isLoadingSegment) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-text-secondary border-t-transparent" />
      </div>
    );
  }

  if (!segment) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-6">
        <p className="text-lg text-text-secondary">Segment tidak ditemukan</p>
        <button
          onClick={() => navigate('/d/segments')}
          className="mt-4 rounded-lg bg-surface-secondary px-4 py-2 text-sm font-medium text-text-primary hover:bg-surface-hover"
        >
          Kembali ke daftar segment
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col p-6">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-text-primary">{segment.name}</h1>
          <p className="mt-1 text-text-secondary">{segment.description}</p>
          {segment.lastExecutedAt && (
            <p className="mt-2 text-xs text-text-tertiary">
              Terakhir dieksekusi:{' '}
              {new Date(segment.lastExecutedAt).toLocaleString('id-ID', {
                dateStyle: 'medium',
                timeStyle: 'short',
              })}
              {segment.lastRowCount != null &&
                ` • ${segment.lastRowCount.toLocaleString('id-ID')} customers`}
            </p>
          )}
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleExecute}
            disabled={executeMutation.isLoading}
            className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {executeMutation.isLoading ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            {executeMutation.isLoading ? 'Executing...' : 'Execute'}
          </button>
          <button
            onClick={handleDelete}
            disabled={deleteMutation.isLoading}
            className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Delete segment"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-hidden">
        {executeResult ? (
          <DataTable columns={executeResult.columns} data={executeResult.rows} />
        ) : (
          <div className="flex h-full flex-col items-center justify-center rounded-lg border border-border-light bg-surface-secondary p-12">
            <Play className="mb-4 h-12 w-12 text-text-tertiary" />
            <p className="text-center text-text-secondary">
              Klik tombol "Execute" untuk menampilkan data segment
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
