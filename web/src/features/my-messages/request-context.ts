/** Maps a generic request list/detail row to the correct My FarmExit detail route. */
export type RequestRouteRef = {
  id: string;
  requestType: string;
};

export function requestDetailHref(req: RequestRouteRef): string {
  const type = req.requestType;
  if (type === 'farmManagement' || type === 'farm_management') {
    return `/my/management/${req.id}`;
  }
  if (type === 'professionalVerification' || type === 'professional_verification') {
    return `/my/professional/verification/${req.id}`;
  }
  if (type === 'partnership') {
    return `/my/partnerships/${req.id}`;
  }
  if (type === 'partnershipApplication' || type === 'partnership_application') {
    return `/my/applications/${req.id}`;
  }
  if (type === 'farmPurchaseProposal' || type === 'farm_purchase_proposal') {
    return `/my/proposals/${req.id}`;
  }
  if (type === 'farmDetails' || type === 'farm_details') {
    return `/my/farm-details-requests/${req.id}`;
  }
  if (type === 'farmListing' || type === 'farm_listing') {
    return `/my/requests/${req.id}`;
  }
  return `/my/requests/${req.id}`;
}

export type RequestContextSummary = {
  id: string;
  requestNumber: string;
  requestType: string;
  status: string;
  farm: { id: string; name: string; governorate: string | null } | null;
};

export function canOpenCommunicationForStatus(status: string): boolean {
  return status !== 'draft' && status !== 'withdrawn';
}
