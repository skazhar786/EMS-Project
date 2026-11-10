import { Construction } from 'lucide-react';

// Honest placeholder for modules that have not been built yet.
export default function ComingSoon({ title, phase }) {
  return (
    <div className="card mx-auto mt-10 max-w-lg p-8 text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-600">
        <Construction className="h-6 w-6" />
      </div>
      <h1 className="text-lg font-semibold text-slate-900">{title}</h1>
      <p className="mt-2 text-sm text-slate-500">
        This module is not built yet. It will be implemented in <strong>{phase}</strong> of the project.
      </p>
    </div>
  );
}
