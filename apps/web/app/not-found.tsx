import Link from 'next/link';
import { Button } from '@nirmitee/ui';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center background-primary">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-brand mb-4">404</h1>
        <h2 className="text-h2 text-primary mb-4">Page Not Found</h2>
        <p className="text-secondary mb-6">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <Link href="/">
          <Button>Go Home</Button>
        </Link>
      </div>
    </div>
  );
}
