import { Component, OnInit, inject, signal } from '@angular/core';
import { Auth, onAuthStateChanged, signOut } from '@angular/fire/auth';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { environment } from '../../../environments/environment';

const normalizeEmail = (email: string): string => email.trim().toLowerCase();

@Component({
  selector: 'app-home',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, MatButtonModule, MatMenuModule],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home implements OnInit {

  private readonly auth = inject(Auth);
  private readonly router = inject(Router);
  allowedEmails = new Set((environment.adminUsersEmails ?? []).map(normalizeEmail));
  protected readonly userEmail = signal('Operador');
  isAdmin = signal(false);

  ngOnInit(): void {
    onAuthStateChanged(this.auth, user => {
      this.userEmail.set(user?.email ?? 'Operador');
      this.isAdmin.set(user ? this.allowedEmails.has(normalizeEmail(user.email ?? '')) : false);
    });
  }

  protected async logout(): Promise<void> {
    await signOut(this.auth);
    await this.router.navigateByUrl('/auth');
  }

}
