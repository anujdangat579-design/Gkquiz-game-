import { useNavigate } from 'react-router-dom'

export default function LegalPage({ title, updated, children }) {
  const navigate = useNavigate()
  return (
    <div className="screen">
      <button
        className="btn-secondary"
        style={{ width: 'auto', padding: '8px 14px', marginBottom: 18 }}
        onClick={() => navigate(-1)}
      >
        ← Back
      </button>

      <p className="eyebrow">LEGAL</p>
      <h1 className="display" style={{ fontSize: 22, margin: '4px 0 4px' }}>{title}</h1>
      {updated && <p className="muted" style={{ fontSize: 12, marginBottom: 20 }}>Last updated: {updated}</p>}

      <div style={{ fontSize: 13, lineHeight: 1.7 }} className="legal-body">
        {children}
      </div>
    </div>
  )
}

export function Section({ heading, children }) {
  return (
    <div style={{ marginBottom: 20 }}>
      {heading && <p style={{ fontWeight: 700, fontSize: 14, marginBottom: 6 }}>{heading}</p>}
      <div className="muted" style={{ fontSize: 13, lineHeight: 1.7 }}>{children}</div>
    </div>
  )
}
