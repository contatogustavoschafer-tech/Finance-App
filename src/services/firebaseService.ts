import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDoc,
  deleteDoc,
  onSnapshot,
  Firestore,
  Unsubscribe,
} from 'firebase/firestore';
import { AppUser, AppUserId, BudgetGoal, Transaction } from '../types';
import { INITIAL_TRANSACTIONS, INITIAL_BUDGET_GOALS } from '../constants/initialData';

// Configuração do Firebase extraída do projeto Artemis Semijoias
export const FIREBASE_CONFIG = {
  apiKey: "AIzaSyDJIGAACeImlhfd33E_ScfIVDOM6aHzr9c",
  authDomain: "artemis-semijoias.firebaseapp.com",
  projectId: "artemis-semijoias",
  storageBucket: "artemis-semijoias.firebasestorage.app",
  messagingSenderId: "805016886138",
  appId: "1:805016886138:web:3f022afed05ad3404914c3",
  measurementId: "G-D51B4S0R02"
};

const SESSION_STORAGE_KEY = 'finance_ia_auth_user';
const USERS_COLLECTION = 'finance_ia_users';

export const DEFAULT_USERS: Record<AppUserId, AppUser> = {
  gustavo: {
    id: 'gustavo',
    name: 'Gustavo',
    avatar: 'G',
    color: 'from-emerald-600 to-teal-700',
    needsPasswordChange: true,
  },
  carolina: {
    id: 'carolina',
    name: 'Carolina',
    avatar: 'C',
    color: 'from-rose-500 to-pink-600',
    needsPasswordChange: true,
  },
};

// SHA-256 helper via Web Crypto API
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

let firebaseApp: FirebaseApp | null = null;
let firestoreDb: Firestore | null = null;

export function getFirebaseDb(): Firestore {
  if (!firestoreDb) {
    if (!getApps().length) {
      firebaseApp = initializeApp(FIREBASE_CONFIG);
    } else {
      firebaseApp = getApp();
    }
    firestoreDb = getFirestore(firebaseApp);
  }
  return firestoreDb;
}

/**
 * Garante que o documento do usuário exista no Firestore.
 * Se não existir, inicializa com a senha padrão '12345678' e needsPasswordChange: true.
 */
export async function ensureUserInitialized(userId: AppUserId): Promise<AppUser> {
  try {
    const db = getFirebaseDb();
    const userDocRef = doc(db, USERS_COLLECTION, userId);
    const snap = await getDoc(userDocRef);

    if (snap.exists()) {
      const data = snap.data() as AppUser;
      return {
        ...DEFAULT_USERS[userId],
        ...data,
      };
    } else {
      // Criar usuário com senha padrão '12345678'
      const defaultHash = await hashPassword('12345678');
      const newUser: AppUser = {
        ...DEFAULT_USERS[userId],
        needsPasswordChange: true,
        passwordHash: defaultHash,
        updatedAt: new Date().toISOString(),
      };
      await setDoc(userDocRef, newUser, { merge: true });
      return newUser;
    }
  } catch (error) {
    console.warn(`[Firebase] Erro ao inicializar usuário ${userId}, usando fallback local:`, error);
    // Fallback local caso haja restrição temporária no Firestore
    const localSaved = localStorage.getItem(`local_user_${userId}`);
    if (localSaved) {
      try {
        return JSON.parse(localSaved);
      } catch (e) {}
    }
    const defaultHash = await hashPassword('12345678');
    const localUser: AppUser = {
      ...DEFAULT_USERS[userId],
      needsPasswordChange: true,
      passwordHash: defaultHash,
    };
    localStorage.setItem(`local_user_${userId}`, JSON.stringify(localUser));
    return localUser;
  }
}

/**
 * Autentica o usuário pelo username e senha.
 */
export async function authenticateUser(
  userId: AppUserId,
  rawPassword: string
): Promise<{ success: boolean; user?: AppUser; message?: string }> {
  try {
    const user = await ensureUserInitialized(userId);
    const inputHash = await hashPassword(rawPassword);
    const defaultHash = await hashPassword('12345678');

    // Se o usuário ainda tem a senha padrão ou needsPasswordChange true
    const isDefaultPassword = inputHash === defaultHash;

    if (user.passwordHash) {
      if (user.passwordHash === inputHash) {
        // Se a senha bate com o hash salvo
        const updatedUser: AppUser = {
          ...user,
          needsPasswordChange: user.needsPasswordChange || isDefaultPassword,
        };
        saveCurrentSession(updatedUser);
        return { success: true, user: updatedUser };
      } else {
        return { success: false, message: 'Senha incorreta. Tente novamente.' };
      }
    } else {
      // Sem hash prévio, testa a padrão
      if (isDefaultPassword) {
        saveCurrentSession(user);
        return { success: true, user };
      }
      return { success: false, message: 'Senha incorreta. A senha inicial é 12345678.' };
    }
  } catch (err: any) {
    console.error('[Firebase] Erro na autenticação:', err);
    return { success: false, message: err?.message || 'Erro ao conectar ao servidor de login.' };
  }
}

