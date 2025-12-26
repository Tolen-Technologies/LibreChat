import { useNavigate, useParams, Link } from 'react-router-dom';
import { X, Database } from 'lucide-react';
import { useSegmentsQuery } from '~/data-provider/Segments';
import { cn } from '~/utils';

interface SegmentsSidebarProps {
  closePanelRef?: React.RefObject<HTMLButtonElement>;
  onClose?: () => void;
}

export default function SegmentsSidebar({ closePanelRef, onClose }: SegmentsSidebarProps) {
  const navigate = useNavigate();
  const { segmentId } = useParams();
  const { data: segments, isLoading, isError } = useSegmentsQuery();

  return (
    <aside className="flex h-full w-64 flex-col border-r border-border-light bg-surface-primary lg:w-[280px]">
      <div className="flex items-center justify-between border-b border-border-light p-4">
        <div className="flex items-center gap-2">
          <Database className="h-5 w-5 text-text-secondary" />
          <h2 className="text-lg font-semibold text-text-primary">Customer Segments</h2>
        </div>
        {onClose && (
          <button
            ref={closePanelRef}
            onClick={onClose}
            className="rounded-lg p-1 hover:bg-surface-hover"
            aria-label="Close sidebar"
          >
            <X className="h-5 w-5 text-text-secondary" />
          </button>
        )}
      </div>

      <div className="border-b border-border-light p-3">
        <p className="text-xs text-text-secondary">
          Ketik{' '}
          <code className="rounded bg-surface-secondary px-1 py-0.5 font-mono text-text-primary">
            /segment
          </code>{' '}
          di chat untuk membuat segment baru
        </p>
      </div>

      <nav className="flex-1 overflow-y-auto p-2">
        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-text-secondary border-t-transparent" />
          </div>
        ) : isError ? (
          <div className="p-4 text-center text-sm text-text-secondary">Gagal memuat segments</div>
        ) : segments?.length === 0 ? (
          <div className="p-4 text-center text-sm text-text-secondary">
            Belum ada segment. Gunakan perintah{' '}
            <code className="rounded bg-surface-secondary px-1 py-0.5 font-mono">/segment</code>{' '}
            untuk membuat segment baru.
          </div>
        ) : (
          <ul className="space-y-1">
            {segments?.map((segment) => (
              <li key={segment.segmentId}>
                <Link
                  to={`/d/segments/${segment.segmentId}`}
                  className={cn(
                    'block w-full rounded-lg px-3 py-2 text-left transition-colors',
                    segmentId === segment.segmentId
                      ? 'bg-surface-active text-text-primary'
                      : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary',
                  )}
                >
                  <div className="truncate font-medium">{segment.name}</div>
                  <div className="mt-0.5 text-xs text-text-tertiary">
                    {segment.lastRowCount != null
                      ? `${segment.lastRowCount.toLocaleString('id-ID')} customers`
                      : 'Belum dieksekusi'}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </nav>

      <div className="border-t border-border-light p-3">
        <Link
          to="/c/new"
          className="block w-full rounded-lg bg-surface-secondary px-4 py-2 text-center text-sm font-medium text-text-primary transition-colors hover:bg-surface-hover"
        >
          Kembali ke Chat
        </Link>
      </div>
    </aside>
  );
}
