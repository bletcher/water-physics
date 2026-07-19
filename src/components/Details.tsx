import type { ReactNode } from 'react';

interface DetailsProps {
  summary?: string;
  children: ReactNode;
}

/** A collapsible "details on demand" section — collapsed by default. */
export function Details({ summary = 'details', children }: DetailsProps) {
  return (
    <details className="details">
      <summary>{summary}</summary>
      <div className="details-body">{children}</div>
    </details>
  );
}
