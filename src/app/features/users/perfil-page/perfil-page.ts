import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { Auth, onAuthStateChanged } from '@angular/fire/auth';
import { Firestore } from '@angular/fire/firestore';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { doc, getDoc, Timestamp } from 'firebase/firestore';
import { take } from 'rxjs';
import { EditPerfilPage } from '../edit-perfil-page/edit-perfil-page';

interface PerfilData {
  uid: string;
  name: string;
  email: string;
  approvalStatus: string;
  approved: boolean;
  approvedBy: string;
  createdAt: unknown;
  updatedAt: unknown;
}

@Component({
  selector: 'app-perfil-page',
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatDialogModule,
    MatSnackBarModule,
  ],
  templateUrl: './perfil-page.html',
  styleUrl: './perfil-page.scss',
})
export class PerfilPage implements OnInit {

  private readonly auth = inject(Auth);
  private readonly firestore = inject(Firestore);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly loading = signal(true);
  protected readonly profile = signal<PerfilData | null>(null);
  protected readonly errorMessage = signal('');

  async ngOnInit(): Promise<void> {
    const currentUser = this.auth.currentUser;

    if (currentUser) {
      await this.loadProfile(currentUser.uid);
      return;
    }

    await new Promise<void>(resolve => {
      const unsubscribe = onAuthStateChanged(this.auth, user => {
        unsubscribe();

        if (!user) {
          this.loading.set(false);
          this.errorMessage.set('Nao foi possivel identificar o usuario logado.');
          resolve();
          return;
        }

        void this.loadProfile(user.uid).finally(() => resolve());
      });
    });
  }

  protected formatTimestamp(value: unknown): string {
    const date = this.extractDate(value);

    if (!date) {
      return 'Nao informado';
    }

    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZoneName: 'short',
    }).format(date);
  }

  protected async openEditDialog(): Promise<void> {
    const currentProfile = this.profile();

    if (!currentProfile) {
      return;
    }

    const dialogRef = this.dialog.open(EditPerfilPage, {
      width: '520px',
      maxWidth: '95vw',
      data: {
        uid: currentProfile.uid,
        name: currentProfile.name,
      },
    });

    dialogRef.afterClosed().pipe(take(1)).subscribe(result => {
      if (!result?.updated) {
        return;
      }

      this.snackBar.open('Perfil atualizado com sucesso.', 'Fechar', { duration: 3000 });
      void this.loadProfile(currentProfile.uid);
    });
  }

  protected maskEmail(email: string): string {
    const [localPart = '', domain = ''] = email.split('@');

    if (!domain) {
      return email;
    }

    if (localPart.length <= 2) {
      return `${localPart.charAt(0)}*@${domain}`;
    }

    return `${localPart.slice(0, 2)}***${localPart.slice(-1)}@${domain}`;
  }

  protected maskUid(uid: string): string {
    if (uid.length <= 12) {
      return uid;
    }

    return `${uid.slice(0, 6)}...${uid.slice(-4)}`;
  }

  protected maskApprovedBy(value: string): string {
    return value.includes('@') ? this.maskEmail(value) : value;
  }

  protected async copyField(label: string, value: string): Promise<void> {
    const copied = await this.copyToClipboard(value);

    if (copied) {
      this.snackBar.open(`${label} copiado para a area de transferencia.`, 'Fechar', {
        duration: 2500,
      });
      return;
    }

    this.snackBar.open(`Nao foi possivel copiar ${label.toLowerCase()}.`, 'Fechar', {
      duration: 3000,
    });
  }

  private async loadProfile(uid: string): Promise<void> {
    this.loading.set(true);
    this.errorMessage.set('');

    try {
      const userRef = doc(this.firestore, 'users', uid);
      const userSnapshot = await getDoc(userRef);

      if (!userSnapshot.exists()) {
        this.profile.set(null);
        this.errorMessage.set('Perfil do usuario nao encontrado no Firestore.');
        return;
      }

      const data = userSnapshot.data() as Record<string, unknown>;
      this.profile.set({
        uid: String(data['uid'] ?? uid),
        name: String(data['name'] ?? 'Nao informado'),
        email: String(data['email'] ?? 'Nao informado'),
        approvalStatus: String(data['approvalStatus'] ?? 'Nao informado'),
        approved: Boolean(data['approved']),
        approvedBy: String(data['approvedBy'] ?? 'Nao informado'),
        createdAt: data['createdAt'],
        updatedAt: data['updatedAt'],
      });
    } catch {
      this.profile.set(null);
      this.errorMessage.set('Erro ao carregar os dados do perfil.');
    } finally {
      this.loading.set(false);
    }
  }

  private extractDate(value: unknown): Date | null {
    if (value instanceof Timestamp) {
      return value.toDate();
    }

    if (
      typeof value === 'object' &&
      value !== null &&
      'toDate' in value &&
      typeof (value as { toDate?: unknown }).toDate === 'function'
    ) {
      return (value as { toDate: () => Date }).toDate();
    }

    return null;
  }

  private async copyToClipboard(value: string): Promise<boolean> {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
        return true;
      }

      const textarea = document.createElement('textarea');
      textarea.value = value;
      textarea.setAttribute('readonly', '');
      textarea.style.position = 'absolute';
      textarea.style.left = '-9999px';
      document.body.appendChild(textarea);
      textarea.select();
      const copied = document.execCommand('copy');
      document.body.removeChild(textarea);

      return copied;
    } catch {
      return false;
    }
  }

}
