import { Component, inject, signal } from '@angular/core';
import {
  NonNullableFormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators
} from '@angular/forms';
import { Auth, createUserWithEmailAndPassword } from '@angular/fire/auth';
import { Firestore } from '@angular/fire/firestore';
import { RouterLink } from '@angular/router';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';

const passwordsMatchValidator: ValidatorFn = control => {
  const password = control.get('password')?.value;
  const confirmPassword = control.get('confirmPassword')?.value;

  if (!password || !confirmPassword || password === confirmPassword) {
    return null;
  }

  return { passwordMismatch: true } satisfies ValidationErrors;
};

@Component({
  selector: 'app-create-account-page',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './create-account-page.html',
  styleUrl: './create-account-page.scss',
})
export class CreateAccountPage {

  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly auth = inject(Auth);
  private readonly firestore = inject(Firestore);

  protected readonly isSubmitting = signal(false);
  protected readonly successMessage = signal('');
  protected readonly errorMessage = signal('');

  protected readonly form = this.formBuilder.group(
    {
      name: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]]
    },
    { validators: [passwordsMatchValidator] }
  );

  protected async submit(): Promise<void> {
    this.errorMessage.set('');
    this.successMessage.set('');

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);

    try {
      const { name, email, password } = this.form.getRawValue();
      const userCredential = await createUserWithEmailAndPassword(this.auth, email.trim(), password);

      await setDoc(doc(this.firestore, 'users', userCredential.user.uid), {
        uid: userCredential.user.uid,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        approved: false,
        approvalStatus: 'pending',
        approvedBy: 'altrombetone@gmail.com',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      this.successMessage.set(
        'Conta criada. O acesso ficará liberado somente após aprovação do administrador.'
      );
      this.form.reset({
        name: '',
        email: '',
        password: '',
        confirmPassword: ''
      });
    } catch (error) {
      this.errorMessage.set(this.getErrorMessage(error));
    } finally {
      this.isSubmitting.set(false);
    }
  }

  protected passwordMismatch(): boolean {
    return this.form.hasError('passwordMismatch') && (this.form.dirty || this.form.touched);
  }

  protected fieldInvalid(fieldName: 'name' | 'email' | 'password' | 'confirmPassword'): boolean {
    const field = this.form.get(fieldName);

    return !!field && field.invalid && (field.dirty || field.touched);
  }

  private getErrorMessage(error: unknown): string {
    const code =
      typeof error === 'object' && error !== null && 'code' in error
        ? String((error as { code?: string }).code)
        : '';
console.error('Error creating account:', error);
    switch (code) {
      case 'auth/email-already-in-use':
        return 'Este email já possui uma conta criada.';
      case 'auth/invalid-email':
        return 'Informe um email válido.';
      case 'auth/weak-password':
        return 'A senha deve ter pelo menos 6 caracteres.';
      default:
        return 'Não foi possível criar a conta. Tente novamente.';
    }
  }

}
