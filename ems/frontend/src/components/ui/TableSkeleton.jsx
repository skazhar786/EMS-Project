export default function TableSkeleton({ rows = 6, cols = 5 }) {
  return (
    <div className="space-y-3 p-4" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="grid gap-4" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
          {Array.from({ length: cols }).map((__, c) => <div key={c} className="skeleton h-6" />)}
        </div>
      ))}
    </div>
  );
}
