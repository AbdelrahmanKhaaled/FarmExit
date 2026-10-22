import { DataTable, Td, Th } from '@/design-system/workspace/DataTable';
import { StatusBadge } from '@/features/admin/workspace/StatusBadge';

export function WorkflowReviewsTable({
  reviews,
  decisionLabel,
  commentLabel,
  emptyLabel,
}: {
  reviews: { decision: string; comment: string | null }[];
  decisionLabel: string;
  commentLabel: string;
  emptyLabel: string;
}) {
  if (reviews.length === 0) {
    return <p className="text-sm text-[var(--admin-text-muted)]">{emptyLabel}</p>;
  }
  return (
    <DataTable embedded>
      <thead>
        <tr>
          <Th>{decisionLabel}</Th>
          <Th>{commentLabel}</Th>
        </tr>
      </thead>
      <tbody>
        {reviews.map((r, i) => (
          <tr key={i}>
            <Td><StatusBadge status={r.decision} /></Td>
            <Td className="max-w-md whitespace-pre-wrap">{r.comment ?? '—'}</Td>
          </tr>
        ))}
      </tbody>
    </DataTable>
  );
}
