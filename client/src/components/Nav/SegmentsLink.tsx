import { useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button, TableIcon, TooltipAnchor, useMediaQuery } from '@librechat/client';
import { useLocalize } from '~/hooks';
import { cn } from '~/utils';

interface SegmentsLinkProps {
  toggleNav?: () => void;
}

export default function SegmentsLink({ toggleNav }: SegmentsLinkProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const localize = useLocalize();
  const isSmallScreen = useMediaQuery('(max-width: 768px)');

  const isActive = location.pathname === '/segments';

  const handleClick = useCallback(() => {
    navigate('/segments');
    if (isSmallScreen && toggleNav) {
      toggleNav();
    }
  }, [navigate, isSmallScreen, toggleNav]);

  return (
    <TooltipAnchor
      description={localize('com_ui_segments') || 'Segments'}
      render={
        <Button
          size="icon"
          variant="outline"
          data-testid="segments-link-button"
          aria-label={localize('com_ui_segments') || 'Segments'}
          className={cn(
            'flex items-center justify-center',
            'size-10 border-none text-text-primary hover:bg-accent hover:text-accent-foreground',
            'rounded-full border-none p-2 hover:bg-surface-hover md:rounded-xl',
            isActive ? 'bg-surface-hover' : '',
          )}
          onClick={handleClick}
        >
          <TableIcon aria-hidden="true" className="icon-lg text-text-primary" />
        </Button>
      }
    />
  );
}
