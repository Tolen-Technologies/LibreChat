import { useMemo, useState, useCallback, useRef } from 'react';
import { Outlet, useParams } from 'react-router-dom';
import DashBreadcrumb from '~/routes/Layouts/DashBreadcrumb';
import SegmentsSidebar from './SegmentsSidebar';
import { useMediaQuery } from '@librechat/client';
import { cn } from '~/utils';

export default function SegmentsView() {
  const params = useParams();
  const isDetailView = useMemo(() => !!params.segmentId, [params]);
  const isSmallerScreen = useMediaQuery('(max-width: 768px)');
  const [panelVisible, setPanelVisible] = useState(!isSmallerScreen);
  const openPanelRef = useRef<HTMLButtonElement>(null);
  const closePanelRef = useRef<HTMLButtonElement>(null);

  const togglePanel = useCallback(() => {
    setPanelVisible((prev) => {
      const newValue = !prev;
      requestAnimationFrame(() => {
        if (newValue) {
          closePanelRef?.current?.focus();
        } else {
          openPanelRef?.current?.focus();
        }
      });
      return newValue;
    });
  }, []);

  return (
    <div className="flex h-screen w-full flex-col bg-surface-primary p-0 lg:p-2">
      <DashBreadcrumb
        showToggle={isSmallerScreen && isDetailView}
        onToggle={togglePanel}
        openPanelRef={openPanelRef}
      />
      <div className="flex w-full flex-grow flex-row overflow-hidden">
        {isSmallerScreen && panelVisible && isDetailView && (
          <div
            className="fixed inset-0 z-40 bg-black/50 transition-opacity"
            onClick={togglePanel}
            role="button"
            tabIndex={0}
            aria-label="Toggle sidebar"
          />
        )}

        {(!isSmallerScreen || !isDetailView || panelVisible) && (
          <div
            className={cn(
              'transition-transform duration-300 ease-in-out',
              isSmallerScreen && isDetailView
                ? 'fixed left-0 top-0 z-50 h-full w-[320px] bg-surface-primary'
                : 'flex',
            )}
          >
            <SegmentsSidebar
              closePanelRef={closePanelRef}
              onClose={isSmallerScreen && isDetailView ? togglePanel : undefined}
            />
          </div>
        )}

        <div
          className={cn(
            'scrollbar-gutter-stable w-full overflow-y-auto lg:w-3/4 xl:w-3/4',
            isDetailView ? 'block' : 'hidden md:block',
          )}
        >
          <Outlet />
        </div>
      </div>
    </div>
  );
}
