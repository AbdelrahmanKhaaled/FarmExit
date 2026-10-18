/** Admin console path for a specialized request workflow, when one exists. */
export function specializedAdminPath(requestType: string, requestId: string): string | null {
  const map: Record<string, string> = {
    farmListing: `/admin/listings/${requestId}`,
    farmManagement: `/admin/farm-management/${requestId}`,
    professionalVerification: `/admin/verification/${requestId}`,
    partnership: `/admin/partnerships/${requestId}`,
    partnershipApplication: `/admin/partnerships/applications/${requestId}`,
    farmDetails: `/admin/farm-details/${requestId}`,
    farmPurchaseProposal: `/admin/proposals/${requestId}`,
  };
  return map[requestType] ?? null;
}
