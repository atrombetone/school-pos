import { inject } from '@angular/core';
import { Auth, authState } from '@angular/fire/auth';
import { CanActivateFn, Router } from '@angular/router';
import { map, take } from 'rxjs';
import { environment } from '../../../environments/environment';

const normalizeEmail = (email: string): string => email.trim().toLowerCase();

export const usersAdminGuard: CanActivateFn = () => {
  const auth = inject(Auth);
  const router = inject(Router);
  const allowedEmails = new Set((environment.adminUsersEmails ?? []).map(normalizeEmail));

  return authState(auth).pipe(
    take(1),
    map(user => {
      if (!user) {
        return router.createUrlTree(['/auth']);
      }

      const currentUserEmail = normalizeEmail(user.email ?? '');

      if (allowedEmails.has(currentUserEmail)) {
        return true;
      }

      return router.createUrlTree(['/home/dashboard']);
    })
  );
};
