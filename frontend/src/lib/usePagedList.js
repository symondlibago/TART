import { useState, useEffect, useRef, useCallback, useMemo } from 'react';

/**
 * Fetches a filtered, paged list from the API.
 *
 * Filtering is done by the server, not by trimming an array in the browser.
 * That matters once a list is paged: filtering only the rows that happen to be
 * loaded would quietly hide matches that sit further down the table.
 *
 * Typing is debounced so each keystroke does not become a request.
 *
 * @param fetcher (params) => Promise<Response>
 * @param filters plain object of query params
 */
export function usePagedList(fetcher, filters, { debounceMs = 300, pageSize = 100 } = {}) {
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState({ total: 0, has_more: false });
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');

  // Stable identity for the filters, so the effect fires on value changes only
  const key = JSON.stringify(filters);
  const filtersRef = useRef(filters);
  filtersRef.current = filters;

  // Lets a slow earlier response lose to a newer one
  const requestId = useRef(0);

  const run = useCallback(async (offset, { append }) => {
    const id = ++requestId.current;
    append ? setLoadingMore(true) : setLoading(true);
    setError('');

    try {
      const response = await fetcher({ ...filtersRef.current, limit: pageSize, offset });
      const data = await response.json();
      if (id !== requestId.current) return; // a newer request already won

      if (data.success) {
        setItems((prev) => (append ? [...prev, ...data.data] : data.data));
        setMeta(data.meta ?? { total: data.data.length, has_more: false });
      } else {
        setError(data.message || 'Could not load the list.');
      }
    } catch (e) {
      if (id === requestId.current) {
        console.error(e);
        setError('Could not reach the server.');
      }
    } finally {
      if (id === requestId.current) {
        append ? setLoadingMore(false) : setLoading(false);
      }
    }
  }, [fetcher, pageSize]);

  useEffect(() => {
    const t = setTimeout(() => run(0, { append: false }), debounceMs);
    return () => clearTimeout(t);
    // run is stable; key captures every filter value
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, debounceMs]);

  const loadMore = useCallback(() => {
    if (!meta.has_more || loadingMore) return;
    run(items.length, { append: true });
  }, [meta.has_more, loadingMore, items.length, run]);

  const reload = useCallback(() => run(0, { append: false }), [run]);

  /** Drop a row locally after a delete, keeping the total honest. */
  const removeItem = useCallback((id) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
    setMeta((m) => ({ ...m, total: Math.max(0, m.total - 1) }));
  }, []);

  return useMemo(
    () => ({ items, meta, loading, loadingMore, error, loadMore, reload, removeItem, setItems }),
    [items, meta, loading, loadingMore, error, loadMore, reload, removeItem]
  );
}

export default usePagedList;
