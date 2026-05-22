import { Routes } from '@angular/router';
import { LandingPage } from './landing/landing-page';
import { AuthPage } from './features/auth/auth-page/auth-page';
import { CreateAccountPage } from './features/auth/create-account-page/create-account-page';
import { DashboardPage } from './features/dashboard/dashboard-page/dashboard-page';
import { ProductsPage } from './features/products/products-page/products-page';
import { ProductPage } from './features/products/product-page/product-page';
import { SalePage } from './features/sales/sale-page/sale-page';
import { StockPage } from './features/stock/stock-page/stock-page';
import { Home } from './features/home/home';

export const routes: Routes = [
	{ path: '', component: LandingPage },
	{ path: 'auth', component: AuthPage },
	{ path: 'create-account', component: CreateAccountPage },
    { path: 'home', component: Home,
        children: [
            { path: 'dashboard', component: DashboardPage },
            { path: 'products', component: ProductsPage },
            { path: 'products/new', component: ProductPage },
            { path: 'products/:id', component: ProductPage },
            { path: 'stock', component: StockPage },
            { path: 'sales', component: SalePage }
        ]
    },
	{ path: '**', redirectTo: '' }
];
