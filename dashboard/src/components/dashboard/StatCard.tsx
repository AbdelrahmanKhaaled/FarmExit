import { cn } from '@/lib/cn';

export function StatCard({
  label, value, hint, icon, accent = 'green', featured = false,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: React.ReactNode;
  accent?: 'green' | 'gold';
  featured?: boolean;
}) {
  return (
    <article className={cn('crm-kpi', featured && 'crm-kpi--featured', accent === 'gold' && 'crm-kpi--gold')}>
      <div className="crm-kpi__top">
        <span className="crm-kpi__label">{label}</span>
        <span className="crm-kpi__icon" aria-hidden>{icon}</span>
      </div>
      <div className="crm-kpi__value">{value}</div>
      <div className="crm-kpi__footer">
        <span className="crm-kpi__accent" aria-hidden />
        {hint && <span className="crm-kpi__hint">{hint}</span>}
      </div>
      <svg aria-hidden="true" className="crm-kpi__decoration" viewBox="0 0 150 90" fill="none">
        <path d="M-8 89C36 62 48 85 78 40S133 26 160-6M-8 108C36 81 48 104 78 59S133 45 160 13M-8 127C36 100 48 123 78 78S133 64 160 32" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    </article>
  );
}
