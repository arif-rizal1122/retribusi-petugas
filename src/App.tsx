import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { PWAProvider } from './contexts/PWAContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import PetugasLogin from './pages/PetugasLogin';
import LandingPage from './pages/LandingPage';
import PetugasWelcome from './pages/PetugasWelcome';
import PetugasRegister from './pages/PetugasRegister';
import Dashboard from './pages/Dashboard';
import Billing from './pages/Billing';
import Reporting from './pages/Reporting';
import MasterData from './pages/MasterData';
import TaxpayerManagement from './pages/TaxpayerManagement';
import TaxpayerDetail from './pages/TaxpayerDetail';
import Profile from './pages/Profile';
import FieldScanner from './pages/FieldScanner';
import PaymentConfirmation from './pages/PaymentConfirmation';
import TaxCalculator from './pages/TaxCalculator';
import UserGuide from './pages/UserGuide';
import FieldInspection from './pages/FieldInspection';
import Presentation from './pages/Presentation';
import PetaLapangan from './pages/PetaLapangan';
import PbbBapenda from './pages/PbbBapenda';
import DownloadApp from './pages/DownloadApp';
import PaymentVerification from './pages/PaymentVerification';
import DaftarTugas from './pages/DaftarTugas';
import CreateSKPD from './pages/CreateSKPD';
import About from './pages/About';


function HomeRoute() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-baubau-blue"></div>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <LandingPage />;
}

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <PWAProvider>
          <AuthProvider>
          <Routes>
            <Route path="/" element={<HomeRoute />} />
            <Route path="/login" element={<PetugasLogin />} />
            <Route path="/register" element={<PetugasRegister />} />
            <Route path="/welcome" element={<PetugasWelcome />} />

            <Route
              path="/peta"
              element={
                <ProtectedRoute allowedRoles={['super_admin', 'opd', 'petugas']}>
                  <Layout>
                    <PetaLapangan />
                  </Layout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/dashboard"
              element={
                <ProtectedRoute allowedRoles={['super_admin', 'opd', 'verifikator', 'petugas', 'viewer']}>
                  <Layout>
                    <Dashboard />
                  </Layout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/scanner"
              element={
                <ProtectedRoute allowedRoles={['super_admin', 'opd', 'petugas']}>
                  <Layout>
                    <FieldScanner />
                  </Layout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/payment-confirmation"
              element={
                <ProtectedRoute allowedRoles={['super_admin', 'opd', 'petugas']}>
                  <Layout>
                    <PaymentConfirmation />
                  </Layout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/field-check"
              element={
                <ProtectedRoute allowedRoles={['super_admin', 'opd', 'petugas']}>
                  <Layout>
                    <FieldInspection />
                  </Layout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/taxpayers"
              element={
                <ProtectedRoute allowedRoles={['super_admin', 'opd', 'petugas']}>
                  <Layout>
                    <TaxpayerManagement />
                  </Layout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/taxpayers/:id"
              element={
                <ProtectedRoute allowedRoles={['super_admin', 'opd', 'petugas']}>
                  <Layout>
                    <TaxpayerDetail />
                  </Layout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/billing"
              element={
                <ProtectedRoute allowedRoles={['super_admin', 'opd', 'petugas']}>
                  <Layout>
                    <Billing />
                  </Layout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/tasks"
              element={
                <ProtectedRoute allowedRoles={['super_admin', 'opd', 'petugas']}>
                  <Layout>
                    <DaftarTugas />
                  </Layout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/verification"
              element={
                <ProtectedRoute allowedRoles={['super_admin', 'opd']}>
                  <Layout>
                    <PaymentVerification />
                  </Layout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/reporting"
              element={
                <ProtectedRoute allowedRoles={['super_admin', 'opd', 'viewer', 'petugas']}>
                  <Layout>
                    <Reporting />
                  </Layout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/master-data"
              element={
                <ProtectedRoute allowedRoles={['super_admin', 'opd', 'verifikator', 'petugas', 'viewer']}>
                  <Layout>
                    <MasterData />
                  </Layout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/skpd/create"
              element={
                <ProtectedRoute allowedRoles={['super_admin', 'opd', 'petugas']}>
                  <Layout>
                    <CreateSKPD />
                  </Layout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/calculator"
              element={
                <ProtectedRoute allowedRoles={['super_admin', 'opd', 'petugas']}>
                  <Layout>
                    <TaxCalculator />
                  </Layout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/pbb-bapenda"
              element={
                <ProtectedRoute allowedRoles={['super_admin', 'opd', 'petugas']}>
                  <Layout>
                    <PbbBapenda />
                  </Layout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/profile"
              element={
                <ProtectedRoute allowedRoles={['super_admin', 'opd', 'verifikator', 'petugas', 'viewer']}>
                  <Layout>
                    <Profile />
                  </Layout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/about"
              element={
                <ProtectedRoute allowedRoles={['super_admin', 'opd', 'verifikator', 'petugas', 'viewer']}>
                  <Layout>
                    <About />
                  </Layout>
                </ProtectedRoute>
              }
            />

            <Route path="/user-guide" element={<UserGuide />} />
            <Route path="/download" element={<DownloadApp />} />
            <Route path="/unduh" element={<DownloadApp />} />
            <Route path="/presentation" element={<Presentation />} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </PWAProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
