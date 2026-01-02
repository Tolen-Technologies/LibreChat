import { useEffect } from 'react';
import CanvasPage from '~/components/Canvas/CanvasPage';

export default function CanvasRoute() {
  useEffect(() => {
    document.title = 'Customer Canvas | LibreChat';
  }, []);

  return <CanvasPage />;
}
