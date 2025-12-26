import type { SegmentColumn } from '~/data-provider/Segments';

interface DataTableProps {
  columns: SegmentColumn[];
  data: Record<string, unknown>[];
}

export default function DataTable({ columns, data }: DataTableProps) {
  const formatCell = (value: unknown, type: string): string => {
    if (value === null || value === undefined) {
      return '-';
    }

    switch (type) {
      case 'currency':
        return new Intl.NumberFormat('id-ID', {
          style: 'currency',
          currency: 'IDR',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(Number(value));
      case 'date':
        try {
          return new Date(String(value)).toLocaleDateString('id-ID', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          });
        } catch {
          return String(value);
        }
      case 'number':
        return new Intl.NumberFormat('id-ID').format(Number(value));
      default:
        return String(value);
    }
  };

  if (data.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center rounded-lg border border-border-light bg-surface-secondary p-12">
        <p className="text-center text-text-secondary">Tidak ada data yang ditemukan</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-lg border border-border-light">
      <div className="flex-1 overflow-auto">
        <table className="w-full">
          <thead className="sticky top-0 bg-surface-secondary">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className="whitespace-nowrap px-4 py-3 text-left text-sm font-semibold text-text-primary"
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border-light bg-surface-primary">
            {data.map((row, rowIndex) => (
              <tr key={rowIndex} className="transition-colors hover:bg-surface-hover">
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={`whitespace-nowrap px-4 py-3 text-sm text-text-secondary ${
                      column.type === 'currency' || column.type === 'number'
                        ? 'text-right font-mono'
                        : ''
                    }`}
                  >
                    {formatCell(row[column.key], column.type)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="border-t border-border-light bg-surface-secondary px-4 py-2">
        <p className="text-sm text-text-tertiary">{data.length.toLocaleString('id-ID')} rows</p>
      </div>
    </div>
  );
}
