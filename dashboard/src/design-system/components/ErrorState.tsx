'use client';

import { Card } from './Card';
import { Button } from './Button';

export function ErrorState({ message, retryLabel }: { message: string; retryLabel?: string }) {
  return (
    <Card className="border-[color-mix(in_srgb,var(--admin-status-danger)_25%,white)] bg-[var(--admin-status-danger-bg)] p-6">
      <p className="font-medium text-[var(--admin-status-danger)]">{message}</p>
      {retryLabel && (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="mt-4"
          onClick={() => window.location.reload()}
        >
          {retryLabel}
        </Button>
      )}
    </Card>
  );
}
