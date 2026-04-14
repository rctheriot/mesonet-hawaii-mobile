import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import HomeScreen from './screens/HomeScreen';
import ExploreScreen from './screens/ExploreScreen';
import StationDetail from './screens/StationDetail';
import PWAInstallPrompt from './components/PWAPrompt/PWAInstallPrompt';

// QueryClient lives here so a single cache is shared across all screens.
const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      {/* AppProvider manages dark mode, settings, and favorites for all screens */}
      <AppProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/"               element={<HomeScreen />} />
            <Route path="/explore"        element={<ExploreScreen />} />
            <Route path="/station/:stationId" element={<StationDetail />} />
          </Routes>
          {/* PWAInstallPrompt lives outside routes so it persists across navigation */}
          <PWAInstallPrompt />
        </BrowserRouter>
      </AppProvider>
    </QueryClientProvider>
  );
}
