import { Routes } from '@angular/router';

export const routes: Routes = [
	{ path: '', loadComponent: () => import('./landing/landing-page').then(m => m.LandingPage) },
	{ path: 'auth', loadComponent: () => import('./features/auth/auth-page/auth-page').then(m => m.AuthPage) },
	{ path: 'create-account', loadComponent: () => import('./features/auth/create-account-page/create-account-page').then(m => m.CreateAccountPage) },
    { path: 'home', loadComponent: () => import('./features/home/home').then(m => m.Home),
        children: [
            { path: 'dashboard', loadComponent: () => import('./features/dashboard/dashboard-page/dashboard-page').then(m => m.DashboardPage) },
            { path: 'products', loadComponent: () => import('./features/products/products-page/products-page').then(m => m.ProductsPage) },
            { path: 'products/new', loadComponent: () => import('./features/products/product-page/product-page').then(m => m.ProductPage) },
            { path: 'products/:id', loadComponent: () => import('./features/products/product-page/product-page').then(m => m.ProductPage) },
            { path: 'stock', loadComponent: () => import('./features/stock/stock-page/stock-page').then(m => m.StockPage) },
            { path: 'reports', children: [
                { path: 'sales', loadComponent: () => import('./features/reports/sales-page/sales-page.component').then(m => m.SalesPageComponent) },
            ] },
            { path: 'sales', loadComponent: () => import('./features/sales/sale-page/sale-page').then(m => m.SalePage) }
        ]
    },
	{ path: '**', redirectTo: '' }
];
