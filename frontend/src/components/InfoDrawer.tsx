import { X } from '@phosphor-icons/react'

export function InfoDrawer({ title, lines, onClose, closeLabel = '关闭' }: { title: string; lines: string[]; onClose: () => void; closeLabel?: string }) {
  return <div className="drawer-backdrop" onClick={onClose}>
    <section className="settings-drawer info-drawer" role="dialog" aria-label={title} onClick={(event) => event.stopPropagation()}>
      <div className="drawer-header"><h2>{title}</h2><button className="plain-icon" onClick={onClose} aria-label={closeLabel}><X /></button></div>
      <div className="info-list">{lines.map((line, index) => <p key={`${line}-${index}`}>{line}</p>)}</div>
    </section>
  </div>
}
