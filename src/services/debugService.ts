import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

// Minimal Firestore write to verify client write access
export async function debugTestWrite(userId: string) {
  const userRef = doc(db, 'users', userId);

  console.log('[DEBUG_WRITE] 🚀 Starting test write:', {
    userId,
    path: `users/${userId}`,
  });

  try {
    await setDoc(
      userRef,
      {
        debugTestWriteAt: serverTimestamp(),
        debugFlag: 'hello-from-client',
      },
      { merge: true }
    );

    console.log('[DEBUG_WRITE] ✅ Test write succeeded:', {
      userId,
      path: `users/${userId}`,
    });
  } catch (error: any) {
    console.log('[DEBUG_WRITE] ❌ Test write failed:', {
      userId,
      path: `users/${userId}`,
      errorCode: error?.code,
      errorMessage: error?.message,
      errorName: error?.name,
    });
    throw error;
  }
}
