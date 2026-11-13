'use client';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

export type Item = { id: string | number; title: string; meta: string; tag?: string };

export default function DetailPage({ title, subtitle, items }: {
  title: string; subtitle: string; items: Item[];
}) {
  const [q, setQ] = useState('');
  const [n, setN] = useState(0);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setN(items.length); return; }
    let f = 0; const steps = 24;
    const t = setInterval(() => {
      f++; setN(Math.round((items.length * f) / steps));
      if (f >= steps) clearInterval(t);
    }, 28);
    return () => clearInterval(t);
  }, [items.length]);

  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? items.filter(i => `${i.title} ${i.meta} ${i.tag ?? ''}`.toLowerCase().includes(s)) : items;
  }, [q, items]);

  return (
    <div className="min-h-screen bg-midnight text-slate-100">
      <div className="mx-auto max-w-4xl px-6 py-12">
        <Link href="/" className="mb-4 inline-block text-sm text-cyber-teal hover:text-cyber-cyan">
          ← Back to home
        </Link>
        <header className="mb-8 flex flex-wrap items-end gap-5">
          <div className="text-6xl font-bold leading-none tabular-nums text-cyber-teal sm:text-7xl">{n}</div>
          <div>
            <h1 className="text-3xl font-bold">{title}</h1>
            <p className="mt-1 text-sm text-slate-400">{subtitle}</p>
          </div>
        </header>
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder={`Search ${title.toLowerCase()}`}
          aria-label={`Search ${title}`}
          className="mb-4 w-full rounded-lg border border-slate-700 bg-slate-900/60 px-4 py-3 text-base text-slate-100 placeholder:text-slate-500 focus:outline focus:outline-2 focus:outline-cyber-teal"
        />
        {shown.length === 0 ? (
          <div className="glass-card p-8 text-center text-slate-400">
            {items.length === 0 ? 'Nothing here yet.' : `No match for “${q}”. Try a shorter search.`}
          </div>
        ) : (
          <ul className="space-y-3">
            {shown.map(i => (
              <li key={i.id} className="glass-card flex items-center justify-between gap-4 p-4">
                <div className="min-w-0">
                  <p className="font-semibold">{i.title}</p>
                  <p className="text-sm text-slate-400">{i.meta}</p>
                </div>
                {i.tag && (
                  <span className="shrink-0 rounded-full border border-cyber-teal/40 px-3 py-0.5 text-xs text-cyber-teal">
                    {i.tag}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
