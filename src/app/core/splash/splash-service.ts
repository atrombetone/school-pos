import { Injectable } from '@angular/core';
import { FirebaseApp } from '@angular/fire/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

@Injectable({
  providedIn: 'root',
})
export class SplashService {
  constructor(private readonly firebaseApp: FirebaseApp) {}

  async initializeFirebase(timeoutMs = 8000): Promise<void> {
    const auth = getAuth(this.firebaseApp);

    // Force services to be instantiated during splash.
    getFirestore(this.firebaseApp);
    getStorage(this.firebaseApp);

    const authReady =
      typeof auth.authStateReady === 'function'
        ? auth.authStateReady()
        : new Promise<void>((resolve) => {
            const unsubscribe = auth.onAuthStateChanged(() => {
              unsubscribe();
              resolve();
            });
          });

    await Promise.race([
      authReady,
      new Promise<void>((resolve) => setTimeout(resolve, timeoutMs)),
    ]);
  }
}
