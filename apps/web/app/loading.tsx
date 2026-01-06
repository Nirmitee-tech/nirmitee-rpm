export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center background-primary">
      <div className="flex flex-col items-center gap-4">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand border-t-transparent" />
        <p className="text-secondary text-sm">Loading...</p>
      </div>
    </div>
  );
}
