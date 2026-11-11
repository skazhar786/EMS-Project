// A "recent activity" card: a title and up to a handful of rows.
export default function RecentList({ title, items, emptyText, renderItem }) {
  return (
    <div className="card">
      <div className="border-b border-slate-200 px-5 py-3">
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
      </div>
      {items.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-slate-500">{emptyText}</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {items.map((item) => (
            <li key={item._id} className="px-5 py-3">{renderItem(item)}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
