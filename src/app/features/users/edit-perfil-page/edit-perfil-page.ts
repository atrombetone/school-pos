import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { Firestore } from '@angular/fire/firestore';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';

export interface EditPerfilDialogData {
  uid: string;
  name: string;
}

export interface EditPerfilDialogResult {
  updated: boolean;
}

@Component({
  selector: 'app-edit-perfil-page',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
  ],
  templateUrl: './edit-perfil-page.html',
  styleUrl: './edit-perfil-page.scss',
})
export class EditPerfilPage {

  protected readonly data = inject<EditPerfilDialogData>(MAT_DIALOG_DATA);

  private readonly dialogRef = inject(MatDialogRef<EditPerfilPage, EditPerfilDialogResult>);
  private readonly firestore = inject(Firestore);
  private readonly formBuilder = inject(NonNullableFormBuilder);

  protected readonly isSaving = signal(false);
  protected readonly errorMessage = signal('');

  protected readonly form = this.formBuilder.group({
    name: [this.data.name, [Validators.required, Validators.minLength(3)]],
  });

  protected async save(): Promise<void> {
    this.errorMessage.set('');

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSaving.set(true);

    try {
      const { name } = this.form.getRawValue();
      const userRef = doc(this.firestore, 'users', this.data.uid);

      await updateDoc(userRef, {
        name: name.trim(),
        updatedAt: serverTimestamp(),
      });

      this.dialogRef.close({ updated: true });
    } catch {
      this.errorMessage.set('Nao foi possivel atualizar seu nome. Tente novamente.');
    } finally {
      this.isSaving.set(false);
    }
  }

  protected close(): void {
    this.dialogRef.close({ updated: false });
  }

  protected fieldInvalid(): boolean {
    const field = this.form.get('name');

    return !!field && field.invalid && (field.dirty || field.touched);
  }

}
