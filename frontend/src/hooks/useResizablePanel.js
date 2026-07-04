import { useState, useRef, useCallback, useEffect } from 'react';

// Encapsulates the mouse-drag panel resize logic with percentage-based
// localStorage persistence. The panel size is tracked in pixels, but persisted
// as a percentage of the container width so saved layouts adapt to window size.
//
// - storageKey:     localStorage key holding the saved percentage
// - initialSize:    initial pixel size used before the container is measured
// - defaultPercent: percentage applied when nothing is saved yet
// - minPercent / maxPercent: percentage bounds for the panel
// - minPx:          optional absolute minimum width in pixels
export function useResizablePanel({ storageKey, initialSize, defaultPercent, minPercent, maxPercent, minPx = 0 }) {
  const [size, setSize] = useState(initialSize);
  const [isResizing, setIsResizing] = useState(false);
  const containerRef = useRef(null);

  // Save panel size percentage to localStorage
  const savePercentage = useCallback((width) => {
    if (containerRef.current) {
      const containerWidth = containerRef.current.getBoundingClientRect().width;
      const percentage = (width / containerWidth) * 100;
      localStorage.setItem(storageKey, percentage.toString());
    }
  }, [storageKey]);

  // Load and apply saved percentage
  const loadSavedSize = useCallback(() => {
    if (containerRef.current) {
      const containerWidth = containerRef.current.getBoundingClientRect().width;
      const minWidth = Math.max(minPx, (minPercent / 100) * containerWidth);
      const savedPercentage = localStorage.getItem(storageKey);
      if (savedPercentage) {
        // Apply constraints
        const constrainedPercentage = Math.min(Math.max(parseFloat(savedPercentage), minPercent), maxPercent);
        const calculatedWidth = (constrainedPercentage / 100) * containerWidth;
        setSize(Math.max(calculatedWidth, minWidth));
      } else {
        // Default percentage if no saved value, but respect minimum width
        setSize(Math.max((defaultPercent / 100) * containerWidth, minWidth));
      }
    }
  }, [storageKey, defaultPercent, minPercent, maxPercent, minPx]);

  const startResize = (e) => {
    e.preventDefault();
    setIsResizing(true);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  const handleMouseMove = useCallback((e) => {
    if (!isResizing || !containerRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const containerWidth = containerRect.width;
    const mouseX = e.clientX - containerRect.left;

    const minWidth = Math.max(minPx, (minPercent / 100) * containerWidth);
    const maxWidth = (maxPercent / 100) * containerWidth;

    // Clamp the width between min and max
    const newWidth = Math.min(Math.max(mouseX, minWidth), maxWidth);

    setSize(newWidth);
    savePercentage(newWidth);
  }, [isResizing, savePercentage, minPercent, maxPercent, minPx]);

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }, []);

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isResizing, handleMouseMove, handleMouseUp]);

  // Initialize panel size responsively and reload saved size on window resize
  useEffect(() => {
    const handleResize = () => {
      loadSavedSize();
    };

    // Load saved size on mount
    loadSavedSize();

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [loadSavedSize]);

  return { size, isResizing, startResize, containerRef };
}
