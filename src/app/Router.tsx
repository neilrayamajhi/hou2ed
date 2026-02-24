import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Home } from '../pages/Home';
import { Privacy } from '../pages/Privacy';
import { Terms } from '../pages/Terms';
import { Styleguide } from '../pages/Styleguide';

export function Router() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/styleguide" element={<Styleguide />} />
      </Routes>
    </BrowserRouter>
  );
}
