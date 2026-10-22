/** Map staff API failures to stable dashboard action messages (server actions). */
export function staffApiErrorMessage(
  status: number,
  apiMessage?: string,
  fallback = 'Request failed',
): string {
  if (apiMessage?.trim()) return apiMessage.trim();
  switch (status) {
    case 401:
      return 'Session expired. Sign in again.';
    case 403:
      return 'You do not have permission for this action.';
    case 404:
      return 'The requested resource was not found or is not accessible.';
    case 409:
      return 'This action conflicts with the current workflow state.';
    case 400:
      return 'Invalid request. Check the entered values.';
    default:
      return status >= 500 ? 'Server error. Try again shortly.' : fallback;
  }
}
