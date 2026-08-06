import {
  confirmPasswordReset,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updatePassword as updateFirebasePassword,
  updateProfile,
  type Auth,
  type User,
} from 'firebase/auth';
import { doc, setDoc, type Firestore } from 'firebase/firestore';

import { getFirebaseServices } from './firebase';

export interface SignUpInput {
  email: string;
  password: string;
  displayName?: string;
}

export class FirebaseAuthRepository {
  async signUp(input: SignUpInput): Promise<User> {
    const { auth, firestore } = this.requireServices();
    const credential = await createUserWithEmailAndPassword(
      auth,
      input.email,
      input.password,
    ).catch((error: unknown) => {
      throw this.authError('Unable to create account', error);
    });

    const displayName = input.displayName?.trim() || null;
    if (displayName) await updateProfile(credential.user, { displayName });
    await this.createProfile(firestore, credential.user, displayName);
    return credential.user;
  }

  async signIn(email: string, password: string): Promise<User> {
    const { auth } = this.requireServices();
    const credential = await signInWithEmailAndPassword(
      auth,
      email,
      password,
    ).catch((error: unknown) => {
      throw this.authError('Unable to sign in', error);
    });
    return credential.user;
  }

  async signOut(): Promise<void> {
    const { auth } = this.requireServices();
    await signOut(auth).catch((error: unknown) => {
      throw this.authError('Unable to sign out', error);
    });
  }

  async sendPasswordReset(email: string, redirectTo: string): Promise<void> {
    const { auth } = this.requireServices();
    await sendPasswordResetEmail(auth, email, {
      url: redirectTo,
      handleCodeInApp: true,
    }).catch((error: unknown) => {
      throw this.authError('Unable to send password reset', error);
    });
  }

  async updatePassword(password: string, recoveryCode?: string): Promise<void> {
    const { auth } = this.requireServices();
    try {
      if (recoveryCode) {
        await confirmPasswordReset(auth, recoveryCode, password);
        return;
      }
      if (!auth.currentUser) throw new Error('Authentication is required.');
      await updateFirebasePassword(auth.currentUser, password);
    } catch (error) {
      throw this.authError('Unable to update password', error);
    }
  }

  private async createProfile(
    firestore: Firestore,
    user: User,
    displayName: string | null,
  ): Promise<void> {
    const now = new Date().toISOString();
    await setDoc(doc(firestore, 'users', user.uid), {
      displayName,
      email: user.email,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
      locale: navigator.language || 'en-US',
      theme: 'system',
      weekStartDay: 0,
      createdAt: now,
      updatedAt: now,
    });
  }

  private requireServices(): { auth: Auth; firestore: Firestore } {
    const services = getFirebaseServices();
    if (!services) {
      throw new Error(
        'Firebase is not configured. Set the complete public Firebase configuration.',
      );
    }
    return services;
  }

  private authError(action: string, error: unknown): Error {
    const message = error instanceof Error ? error.message : 'Unknown error.';
    return new Error(`${action}: ${message}`);
  }
}
