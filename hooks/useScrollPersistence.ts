import { useEffect, useRef, useCallback } from 'react';

/**
 * Custom hook for managing scroll position persistence
 * Restores scroll position when dependencies change and tracks scroll changes
 */
export const useScrollPersistence = (
    scrollPosition: number,
    updateScrollPosition: (position: number) => void,
    dependencies: any[] = []
) => {
    const scrollElementRef = useRef<HTMLElement>(null);
    const isRestoringRef = useRef(false);

    // Restore scroll position when dependencies change
    useEffect(() => {
        if (scrollElementRef.current && scrollPosition > 0) {
            isRestoringRef.current = true;
            scrollElementRef.current.scrollTop = scrollPosition;
            
            // Reset the flag after a brief delay
            const timeoutId = setTimeout(() => {
                isRestoringRef.current = false;
            }, 100);
            
            return () => clearTimeout(timeoutId);
        }
    }, [scrollPosition, ...dependencies]);

    // Handle scroll events
    const handleScroll = useCallback(() => {
        if (scrollElementRef.current && !isRestoringRef.current) {
            const currentScrollTop = scrollElementRef.current.scrollTop;
            if (currentScrollTop !== scrollPosition) {
                updateScrollPosition(currentScrollTop);
            }
        }
    }, [scrollPosition, updateScrollPosition]);

    return {
        scrollElementRef,
        handleScroll
    };
};