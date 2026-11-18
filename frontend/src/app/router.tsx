import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import { LoginPage } from '../features/auth/LoginPage';
import { ProtectedRoute } from '../features/auth/ProtectedRoute';
import { DashboardOverview } from '../features/dashboard/DashboardOverview';
import { AssistantChat } from '../features/assistant/AssistantChat';
import { CustomerList } from '../features/customers/CustomerList';
import { CustomerDetail } from '../features/customers/CustomerDetail';
import { DeliveryList } from '../features/deliveries/DeliveryList';
import { PaymentList } from '../features/payments/PaymentList';
import { ProductList } from '../features/products/ProductList';
import { ReportsDashboard } from '../features/reports/ReportsDashboard';
import { SettingsOverview } from '../features/settings/SettingsOverview';

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <DashboardOverview />,
      },
      {
        path: 'assistant',
        element: <AssistantChat />,
      },
      {
        path: 'customers',
        element: <CustomerList />,
      },
      {
        path: 'customers/:id',
        element: <CustomerDetail />,
      },
      {
        path: 'deliveries',
        element: <DeliveryList />,
      },
      {
        path: 'payments',
        element: <PaymentList />,
      },
      {
        path: 'products',
        element: <ProductList />,
      },
      {
        path: 'reports',
        element: <ReportsDashboard />,
      },
      {
        path: 'settings',
        element: <SettingsOverview />,
      },
      {
        path: '*',
        element: <Navigate to="/" replace />,
      },
    ],
  },
]);
