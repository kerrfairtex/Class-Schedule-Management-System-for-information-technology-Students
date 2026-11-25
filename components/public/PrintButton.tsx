'use client';

export function PrintButton({ label = 'Print' }: { label?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-lg border border-slate-600 px-3 py-1.5 text-sm text-slate-200 hover:border-cyber-teal print:hidden"
    >
      {label}
    </button>
  );
}
