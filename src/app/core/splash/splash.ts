import { Component, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { SplashService } from './splash-service';

@Component({
  selector: 'app-splash',
  imports: [],
  templateUrl: './splash.html',
  styleUrl: './splash.scss',
})
export class Splash implements OnInit {
  protected readonly loadingMessage = signal('Preparando seu sistema...');

  private readonly router = inject(Router);
  private readonly splashService = inject(SplashService);

  async ngOnInit(): Promise<void> {
    try {
      await this.splashService.initializeFirebase();
      this.loadingMessage.set('Conexao pronta. Entrando...');
    } catch {
      this.loadingMessage.set('Nao foi possivel validar a conexao. Entrando...');
    }

    await this.router.navigateByUrl('/landing', { replaceUrl: true });
  }

}
