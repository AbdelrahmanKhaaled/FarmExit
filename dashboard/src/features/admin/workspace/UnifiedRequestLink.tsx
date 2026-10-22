import { Link } from '@/i18n/navigation';

export function UnifiedRequestLink({ requestId, label }: { requestId: string; label: string }) {
  return (
    <Link href={`/admin/requests/${requestId}`} className="text-xs font-semibold text-[var(--admin-brand-primary)] hover:underline">
      {label}
    </Link>
  );
}
