import '@/styles/admin-tokens.css';
import '@/styles/admin-components.css';

/** Admin routes use cookie-backed sessions and live API data. */
export const instant = false;

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="admin-root min-h-dvh w-full min-w-0 bg-[var(--admin-bg-canvas)] font-[family-name:var(--font-manrope)] [html[dir=rtl]_&]:font-[family-name:var(--font-plex-arabic)]">
      <style>{`
        @keyframes adminFadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
        .admin-fade-in { animation: adminFadeIn 0.35s ease-out both; }
        .admin-stagger { animation: adminFadeIn 0.5s ease-out both; }
        @media (prefers-reduced-motion: reduce) {
          .admin-fade-in, .admin-stagger { animation: none; }
        }
      `}</style>
      {children}
    </div>
  );
}
