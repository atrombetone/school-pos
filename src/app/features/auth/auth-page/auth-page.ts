import { Component, inject, signal } from '@angular/core';
import { Auth, signInWithEmailAndPassword, signOut } from '@angular/fire/auth';
import { Firestore } from '@angular/fire/firestore';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { doc, getDoc } from 'firebase/firestore';

@Component({
  selector: 'app-auth-page',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './auth-page.html',
  styleUrl: './auth-page.scss',
})
export class AuthPage {

  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly auth = inject(Auth);
  private readonly firestore = inject(Firestore);
  private readonly router = inject(Router);

  protected readonly isSubmitting = signal(false);
  protected readonly errorMessage = signal('');

  protected readonly form = this.formBuilder.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  protected async submit(): Promise<void> {
    this.errorMessage.set('');

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);

    try {
      const { email, password } = this.form.getRawValue();
      const credential = await signInWithEmailAndPassword(this.auth, email.trim(), password);
      const userDocRef = doc(this.firestore, 'users', credential.user.uid);
      const userDocSnapshot = await getDoc(userDocRef);

      if (!userDocSnapshot.exists()) {
        await signOut(this.auth);
        this.errorMessage.set('Conta sem perfil de acesso. Fale com o administrador.');
        return;
      }

      const userData = userDocSnapshot.data() as { approved?: boolean; approvalStatus?: string };
      const isApproved = userData.approved === true || userData.approvalStatus === 'approved';

      if (!isApproved) {
        await signOut(this.auth);
        this.errorMessage.set(
          'Conta criada, mas ainda pendente de aprovacao do administrador altrombetone@gmail.com.'
        );
        return;
      }

      await this.router.navigateByUrl('/home/dashboard');
    } catch (error) {
      this.errorMessage.set(this.getErrorMessage(error));
    } finally {
      this.isSubmitting.set(false);
    }
  }

  protected fieldInvalid(fieldName: 'email' | 'password'): boolean {
    const field = this.form.get(fieldName);

    return !!field && field.invalid && (field.dirty || field.touched);
  }

  private getErrorMessage(error: unknown): string {
    const code =
      typeof error === 'object' && error !== null && 'code' in error
        ? String((error as { code?: string }).code)
        : '';

    switch (code) {
      case 'auth/invalid-email':
        return 'Email invalido.';
      case 'auth/invalid-credential':
      case 'auth/wrong-password':
      case 'auth/user-not-found':
        return 'Email ou senha incorretos.';
      case 'auth/too-many-requests':
        return 'Muitas tentativas. Tente novamente em alguns minutos.';
      default:
        return 'Nao foi possivel entrar. Tente novamente.';
    }
  }

}
