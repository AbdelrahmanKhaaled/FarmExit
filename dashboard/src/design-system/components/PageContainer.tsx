import { cn } from '@/lib/cn';

export function PageContainer({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('mx-auto w-full max-w-[var(--admin-content-max)] admin-fade-in', className)}>{children}</div>
  );
}
