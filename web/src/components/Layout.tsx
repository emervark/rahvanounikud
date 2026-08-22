import { NavLink, Link, Outlet } from 'react-router-dom';
import { useRatings } from '../ratings';
import { StickyPlayer, usePlayer } from '../player';

const NAV = [
  { to: '/', label: 'Avaleht', end: true },
  { to: '/saated', label: 'Saated' },
  { to: '/edetabel', label: 'Edetabel' },
];

export function Layout() {
  const { ratedCount } = useRatings();
  const { current } = usePlayer();

  return (
    <div className="app" style={current ? { ['--player-space' as string]: '76px' } : undefined}>
      <header className="site-header">
        <div className="page site-header__inner">
          <Link className="brand" to="/">
            Rahva<span>nõunikud</span>
          </Link>
          <nav className="site-nav">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => (isActive ? 'is-active' : undefined)}
              >
                {item.label}
              </NavLink>
            ))}
            <NavLink
              to="/minu-hinded"
              className={({ isActive }) => (isActive ? 'is-active' : undefined)}
            >
              Minu hinded
              {ratedCount > 0 && <span className="nav-count">{ratedCount}</span>}
            </NavLink>
          </nav>
        </div>
      </header>

      <main>
        <Outlet />
      </main>

      <footer className="site-footer">
        <div className="page">
          <p>
            „Muusikanõunikud” on <a href="https://www.delfi.ee/" target="_blank" rel="noreferrer">Delfi Meedia</a>{' '}
            saade, mille saatejuht on Raul Saaremets ning püsikriitikud Valner Valme,
            Siim Nestor ja Merit Maarits. Rahvanõunikud on fännide tehtud hindamisleht
            ega ole Delfiga seotud.
          </p>
          <p>
            Kuula saadet{' '}
            <a href="https://tasku.delfi.ee/podcast/33d58660-ca9f-4b57-bb79-27629e949861" target="_blank" rel="noreferrer">
              Delfi Taskus
            </a>{' '}
            või{' '}
            <a href="https://open.spotify.com/show/3BS7aVziqgxzDXuaiM6wQZ" target="_blank" rel="noreferrer">
              Spotifys
            </a>.
          </p>
        </div>
      </footer>

      <StickyPlayer />
    </div>
  );
}
