import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import ReactQuill from 'react-quill';
import { request } from 'librechat-data-provider';

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface NotesEditorProps {
  initialValue: string;
  customerId: string;
  onSave?: (notes: string) => void;
}

export default function NotesEditor({ initialValue, customerId, onSave }: NotesEditorProps) {
  const [value, setValue] = useState(initialValue);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [hasChanges, setHasChanges] = useState(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const fadeTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedValueRef = useRef(initialValue);

  // Update value when initialValue changes (e.g., when profile is loaded)
  useEffect(() => {
    setValue(initialValue);
    lastSavedValueRef.current = initialValue;
    setHasChanges(false);
  }, [initialValue]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (fadeTimerRef.current) {
        clearTimeout(fadeTimerRef.current);
      }
    };
  }, []);

  const saveNotes = useCallback(
    async (notes: string) => {
      // Don't save if content hasn't actually changed from last saved value
      if (notes === lastSavedValueRef.current) {
        setHasChanges(false);
        return;
      }

      setSaveStatus('saving');

      try {
        await request.put(`/api/customer-profile/${customerId}/notes`, { notes });

        lastSavedValueRef.current = notes;
        setHasChanges(false);
        setSaveStatus('saved');
        onSave?.(notes);

        // Clear any existing fade timer
        if (fadeTimerRef.current) {
          clearTimeout(fadeTimerRef.current);
        }

        // Fade out the "Saved" indicator after 2 seconds
        fadeTimerRef.current = setTimeout(() => {
          setSaveStatus('idle');
        }, 2000);
      } catch (error) {
        console.error('Error saving notes:', error);
        setSaveStatus('error');

        // Reset error status after 3 seconds
        if (fadeTimerRef.current) {
          clearTimeout(fadeTimerRef.current);
        }
        fadeTimerRef.current = setTimeout(() => {
          setSaveStatus('idle');
        }, 3000);
      }
    },
    [customerId, onSave],
  );

  const handleChange = useCallback(
    (content: string) => {
      setValue(content);

      // Check if content has actually changed from last saved
      const contentChanged = content !== lastSavedValueRef.current;
      setHasChanges(contentChanged);

      // Clear existing debounce timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // Only set up auto-save if content has changed
      if (contentChanged) {
        debounceTimerRef.current = setTimeout(() => {
          saveNotes(content);
        }, 1000);
      }
    },
    [saveNotes],
  );

  // Minimal Quill configuration (no toolbar)
  const modules = useMemo(
    () => ({
      toolbar: false,
    }),
    [],
  );

  const formats = useMemo(() => ['bold', 'italic', 'underline', 'strike', 'list'], []);

  // Render save status indicator
  const renderSaveIndicator = () => {
    if (saveStatus === 'idle' && !hasChanges) {
      return null;
    }

    let statusContent: React.ReactNode;
    let statusClass = '';

    switch (saveStatus) {
      case 'saving':
        statusContent = (
          <>
            <svg
              className="size-4 animate-spin"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span>Saving...</span>
          </>
        );
        statusClass = 'text-text-tertiary';
        break;
      case 'saved':
        statusContent = (
          <>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="size-4"
            >
              <path
                fillRule="evenodd"
                d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                clipRule="evenodd"
              />
            </svg>
            <span>Saved</span>
          </>
        );
        statusClass = 'text-green-600 dark:text-green-400';
        break;
      case 'error':
        statusContent = (
          <>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="size-4"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z"
                clipRule="evenodd"
              />
            </svg>
            <span>Error saving</span>
          </>
        );
        statusClass = 'text-red-600 dark:text-red-400';
        break;
      default:
        return null;
    }

    return (
      <div
        className={`flex items-center gap-1.5 text-xs font-medium transition-opacity duration-300 ${statusClass}`}
      >
        {statusContent}
      </div>
    );
  };

  return (
    <div className="notes-editor flex h-full flex-col gap-2">
      <div className="flex justify-end">{renderSaveIndicator()}</div>
      <div className="notes-editor-container flex-1">
        <ReactQuill
          theme="bubble"
          value={value}
          onChange={handleChange}
          modules={modules}
          formats={formats}
          placeholder="Tulis catatan di sini..."
          className="notes-quill-editor min-h-[220px] text-base"
        />
      </div>
    </div>
  );
}
