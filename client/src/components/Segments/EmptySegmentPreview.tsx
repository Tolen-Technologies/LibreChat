import { Database } from 'lucide-react';

export default function EmptySegmentPreview() {
  return (
    <div className="flex h-full flex-col items-center justify-center p-6">
      <Database className="mb-4 h-16 w-16 text-text-tertiary" />
      <h2 className="text-xl font-semibold text-text-primary">Customer Segments</h2>
      <p className="mt-2 max-w-md text-center text-text-secondary">
        Pilih segment dari sidebar untuk melihat data, atau buat segment baru dengan mengetik di
        chat:
      </p>
      <code className="mt-4 rounded-lg bg-surface-secondary px-4 py-2 font-mono text-sm text-text-primary">
        /segment customer FIT yang belum transaksi 6 bulan
      </code>
    </div>
  );
}
