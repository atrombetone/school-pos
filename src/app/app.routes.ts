import { Routes } from '@angular/router';
import { LandingPage } from './landing/landing-page';
import { AuthPage } from './features/auth/auth-page/auth-page';

export const routes: Routes = [
	{ path: '', component: LandingPage },
	{ path: 'auth', component: AuthPage },
	{ path: '**', redirectTo: '' }
];
