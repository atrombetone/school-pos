import { Component, inject, Injector, runInInjectionContext, signal } from '@angular/core';
import { Auth, sendPasswordResetEmail } from '@angular/fire/auth';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

@Component({
  selector: 'app-lost-pass-page',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatIconModule,
    MatSnackBarModule,
  ],
  templateUrl: './lost-pass-page.html',
  styleUrl: './lost-pass-page.scss',
})
export class LostPassPage {

  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly injector = inject(Injector);
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly isSubmitting = signal(false);
  protected readonly successMessage = signal('');

  protected readonly form = this.formBuilder.group({
    email: ['', [Validators.required, Validators.email]],
  });

  protected async submit(): Promise<void> {
    this.successMessage.set('');

    if (this.form.invalid) {
      console.warn('[LostPass] Form invalid on submit', {
        emailErrors: this.form.get('email')?.errors ?? null,
      });
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);

    try {
      const { email } = this.form.getRawValue();
      const normalizedEmail = email.trim().toLowerCase();
      const actionSettings = {
        url: 'https://school-pos.com.br/login',
        handleCodeInApp: false,
      };

      console.log('[LostPass] Starting password reset flow', {
        emailMasked: this.maskEmail(normalizedEmail),
        projectId: this.auth.app.options.projectId ?? 'unknown',
        authDomain: this.auth.app.options.authDomain ?? 'unknown',
        currentOrigin: window.location.origin,
        actionSettings,
      });

      await runInInjectionContext(this.injector, () =>
        sendPasswordResetEmail(this.auth, normalizedEmail, actionSettings)
      );

      console.log('[LostPass] sendPasswordResetEmail resolved', {
        emailMasked: this.maskEmail(normalizedEmail),
        note: 'Firebase can resolve even when email enumeration protection is enabled.',
      });

      const message = 'Enviamos um link de recuperação para o email informado.';
      this.successMessage.set(message);
      this.form.reset({ email: '' });
      this.snackBar.open(message, 'Fechar', { duration: 5000 });

      // Give the user a short moment to read feedback before returning to login.
      setTimeout(() => {
        void this.router.navigateByUrl('/login');
      }, 1800);
    } catch (error) {
      console.error('[LostPass] sendPasswordResetEmail failed', {
        error,
        code:
          typeof error === 'object' && error !== null && 'code' in error
            ? String((error as { code?: string }).code)
            : 'unknown',
      });
      this.snackBar.open(this.getErrorMessage(error), 'Fechar', { duration: 5500 });
    } finally {
      this.isSubmitting.set(false);
    }
  }

  protected fieldInvalid(): boolean {
    const field = this.form.get('email');

    return !!field && field.invalid && (field.dirty || field.touched);
  }

  private getErrorMessage(error: unknown): string {
    const code =
      typeof error === 'object' && error !== null && 'code' in error
        ? String((error as { code?: string }).code)
        : '';

    switch (code) {
      case 'auth/user-not-found':
        return 'Nao encontramos uma conta com este email.';
      case 'auth/invalid-email':
        return 'Informe um email valido para recuperar a senha.';
      case 'auth/too-many-requests':
        return 'Muitas tentativas. Aguarde alguns minutos e tente novamente.';
      default:
        return 'Nao foi possivel enviar o email de recuperacao. Tente novamente.';
    }
  }

  private maskEmail(email: string): string {
    const [localPart = '', domain = ''] = email.split('@');
    const maskedLocal =
      localPart.length <= 2
        ? `${localPart.charAt(0)}*`
        : `${localPart.slice(0, 2)}***${localPart.slice(-1)}`;

    return `${maskedLocal}@${domain}`;
  }

}
