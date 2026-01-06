'use client';

import { useEffect } from 'react';
import { Button } from '@nirmitee/ui';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center background-primary">
      <div className="text-center">
        <h2 className="text-h2 text-primary mb-4">Something went wrong!</h2>
        <p className="text-secondary mb-6">{error.message || 'An unexpected error occurred.'}</p>
        <Button onClick={() => reset()}>Try again</Button>
      </div>
    </div>
  );
}
