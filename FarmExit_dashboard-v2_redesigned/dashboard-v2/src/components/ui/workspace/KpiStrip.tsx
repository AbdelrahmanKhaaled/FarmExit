import { cn } from '@/lib/cn';
import { CardBody, CardHeader } from '../CardChrome';

const accents = ['#55bf8b', '#e2bc70', '#8bb2b7', '#66a7e0'] as const;

export function KpiStrip({ items }: { items: { label: string; value: string; hint?: string }[] }) {
  return (
    <div className="crm-kpi-grid">
      {items.map((item, i) => (
        <article key={item.label} className={cn('crm-module-kpi', i === 0 && 'crm-module-kpi--primary')}>
          <div className="crm-module-kpi__heading">
            <span className="crm-module-kpi__dot" style={{ backgroundColor: accents[i % accents.length] }} aria-hidden />
            <span>{item.label}</span>
          </div>
          <strong className="crm-module-kpi__value">{item.value}</strong>
          {item.hint && <p className="crm-module-kpi__hint">{item.hint}</p>}
          <span className="crm-module-kpi__corner" aria-hidden />
        </article>
      ))}
    </div>
  );
}

export function Panel({ title, description, children, className }: { title: string; description?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn('luxe-card overflow-hidden', className)}>
      <CardHeader title={title} description={description} />
      <CardBody>{children}</CardBody>
    </section>
  );
}
