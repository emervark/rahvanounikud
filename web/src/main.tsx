import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router-dom';

import './styles.css';
import { RatingsProvider } from './ratings';
import { PlayerProvider } from './player';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { Episodes } from './pages/Episodes';
import { EpisodePage } from './pages/EpisodePage';
import { Leaderboard } from './pages/Leaderboard';
import { MyRatings } from './pages/MyRatings';
import { ScrollToTop } from './components/ScrollToTop';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <RatingsProvider>
        <PlayerProvider>
          <ScrollToTop />
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<Home />} />
              <Route path="saated" element={<Episodes />} />
              <Route path="saade/:guid" element={<EpisodePage />} />
              <Route path="edetabel" element={<Leaderboard />} />
              <Route path="minu-hinded" element={<MyRatings />} />
              <Route path="*" element={<Home />} />
            </Route>
          </Routes>
        </PlayerProvider>
      </RatingsProvider>
    </BrowserRouter>
  </StrictMode>,
);
