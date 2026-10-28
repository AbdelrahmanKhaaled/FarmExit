export function ActionIcon({
  name,
  className = '',
}: {
  name: 'plus' | 'edit' | 'archive' | 'view' | 'back' | 'next' | 'check' | 'chart';
  className?: string;
}) {
  const paths = {
    plus: 'M12 5v14M5 12h14',
    edit: 'm16 3 5 5L9 20H4v-5L16 3ZM14 5l5 5',
    archive: 'M4 4h16v4H4zM6 8v12h12V8M10 12h4',
    view: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Zm10-3a3 3 0 1 0 0 6 3 3 0 0 0 0-6',
    back: 'm14 5-7 7 7 7',
    next: 'm10 5 7 7-7 7',
    check: 'm5 12 4 4L19 6',
    chart: 'M4 4v16h16M7 15l4-5 4 3 5-7',
  };
  return (
    <svg
      aria-hidden="true"
      className={`size-4 shrink-0 ${name === 'back' || name === 'next' ? 'rtl:rotate-180' : ''} ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={paths[name]} />
    </svg>
  );
}
