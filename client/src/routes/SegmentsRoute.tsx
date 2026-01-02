import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { SegmentsView } from '~/components/Segments';

export default function SegmentsRoute() {
  useEffect(() => {
    document.title = 'Segments | LibreChat';
  }, []);

  return <SegmentsView />;
}
