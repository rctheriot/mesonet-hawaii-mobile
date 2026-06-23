import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import HomeScreen from './screens/HomeScreen';
import ExploreScreen from './screens/ExploreScreen';
import StationDetail from './screens/StationDetail';
import PWAInstallPrompt from './components/PWAPrompt/PWAInstallPrompt';
import BottomNav from './components/Nav/BottomNav';
import LandscapeOverlay from './components/LandscapeOverlay';

const queryClient = new QueryClient();

// Layout wrapper — needs to be inside BrowserRouter so useLocation works.
// BottomNav is hidden on StationDetail (full-screen detail view).
function AppLayout() {
  const { pathname } = useLocation();
  const showNav = !pathname.startsWith('/station/');

  return (
    <>
      <Routes>
        <Route path="/"                    element={<HomeScreen />} />
        <Route path="/explore"             element={<ExploreScreen />} />
        <Route path="/station/:stationId"  element={<StationDetail />} />
      </Routes>
      {showNav && <BottomNav />}
      <PWAInstallPrompt />
      <LandscapeOverlay />
    </>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppProvider>
        <BrowserRouter>
          <AppLayout />
        </BrowserRouter>
      </AppProvider>
    </QueryClientProvider>
  );
}
