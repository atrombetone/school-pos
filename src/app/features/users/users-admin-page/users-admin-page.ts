import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import { Firestore } from '@angular/fire/firestore';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { collection, doc, getDocs, orderBy, query, serverTimestamp, updateDoc } from 'firebase/firestore';

interface AdminUserRow {
  id: string;
  uid: string;
  name: string;
  email: string;
  approvalStatus: string;
  approved: boolean;
  approvedBy: string;
}

@Component({
  selector: 'app-users-admin-page',
  imports: [CommonModule, MatCardModule, MatButtonModule, MatIconModule, MatSnackBarModule],
  templateUrl: './users-admin-page.html',
  styleUrl: './users-admin-page.scss',
})
export class UsersAdminPage implements OnInit {
  private readonly firestore = inject(Firestore);
  private readonly auth = inject(Auth);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly users = signal<AdminUserRow[]>([]);
  protected readonly loading = signal(true);
  protected readonly errorMessage = signal('');
  protected readonly approvingById = signal<Record<string, boolean>>({});

  async ngOnInit(): Promise<void> {
    await this.loadUsers();
  }

  protected isApproving(userId: string): boolean {
    return this.approvingById()[userId] === true;
  }

  protected canApprove(user: AdminUserRow): boolean {
    return !user.approved || this.normalizeStatus(user.approvalStatus) !== 'approved';
  }

  protected async approveUser(user: AdminUserRow): Promise<void> {
    if (!this.canApprove(user) || this.isApproving(user.id)) {
      return;
    }

    this.errorMessage.set('');
    this.approvingById.update(current => ({ ...current, [user.id]: true }));

    const approvedBy = this.auth.currentUser?.email ?? this.auth.currentUser?.uid ?? 'admin';

    try {
      const userRef = doc(this.firestore, 'users', user.id);
      await updateDoc(userRef, {
        approvalStatus: 'approved',
        approved: true,
        approvedBy,
        updatedAt: serverTimestamp(),
      });

      this.users.update(list =>
        list.map(item =>
          item.id === user.id
            ? {
                ...item,
                approvalStatus: 'approved',
                approved: true,
                approvedBy,
              }
            : item
        )
      );

      this.snackBar.open(`Usuario ${user.name} aprovado com sucesso.`, 'Fechar', { duration: 3000 });
    } catch {
      this.errorMessage.set('Nao foi possivel aprovar o usuario. Tente novamente.');
    } finally {
      this.approvingById.update(current => ({ ...current, [user.id]: false }));
    }
  }

  protected trackByUser(_: number, user: AdminUserRow): string {
    return user.id;
  }

  private async loadUsers(): Promise<void> {
    this.loading.set(true);
    this.errorMessage.set('');

    try {
      const usersRef = collection(this.firestore, 'users');
      const usersQuery = query(usersRef, orderBy('name', 'asc'));
      const snapshot = await getDocs(usersQuery);

      const list = snapshot.docs.map(item => {
        const data = item.data() as Record<string, unknown>;

        return {
          id: item.id,
          uid: String(data['uid'] ?? item.id),
          name: String(data['name'] ?? 'Sem nome'),
          email: String(data['email'] ?? 'Sem e-mail'),
          approvalStatus: String(data['approvalStatus'] ?? ''),
          approved: Boolean(data['approved']),
          approvedBy: String(data['approvedBy'] ?? ''),
        } satisfies AdminUserRow;
      });

      this.users.set(list);
    } catch {
      this.errorMessage.set('Erro ao carregar usuarios para aprovacao.');
      this.users.set([]);
    } finally {
      this.loading.set(false);
    }
  }

  private normalizeStatus(value: string): string {
    const normalized = value.trim().toLowerCase();

    if (normalized === 'pendding' || normalized === 'pending') {
      return 'pending';
    }

    return normalized;
  }

}
