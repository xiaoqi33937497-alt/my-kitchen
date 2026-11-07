export function StatusPill({ children, tone = 'neutral' }: { children: React.ReactNode; tone?: 'neutral' | 'urgent' }) { return <span className={`status-pill ${tone}`}>{children}</span>; }
