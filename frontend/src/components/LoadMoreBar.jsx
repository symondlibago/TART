import React from 'react';
import { Loader2, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';

/** "Showing 100 of 1,430" plus a Load more button when there is more. */
export function LoadMoreBar({ shown, total, hasMore, loading, onLoadMore }) {
  if (!total) return null;

  return (
    <div className="flex flex-col items-center gap-3 py-5">
      <p className="text-xs text-gray-400 tabular-nums">
        Showing {shown.toLocaleString()} of {total.toLocaleString()}
      </p>

      {hasMore && (
        <Button
          onClick={onLoadMore}
          disabled={loading}
          variant="ghost"
          className="rounded-xl text-indigo-700 hover:bg-indigo-50 hover:text-indigo-800"
        >
          {loading
            ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading...</>
            : <><ChevronDown className="mr-2 h-4 w-4" /> Load more</>}
        </Button>
      )}
    </div>
  );
}

export default LoadMoreBar;
