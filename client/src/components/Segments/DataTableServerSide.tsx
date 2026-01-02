import { useEffect, useMemo, useState } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type PaginationState,
} from '@tanstack/react-table';
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Search,
} from 'lucide-react';
import type { SegmentColumn } from '~/data-provider/Segments';

interface DataTableServerSideProps {
  columns: SegmentColumn[];
  data: Record<string, unknown>[];
  // Server-side pagination props
  totalRowCount: number;
  onPaginationChange?: (pagination: PaginationState) => void;
  onSortingChange?: (sorting: SortingState) => void;
  onGlobalFilterChange?: (filter: string) => void;
  isLoading?: boolean;
}

/**
 * DataTable with server-side pagination, sorting, and filtering support.
 *
 * Use this component when:
 * - Dataset is very large (> 10,000 rows)
 * - Data must be fetched from server with pagination/filtering
 * - You want to reduce client-side memory usage
 *
 * The parent component should:
 * - Fetch data based on pagination/sorting/filter state
 * - Pass totalRowCount from server response
 * - Handle onPaginationChange, onSortingChange, onGlobalFilterChange callbacks
 */
export default function DataTableServerSide({
  columns,
  data,
  totalRowCount,
  onPaginationChange,
  onSortingChange,
  onGlobalFilterChange,
  isLoading = false,
}: DataTableServerSideProps) {
  // Table state management
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });

  // Notify parent component of state changes
  useEffect(() => {
    onPaginationChange?.(pagination);
  }, [pagination, onPaginationChange]);

  useEffect(() => {
    onSortingChange?.(sorting);
  }, [sorting, onSortingChange]);

  useEffect(() => {
    // Debounce global filter to avoid too many server requests
    const timer = setTimeout(() => {
      onGlobalFilterChange?.(globalFilter);
    }, 300);
    return () => clearTimeout(timer);
  }, [globalFilter, onGlobalFilterChange]);

  /**
   * Format cell value based on column type
   */
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

  /**
   * Build TanStack Table column definitions from dynamic segment columns
   */
  const tableColumns = useMemo<ColumnDef<Record<string, unknown>>[]>(() => {
    return columns.map((col) => ({
      id: col.key,
      accessorKey: col.key,
      header: col.label,
      cell: ({ getValue }) => formatCell(getValue(), col.type),
    }));
  }, [columns]);

  /**
   * Calculate page count from total row count
   */
  const pageCount = Math.ceil(totalRowCount / pagination.pageSize);

  /**
   * Create table instance with TanStack Table (server-side mode)
   */
  const table = useReactTable({
    data,
    columns: tableColumns,
    // Server-side mode configuration
    manualPagination: true,
    manualSorting: true,
    manualFiltering: true,
    pageCount,
    // State management
    state: {
      sorting,
      globalFilter,
      pagination,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: setPagination,
    // Only core row model for server-side
    getCoreRowModel: getCoreRowModel(),
  });

  if (data.length === 0 && !isLoading) {
    return (
      <div className="flex h-full flex-col items-center justify-center rounded-lg border border-border-light bg-surface-secondary p-12">
        <p className="text-center text-text-secondary">
          {globalFilter
            ? 'Tidak ada data yang sesuai dengan pencarian'
            : 'Tidak ada data yang ditemukan'}
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-4 overflow-hidden rounded-lg border border-border-light">
      {/* Search Bar */}
      <div className="border-b border-border-light bg-surface-secondary px-4 py-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
          <input
            type="text"
            value={globalFilter ?? ''}
            onChange={(e) => setGlobalFilter(e.target.value)}
            placeholder="Cari customer..."
            disabled={isLoading}
            className="w-full rounded-lg border border-border-light bg-surface-primary py-2 pl-10 pr-4 text-sm text-text-primary placeholder:text-text-tertiary focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>
      </div>

      {/* Table */}
      <div className="relative flex-1 overflow-auto">
        {/* Loading overlay */}
        {isLoading && (
          <div className="bg-surface-primary/50 absolute inset-0 z-10 flex items-center justify-center backdrop-blur-sm">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-text-secondary border-t-transparent" />
          </div>
        )}

        <table className="w-full">
          <thead className="sticky top-0 bg-surface-secondary">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="whitespace-nowrap px-4 py-3 text-left text-sm font-semibold text-text-primary"
                  >
                    {header.isPlaceholder ? null : (
                      <div
                        className="flex cursor-pointer select-none items-center gap-2 hover:text-blue-600"
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        <span className="inline-flex">
                          {header.column.getIsSorted() === 'asc' ? (
                            <ArrowUp className="h-4 w-4" />
                          ) : header.column.getIsSorted() === 'desc' ? (
                            <ArrowDown className="h-4 w-4" />
                          ) : (
                            <ArrowUpDown className="h-4 w-4 opacity-50" />
                          )}
                        </span>
                      </div>
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-border-light bg-surface-primary">
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id} className="transition-colors hover:bg-surface-hover">
                {row.getVisibleCells().map((cell) => {
                  const column = columns.find((c) => c.key === cell.column.id);
                  return (
                    <td
                      key={cell.id}
                      className={`whitespace-nowrap px-4 py-3 text-sm text-text-secondary ${
                        column?.type === 'currency' || column?.type === 'number'
                          ? 'text-right font-mono'
                          : ''
                      }`}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      <div className="flex items-center justify-between border-t border-border-light bg-surface-secondary px-4 py-3">
        {/* Page info */}
        <div className="flex items-center gap-4">
          <p className="text-sm text-text-tertiary">
            {totalRowCount.toLocaleString('id-ID')} total rows
            {globalFilter && ' (filtered)'}
          </p>
          <div className="flex items-center gap-2">
            <label htmlFor="page-size" className="text-sm text-text-tertiary">
              Rows per page:
            </label>
            <select
              id="page-size"
              value={table.getState().pagination.pageSize}
              onChange={(e) => {
                table.setPageSize(Number(e.target.value));
              }}
              disabled={isLoading}
              className="rounded border border-border-light bg-surface-primary px-2 py-1 text-sm text-text-primary focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {[10, 20, 50, 100].map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Navigation buttons */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-text-tertiary">
            Page {table.getState().pagination.pageIndex + 1} of {pageCount || 1}
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage() || isLoading}
              className="rounded p-1 text-text-secondary transition-colors hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="First page"
            >
              <ChevronsLeft className="h-5 w-5" />
            </button>
            <button
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage() || isLoading}
              className="rounded p-1 text-text-secondary transition-colors hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Previous page"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage() || isLoading}
              className="rounded p-1 text-text-secondary transition-colors hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Next page"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
            <button
              onClick={() => table.setPageIndex(pageCount - 1)}
              disabled={!table.getCanNextPage() || isLoading}
              className="rounded p-1 text-text-secondary transition-colors hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Last page"
            >
              <ChevronsRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
