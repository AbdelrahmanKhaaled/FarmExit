import { cn } from '@/lib/cn';

type IconProps = { className?: string };

export function IconOverview({ className }: IconProps) {
  return (
    <svg className={cn('size-5 shrink-0', className)} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 13h6v7H4v-7Zm10-9h6v16h-6V4ZM4 4h6v6H4V4Z" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
    </svg>
  );
}

export function IconFarm({ className }: IconProps) {
  return (
    <svg className={cn('size-5 shrink-0', className)} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M3 20V9l9-5 9 5v11" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
      <path d="M9 20v-6h6v6" stroke="currentColor" strokeWidth="1.75" />
    </svg>
  );
}

export function IconList({ className }: IconProps) {
  return (
    <svg className={cn('size-5 shrink-0', className)} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function IconInbox({ className }: IconProps) {
  return (
    <svg className={cn('size-5 shrink-0', className)} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 8V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2M4 8l2 9h12l2-9M4 8h16" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
    </svg>
  );
}

export function IconChat({ className }: IconProps) {
  return (
    <svg className={cn('size-5 shrink-0', className)} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M5 18v-7a4 4 0 0 1 4-4h6a4 4 0 0 1 4 4v4a4 4 0 0 1-4 4H9l-4 3v-3Z" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
    </svg>
  );
}

export function IconUsers({ className }: IconProps) {
  return (
    <svg className={cn('size-5 shrink-0', className)} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M16 11a4 4 0 1 0-8 0M4 20a6 6 0 0 1 16 0" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

export function IconSettings({ className }: IconProps) {
  return (
    <svg className={cn('size-5 shrink-0', className)} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" stroke="currentColor" strokeWidth="1.75" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1.1V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1.1-.4 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1.1-.4H3a2 2 0 1 1 0-4h.09a1.7 1.7 0 0 0 1.1-.4 1.7 1.7 0 0 0 .6-1 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1.1V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1.1.4 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 9c.26.31.45.68.6 1.07.15.39.23.8.23 1.23s-.08.84-.23 1.23a1.7 1.7 0 0 0-.6 1Z" stroke="currentColor" strokeWidth="1.25" />
    </svg>
  );
}

export function IconProposal({ className }: IconProps) {
  return (
    <svg className={cn('size-5 shrink-0', className)} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" stroke="currentColor" strokeWidth="1.75" />
      <path d="M14 3v5h5M9 13h6M9 17h4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

export function IconBell({ className }: IconProps) {
  return (
    <svg className={cn('size-5 shrink-0', className)} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 22a2.5 2.5 0 0 0 2.45-2h-4.9A2.5 2.5 0 0 0 12 22ZM5 9a7 7 0 0 1 14 0c0 5 2 6 2 6H3s2-1 2-6Z" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
    </svg>
  );
}

export function IconMenu({ className }: IconProps) {
  return (
    <svg className={cn('size-5', className)} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function IconChevron({ className, dir = 'start' }: IconProps & { dir?: 'start' | 'end' }) {
  return (
    <svg
      className={cn('size-4', dir === 'end' && 'rotate-180', className)}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
