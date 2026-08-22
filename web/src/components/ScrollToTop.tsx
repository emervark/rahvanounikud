import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/** Uuele lehele minnes algusesse — muidu avaneb saade keset lugude nimekirja. */
export function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}
