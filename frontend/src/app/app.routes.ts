import { Routes } from '@angular/router';
import { adminGuard, authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/storefront/home/home.component').then((m) => m.HomeComponent),
  },
  {
    path: 'products',
    loadComponent: () =>
      import('./features/storefront/product-list/product-list.component').then(
        (m) => m.ProductListComponent
      ),
  },
  {
    path: 'products/:slug',
    loadComponent: () =>
      import('./features/storefront/product-detail/product-detail.component').then(
        (m) => m.ProductDetailComponent
      ),
  },
  {
    path: 'about',
    loadComponent: () =>
      import('./features/static/static-pages.component').then((m) => m.StaticPagesComponent),
    data: { page: 'about' },
  },
  {
    path: 'contact',
    loadComponent: () =>
      import('./features/static/static-pages.component').then((m) => m.StaticPagesComponent),
    data: { page: 'contact' },
  },
  {
    path: 'server-error',
    loadComponent: () =>
      import('./features/static/static-pages.component').then((m) => m.StaticPagesComponent),
    data: { page: 'server-error' },
  },
  {
    path: 'quote-builder',
    loadComponent: () =>
      import('./features/quote-builder/quote-builder.component').then(
        (m) => m.QuoteBuilderComponent
      ),
  },
  {
    path: 'cart',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/cart/cart.component').then((m) => m.CartComponent),
  },
  {
    path: 'checkout',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/checkout/checkout.component').then((m) => m.CheckoutComponent),
  },
  {
    path: 'payment/vnpay-return',
    loadComponent: () =>
      import('./features/payment/vnpay-return.component').then((m) => m.VnpayReturnComponent),
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./features/auth/register/register.component').then((m) => m.RegisterComponent),
  },
  {
    path: 'account/profile',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/account/profile/profile.component').then((m) => m.ProfileComponent),
  },
  {
    path: 'account/orders',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/account/orders/order-list.component').then((m) => m.OrderListComponent),
  },
  {
    path: 'account/orders/:id',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/account/orders/order-detail.component').then((m) => m.OrderDetailComponent),
  },
  {
    path: 'admin',
    canActivate: [adminGuard],
    loadComponent: () =>
      import('./features/admin/admin-cockpit.component').then((m) => m.AdminCockpitComponent),
  },
  {
    path: '**',
    loadComponent: () =>
      import('./features/static/static-pages.component').then((m) => m.StaticPagesComponent),
    data: { page: 'not-found' },
  },
];