/**
 * Altera a senha do usuário e remove a flag de obrigatoriedade de troca.
 */
export async function updateUserPassword(
  userId: AppUserId,
  newPassword: string
): Promise<{ success: boolean; user?: AppUser; message?: string }> {
  if (!newPassword || newPassword.length < 4) {
    return { success: false, message: 'A nova senha deve conter pelo menos 4 caracteres.' };
  }

  try {
    const newHash = await hashPassword(newPassword);
    const updatedUser: AppUser = {
      ...DEFAULT_USERS[userId],
      needsPasswordChange: false,
      passwordHash: newHash,
      updatedAt: new Date().toISOString(),
    };

    try {
      const db = getFirebaseDb();
      const userDocRef = doc(db, USERS_COLLECTION, userId);
      await setDoc(userDocRef, updatedUser, { merge: true });
    } catch (firestoreErr) {
      console.warn('[Firebase] Não foi possível salvar senha na nuvem, salvando localmente:', firestoreErr);
    }

    localStorage.setItem(`local_user_${userId}`, JSON.stringify(updatedUser));
    saveCurrentSession(updatedUser);

    return { success: true, user: updatedUser };
  } catch (err: any) {
    console.error('[Firebase] Erro ao trocar senha:', err);
    return { success: false, message: err?.message || 'Erro ao atualizar senha.' };
  }
}

/**
 * Gerenciamento de Sessão Ativa
 */
export function saveCurrentSession(user: AppUser) {
  try {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(user));
  } catch (e) {}
}

export function getStoredSession(): AppUser | null {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw) as AppUser;
    }
  } catch (e) {}
  return null;
}

export function clearSession() {
  try {
    localStorage.removeItem(SESSION_STORAGE_KEY);
  } catch (e) {}
}

// -------------------------------------------------------------
// OPERAÇÕES DO FIRESTORE EM TEMPO REAL PARA CADA USUÁRIO
// -------------------------------------------------------------

/**
 * Escuta em tempo real as transações de um usuário específico.
 */
export function subscribeToUserTransactions(
  userId: AppUserId,
  onUpdate: (transactions: Transaction[]) => void
): Unsubscribe {
  try {
    const db = getFirebaseDb();
    const txCollectionRef = collection(db, USERS_COLLECTION, userId, 'transactions');

    const unsubscribe = onSnapshot(
      txCollectionRef,
      (snapshot) => {
        if (!snapshot.empty) {
          const list: Transaction[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            list.push({
              id: docSnap.id,
              userId,
              date: data.date || new Date().toISOString().split('T')[0],
              description: data.description || 'Sem descrição',
              amount: Number(data.amount) || 0,
              type: data.type || 'DESPESA',
              category: data.category || 'Outros',
              paymentMethod: data.paymentMethod || 'PIX',
              status: data.status || 'Pago',
              notes: data.notes || '',
              source: data.source || 'manual',
              syncedToSheets: !!data.syncedToSheets,
              sheetRowIndex: data.sheetRowIndex,
              createdAt: data.createdAt || new Date().toISOString(),
            });
          });
          // Ordenar por data decrescente
          list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime() || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          
          localStorage.setItem(`tx_${userId}`, JSON.stringify(list));
          onUpdate(list);
        } else {
          // Se for primeira vez no Firebase, tentar pegar do cache local ou dados iniciais se for Gustavo
          const localSaved = localStorage.getItem(`tx_${userId}`);
          if (localSaved) {
            try {
              const parsed = JSON.parse(localSaved);
              onUpdate(parsed);
              return;
            } catch (e) {}
          }
          if (userId === 'gustavo') {
            onUpdate(INITIAL_TRANSACTIONS);
          } else {
            onUpdate([]);
          }
        }
      },
      (error) => {
        console.warn(`[Firebase] Erro ao escutar transações de ${userId}:`, error);
        // Fallback local
        const localSaved = localStorage.getItem(`tx_${userId}`);
        if (localSaved) {
          try {
            onUpdate(JSON.parse(localSaved));
            return;
          } catch (e) {}
        }
        onUpdate(userId === 'gustavo' ? INITIAL_TRANSACTIONS : []);
      }
    );

    return unsubscribe;
  } catch (err) {
    console.warn(`[Firebase] Falha ao configurar listener de transações para ${userId}:`, err);
    const localSaved = localStorage.getItem(`tx_${userId}`);
    if (localSaved) {
      try {
        onUpdate(JSON.parse(localSaved));
      } catch (e) {}
    } else {
      onUpdate(userId === 'gustavo' ? INITIAL_TRANSACTIONS : []);
    }
    return () => {};
  }
}

