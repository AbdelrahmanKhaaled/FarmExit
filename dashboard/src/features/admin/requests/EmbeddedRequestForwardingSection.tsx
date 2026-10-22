import { apiFetchAdminResult } from '@/lib/admin/session.server';
import type { StaffRequestDetail } from '@/lib/api/types/staff';
import { RequestForwardingPanel, type RequestForwardingRow } from './RequestForwardingPanel';
import { RequestHubForwardingLink } from './RequestHubForwardingLink';

type Props = {
  requestId: string;
  accessToken: string;
  canForward: boolean;
  canRecordDecision: boolean;
  /** When true, only show link to unified hub (specialized modules). */
  linkOnly?: boolean;
};

export async function EmbeddedRequestForwardingSection({
  requestId,
  accessToken,
  canForward,
  canRecordDecision,
  linkOnly = false,
}: Props) {
  if (linkOnly) {
    return <RequestHubForwardingLink requestId={requestId} />;
  }

  const res = await apiFetchAdminResult<StaffRequestDetail>(`/staff/requests/${requestId}`, accessToken);
  if (!res.ok) {
    return <RequestHubForwardingLink requestId={requestId} />;
  }

  const forwardings = (res.data.forwardings as RequestForwardingRow[]) ?? [];
  return (
    <div className="space-y-2">
      <RequestForwardingPanel
        requestId={requestId}
        forwardings={forwardings}
        canForward={canForward}
        canRecordDecision={canRecordDecision}
      />
      <RequestHubForwardingLink requestId={requestId} variant="secondary" />
    </div>
  );
}
