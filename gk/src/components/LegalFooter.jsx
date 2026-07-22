import { Link } from 'react-router-dom'
import { LEGAL_LINKS } from '../pages/legal/legalContent'

export default function LegalFooter() {
  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '6px 14px',
        justifyContent: 'center',
        marginTop: 28,
        paddingTop: 16,
        borderTop: '1px solid var(--border)',
      }}
    >
      {LEGAL_LINKS.map((l) => (
        <Link key={l.path} to={l.path} className="muted" style={{ fontSize: 11 }}>
          {l.label}
        </Link>
      ))}
    </div>
  )
}
