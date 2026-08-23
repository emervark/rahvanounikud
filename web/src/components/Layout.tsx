import { NavLink, Link, Outlet } from 'react-router-dom';
import { useRatings } from '../ratings';
import { StickyPlayer, usePlayer } from '../player';

const NAV = [
  { to: '/', label: 'Avaleht', end: true },
  { to: '/saated', label: 'Saated' },
  { to: '/edetabel', label: 'Edetabel' },
];

/**
 * Sisselogimine on valikuline ja jääb meelega tagaplaanile: hindamine töötab
 * kohe ja ilma. Nupp on selleks, et hinded ei jääks ühe brauseri külge kinni.
 */
function AccountButton() {
  const { isLoggedIn, displayName, loginAvailable } = useRatings();

  if (!loginAvailable) return null;

  if (isLoggedIn) {
    return (
      <form method="post" action="/api/auth/logout" className="account">
        <span className="account__name" title={displayName ?? undefined}>
          {displayName ?? 'Sisse logitud'}
        </span>
        <button type="submit" className="account__action">Logi välja</button>
      </form>
    );
  }

  return <a className="account__action" href="/api/auth/google">Logi sisse ↗</a>;
}

export function Layout() {
  const { ratedCount, error } = useRatings();
  const { current } = usePlayer();

  return (
    <div className="app" style={current ? { ['--player-space' as string]: '76px' } : undefined}>
      <header className="site-header">
        <div className="site-header__inner">
          <Link className="logo" to="/">Rahvanõunikud</Link>
          <nav className="site-nav">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => (isActive ? 'navl on' : 'navl')}
              >
                {item.label}
              </NavLink>
            ))}
            <NavLink
              to="/minu-hinded"
              className={({ isActive }) => (isActive ? 'navl on' : 'navl')}
            >
              Minu hinded{ratedCount > 0 && ` · ${ratedCount}`}
            </NavLink>
          </nav>
          <AccountButton />
        </div>
      </header>

      {/* Kui hinne serverisse ei jõudnud, on see kasutajale nähtav — vaikselt
          kadunud hinne oleks halvim variant, sest inimene arvab, et hindas. */}
      {error && <div className="toast" role="alert">{error}</div>}

      <main>
        <Outlet />
      </main>

      <footer className="site-footer">
        <p className="mono">
          „Muusikanõunikud” on{' '}
          <a href="https://www.delfi.ee/" target="_blank" rel="noreferrer">Delfi Meedia</a>{' '}
          saade — saatejuht Raul Saaremets, püsikriitikud Valner Valme, Siim Nestor
          ja Merit Maarits. Rahvanõunikud on fännide tehtud hindamisleht ega ole
          Delfiga seotud.
        </p>
        <p className="mono">
          Kuula{' '}
          <a href="https://tasku.delfi.ee/podcast/33d58660-ca9f-4b57-bb79-27629e949861" target="_blank" rel="noreferrer">
            Delfi Taskus
          </a>{' '}
          või{' '}
          <a href="https://open.spotify.com/show/3BS7aVziqgxzDXuaiM6wQZ" target="_blank" rel="noreferrer">
            Spotifys
          </a>
        </p>
      </footer>

      <StickyPlayer />
    </div>
  );
}