/**
 * Salva ou atualiza uma transação no Firestore do usuário.
 */
export async function saveUserTransaction(userId: AppUserId, tx: Transaction): Promise<void> {
  // Salva no cache local primeiro para resposta instantânea
  try {
    const localKey = `tx_${userId}`;
    const raw = localStorage.getItem(localKey);
    let list: Transaction[] = raw ? JSON.parse(raw) : [];
    const index = list.findIndex((t) => t.id === tx.id);
    if (index >= 0) {
      list[index] = tx;
    } else {
      list.unshift(tx);
    }
    localStorage.setItem(localKey, JSON.stringify(list));
  } catch (e) {}

  try {
    const db = getFirebaseDb();
    const txDocRef = doc(db, USERS_COLLECTION, userId, 'transactions', tx.id);
    await setDoc(txDocRef, {
      ...tx,
      userId,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  } catch (err) {
    console.warn(`[Firebase] Não foi possível salvar transação ${tx.id} na nuvem:`, err);
  }
}

/**
 * Exclui uma transação do Firestore do usuário.
 */
export async function deleteUserTransaction(userId: AppUserId, txId: string): Promise<void> {
  // Remove do cache local
  try {
    const localKey = `tx_${userId}`;
    const raw = localStorage.getItem(localKey);
    if (raw) {
      const list: Transaction[] = JSON.parse(raw);
      const filtered = list.filter((t) => t.id !== txId);
      localStorage.setItem(localKey, JSON.stringify(filtered));
    }
  } catch (e) {}

  try {
    const db = getFirebaseDb();
    const txDocRef = doc(db, USERS_COLLECTION, userId, 'transactions', txId);
    await deleteDoc(txDocRef);
  } catch (err) {
    console.warn(`[Firebase] Não foi possível excluir transação ${txId} da nuvem:`, err);
  }
}

/**
 * Escuta metas de orçamento do usuário no Firestore.
 */
export function subscribeToUserBudgetGoals(
  userId: AppUserId,
  onUpdate: (goals: BudgetGoal[]) => void
): Unsubscribe {
  try {
    const db = getFirebaseDb();
    const goalsDocRef = doc(db, USERS_COLLECTION, userId, 'settings', 'budgetGoals');

    return onSnapshot(
      goalsDocRef,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          if (Array.isArray(data.goals)) {
            localStorage.setItem(`budget_${userId}`, JSON.stringify(data.goals));
            onUpdate(data.goals);
            return;
          }
        }
        const localSaved = localStorage.getItem(`budget_${userId}`);
        if (localSaved) {
          try {
            onUpdate(JSON.parse(localSaved));
            return;
          } catch (e) {}
        }
        onUpdate(INITIAL_BUDGET_GOALS);
      },
      (err) => {
        console.warn(`[Firebase] Erro ao escutar metas para ${userId}:`, err);
        onUpdate(INITIAL_BUDGET_GOALS);
      }
    );
  } catch (e) {
    onUpdate(INITIAL_BUDGET_GOALS);
    return () => {};
  }
}

/**
 * Salva metas de orçamento no Firestore.
 */
export async function saveUserBudgetGoals(userId: AppUserId, goals: BudgetGoal[]): Promise<void> {
  try {
    localStorage.setItem(`budget_${userId}`, JSON.stringify(goals));
    const db = getFirebaseDb();
    const goalsDocRef = doc(db, USERS_COLLECTION, userId, 'settings', 'budgetGoals');
    await setDoc(goalsDocRef, { goals, updatedAt: new Date().toISOString() }, { merge: true });
  } catch (err) {
    console.warn(`[Firebase] Falha ao salvar metas na nuvem:`, err);
  }
}
