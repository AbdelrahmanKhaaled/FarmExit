export type OpenCommunicationCaseErrorCode =
  | 'unauthorized'
  | 'forbidden'
  | 'notFound'
  | 'noAgent'
  | 'conflict'
  | 'network'
  | 'unknown';

export type OpenCommunicationCaseResult =
  | { ok: true; caseId: string }
  | { ok: false; code: OpenCommunicationCaseErrorCode; message?: string };

const inflightByRequest = new Map<string, Promise<OpenCommunicationCaseResult>>();

function classifyResponse(status: number, message?: string): OpenCommunicationCaseErrorCode {
  if (status === 401) return 'unauthorized';
  if (status === 403) return 'forbidden';
  if (status === 404) return 'notFound';
  if (status === 409) return 'conflict';
  if (status === 400 && message?.toLowerCase().includes('case agent')) return 'noAgent';
  return 'unknown';
}

async function postOpenCase(requestId: string): Promise<OpenCommunicationCaseResult> {
  try {
    const res = await fetch('/api/communication/cases', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ requestId }),
    });
    const data = (await res.json().catch(() => null)) as { id?: string; message?: string } | null;
    if (!res.ok) {
      return {
        ok: false,
        code: classifyResponse(res.status, data?.message),
        message: data?.message,
      };
    }
    if (!data?.id) {
      return { ok: false, code: 'unknown' };
    }
    return { ok: true, caseId: data.id };
  } catch {
    return { ok: false, code: 'network' };
  }
}

/** Opens (or reuses) a communication case for a request. Dedupes concurrent calls per requestId. */
export function openCommunicationCase(requestId: string): Promise<OpenCommunicationCaseResult> {
  const existing = inflightByRequest.get(requestId);
  if (existing) return existing;
  const work = postOpenCase(requestId).finally(() => {
    inflightByRequest.delete(requestId);
  });
  inflightByRequest.set(requestId, work);
  return work;
}
