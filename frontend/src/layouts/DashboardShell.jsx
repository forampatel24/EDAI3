import { NavLink, useLocation } from 'react-router-dom'

export default function DashboardShell({ base, roleLabel, nav, children }) {
  const location = useLocation()
  const rest = location.pathname
    .slice(base.length)
    .replace(/^\/+|\/+$/g, '')
  const active =
    nav.find((item) =>
      item.to === '.'
        ? rest === ''
        : rest === item.to || rest.startsWith(item.to + '/'),
    ) || nav[0]

  return (
    <div className="dash">
      <aside className="dash-side">
        <div className="dash-side-title">{roleLabel}</div>
        <nav className="dash-nav">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '.'}
              className={({ isActive }) => 'dash-link' + (isActive ? ' active' : '')}
            >
              <span className="dash-ico" aria-hidden="true">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className="dash-main">
        <header className="dash-head">
          <h1>{active.label}</h1>
          <p>{active.desc}</p>
        </header>
        {children}
      </main>
    </div>
  )
}
