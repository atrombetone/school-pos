import { Component, OnInit, inject, signal } from '@angular/core';
import { Auth, onAuthStateChanged, signOut } from '@angular/fire/auth';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-home',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, MatButtonModule, MatMenuModule],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home implements OnInit {

  private readonly auth = inject(Auth);
  private readonly router = inject(Router);

  protected readonly userEmail = signal('Operador');

  ngOnInit(): void {
    onAuthStateChanged(this.auth, user => {
      this.userEmail.set(user?.email ?? 'Operador');
    });
  }

  protected async logout(): Promise<void> {
    await signOut(this.auth);
    await this.router.navigateByUrl('/auth');
  }

}
