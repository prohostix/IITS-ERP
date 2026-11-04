import { useState, useEffect, useCallback, useMemo } from 'react';

/**
 * Custom hook to maintain filter states synchronized with browser localStorage.
 * Ensures filters survive page refreshes, and only reset when explicitly cleared.
 */
export function usePersistentFilters<T extends Record<string, any>>(
  storageKey: string,
  initialDefaults: T
): [
  T,
  (updater: Partial<T> | ((prev: T) => T)) => void,
  () => void,
  boolean,
  (field: keyof T, value: any) => void
] {
  const fullKey = `erp_persist_filters_${storageKey}`;

  // Initialize state from localStorage or fallback to defaults
  const [filters, setFiltersState] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(fullKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        return { ...initialDefaults, ...parsed };
      }
    } catch (e) {
      console.warn(`Failed to parse stored filters for key ${fullKey}:`, e);
    }
    return initialDefaults;
  });

  // Save to localStorage whenever filters change
  useEffect(() => {
    try {
      localStorage.setItem(fullKey, JSON.stringify(filters));
    } catch (e) {
      console.warn(`Failed to persist filters for key ${fullKey}:`, e);
    }
  }, [fullKey, filters]);

  // Update filters (accepts partial object or functional updater)
  const setFilters = useCallback((updater: Partial<T> | ((prev: T) => T)) => {
    setFiltersState(prev => {
      const next = typeof updater === 'function' ? updater(prev) : { ...prev, ...updater };
      return next;
    });
  }, []);

  // Update a single field
  const setField = useCallback((field: keyof T, value: any) => {
    setFiltersState(prev => ({ ...prev, [field]: value }));
  }, []);

  // Clear all filters: removes from localStorage and restores initial defaults
  const clearFilters = useCallback(() => {
    try {
      localStorage.removeItem(fullKey);
    } catch (e) {
      console.warn(`Failed to remove stored filters for key ${fullKey}:`, e);
    }
    setFiltersState(initialDefaults);
  }, [fullKey, initialDefaults]);

  // Determines if any filter value differs from default
  const isFiltered = useMemo(() => {
    return Object.keys(initialDefaults).some(key => {
      const current = filters[key];
      const initial = initialDefaults[key];

      if (Array.isArray(current) && Array.isArray(initial)) {
        if (current.length !== initial.length) return true;
        return current.some((val, idx) => val !== initial[idx]);
      }

      return current !== initial;
    });
  }, [filters, initialDefaults]);

  return [filters, setFilters, clearFilters, isFiltered, setField];
}
