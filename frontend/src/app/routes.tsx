import type { RouteObject } from 'react-router';
import { RequireAdmin, RequireAuth } from '@/features/auth/guards';
import { AccountPage } from '@/pages/account/AccountPage';
import { MyOrdersPage } from '@/pages/account/MyOrdersPage';
import { OrderPage } from '@/pages/account/OrderPage';
import { AdminLayout } from '@/pages/admin/AdminLayout';
import { CategoriesPage } from '@/pages/admin/CategoriesPage';
import { DashboardPage } from '@/pages/admin/DashboardPage';
import { EditProductPage, NewProductPage } from '@/pages/admin/ProductEditorPage';
import { OrderDetailPage } from '@/pages/admin/OrderDetailPage';
import { OrdersPage } from '@/pages/admin/OrdersPage';
import { ProductsPage } from '@/pages/admin/ProductsPage';
import { ForgotPasswordPage } from '@/pages/auth/ForgotPasswordPage';
import { LoginPage } from '@/pages/auth/LoginPage';
import { ResetPasswordPage } from '@/pages/auth/ResetPasswordPage';
import { SignUpPage } from '@/pages/auth/SignUpPage';
import { CartPage } from '@/pages/cart/CartPage';
import { CatalogPage } from '@/pages/catalog/CatalogPage';
import { CheckoutPage } from '@/pages/checkout/CheckoutPage';
import { CreditsPage } from '@/pages/credits/CreditsPage';
import { ContactPage, PrivacyPage, ReturnsPage, ShippingPage } from '@/pages/info/pages';
import { HomePage } from '@/pages/home/HomePage';
import { NotFoundPage } from '@/pages/not-found/NotFoundPage';
import { ProductPage } from '@/pages/product/ProductPage';
import { RootLayout } from './RootLayout';

/** Mapa de rotas da aplicação. */
export const routes: RouteObject[] = [
  {
    path: '/',
    element: <RootLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'loja', element: <CatalogPage key="all" variant="all" /> },
      { path: 'loja/:categoria', element: <CatalogPage key="category" variant="category" /> },
      { path: 'novidades', element: <CatalogPage key="new" variant="new" /> },
      { path: 'promocoes', element: <CatalogPage key="sale" variant="sale" /> },
      { path: 'busca', element: <CatalogPage key="search" variant="search" /> },
      { path: 'produto/:slug', element: <ProductPage /> },
      { path: 'carrinho', element: <CartPage /> },
      {
        path: 'checkout',
        element: (
          <RequireAuth>
            <CheckoutPage />
          </RequireAuth>
        ),
      },
      { path: 'entrar', element: <LoginPage /> },
      { path: 'cadastro', element: <SignUpPage /> },
      { path: 'recuperar-senha', element: <ForgotPasswordPage /> },
      { path: 'redefinir-senha', element: <ResetPasswordPage /> },
      {
        path: 'conta',
        element: (
          <RequireAuth>
            <AccountPage />
          </RequireAuth>
        ),
      },
      {
        path: 'conta/pedidos',
        element: (
          <RequireAuth>
            <MyOrdersPage />
          </RequireAuth>
        ),
      },
      {
        path: 'conta/pedidos/:id',
        element: (
          <RequireAuth>
            <OrderPage />
          </RequireAuth>
        ),
      },
      {
        path: 'admin',
        element: (
          <RequireAuth>
            <RequireAdmin>
              <AdminLayout />
            </RequireAdmin>
          </RequireAuth>
        ),
        children: [
          { index: true, element: <DashboardPage /> },
          { path: 'produtos', element: <ProductsPage /> },
          { path: 'produtos/novo', element: <NewProductPage /> },
          { path: 'produtos/:id', element: <EditProductPage /> },
          { path: 'categorias', element: <CategoriesPage /> },
          { path: 'pedidos', element: <OrdersPage /> },
          { path: 'pedidos/:id', element: <OrderDetailPage /> },
        ],
      },
      { path: 'contato', element: <ContactPage /> },
      { path: 'entrega', element: <ShippingPage /> },
      { path: 'trocas-e-devolucoes', element: <ReturnsPage /> },
      { path: 'privacidade', element: <PrivacyPage /> },
      { path: 'creditos', element: <CreditsPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
];
