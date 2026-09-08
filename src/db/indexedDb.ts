import {
  UserProfile,
  WorkoutProgram,
  Exercise,
  WorkoutSession,
  PersonalRecord,
  Goal,
  BodyMeasurement,
  ExercisePerformance,
  ExerciseBest,
  WorkoutDraft,
} from '../types';
import { buildSessionPerformances, recomputeExerciseBests } from '../utilsProgression';
import {
  initialProfile,
  initialPrograms,
  initialExercises,
} from '../data/initialData';
import { MY_PROGRAM } from '../data/myProgram';
import { serializeBackup, parseBackup, BackupError, SETTINGS_KEY } from './backup';
import { getWorkoutSettings, normaliseWorkoutSettings } from '../utilsSettings';

const DB_NAME = 'SportTrackDB';
const DB_VERSION = 8; // v8: sessionDrafts store (additive)

// F1 — pure decision helper (exported for unit tests): the preloaded program
// (fixed id MY_PROGRAM.id) is created ONLY when it is absent. Once the user has
// edited it, no future initialisation ever overwrites a program back to the
// default content. Returns true when the default must be seeded.
export function shouldSeedDefaultProgram(existingPrograms: readonly { id: string }[]): boolean {
  return !existingPrograms.some((p) => !!p && p.id === MY_PROGRAM.id);
}

export class SportTrackStorage {
  private static dbPromise: Promise<IDBDatabase> | null = null;

  public static getDB(): Promise<IDBDatabase> {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return Promise.reject(new Error('IndexedDB not supported'));
    }

    if (!this.dbPromise) {
      this.dbPromise = new Promise((resolve, reject) => {
        const request = window.indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;

          // Create object stores if not existing
          if (!db.objectStoreNames.contains('profile')) {
            db.createObjectStore('profile', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('programs')) {
            db.createObjectStore('programs', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('exercises')) {
            db.createObjectStore('exercises', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('sessions')) {
            db.createObjectStore('sessions', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('records')) {
            db.createObjectStore('records', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('goals')) {
            db.createObjectStore('goals', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('measurements')) {
            db.createObjectStore('measurements', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('exercisePerformances')) {
            const perfStore = db.createObjectStore('exercisePerformances', { keyPath: 'id' });
            perfStore.createIndex('byExerciseDate', ['exerciseId', 'date']);
            perfStore.createIndex('byDate', 'date');
            perfStore.createIndex('bySessionId', 'sessionId');
          }
          if (!db.objectStoreNames.contains('exerciseBests')) {
            db.createObjectStore('exerciseBests', { keyPath: 'exerciseId' });
          }
          if (!db.objectStoreNames.contains('sessionDrafts')) {
            db.createObjectStore('sessionDrafts', { keyPath: 'id' });
          }
        };

        request.onsuccess = async (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          await SportTrackStorage.seedOrSyncInitial(db);
          resolve(db);
        };

        request.onerror = (event) => {
          console.error('IndexedDB Error:', (event.target as IDBOpenDBRequest).error);
          reject((event.target as IDBOpenDBRequest).error);
        };
      });
    }

    return this.dbPromise;
  }

  private static async seedOrSyncInitial(db: IDBDatabase): Promise<void> {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(
        ['profile', 'programs', 'exercises', 'sessions', 'records', 'goals', 'measurements', 'exercisePerformances', 'exerciseBests'],
        'readwrite'
      );
      const profileStore = tx.objectStore('profile');
      const progStore = tx.objectStore('programs');
      const exStore = tx.objectStore('exercises');
      const sessStore = tx.objectStore('sessions');
      const recStore = tx.objectStore('records');
      const goalStore = tx.objectStore('goals');
      const measStore = tx.objectStore('measurements');
      const perfStore = tx.objectStore('exercisePerformances');
      const bestStore = tx.objectStore('exerciseBests');

      // v6 is intentionally a clean migration because the previous versions
      // contained demo programs/data that the user never created.
      const migrationKey = 'sporttrack_v6_clean_migration_done';
      const alreadyMigrated = typeof localStorage !== 'undefined' && localStorage.getItem(migrationKey) === 'true';

      const finishCleanMigration = () => {
        profileStore.clear();
        progStore.clear();
        sessStore.clear();
        recStore.clear();
        goalStore.clear();
        measStore.clear();
        perfStore.clear();
        bestStore.clear();
        profileStore.put({ id: 'main_profile', ...initialProfile });
        // Only the user's explicitly requested personal program is seeded.
        initialPrograms.forEach((p) => progStore.put(p));
        initialExercises.forEach((e) => exStore.put(e));
        if (typeof localStorage !== 'undefined') localStorage.setItem(migrationKey, 'true');
      };

      if (!alreadyMigrated) {
        finishCleanMigration();
      } else {
        // Application-level data update (NOT an IndexedDB migration, V8 kept).
        //
        // Ensure the OFFICIAL preloaded program (fixed id 'prog-my-personal-bodyweight')
        // is created only when it is MISSING. If the user has edited it, the edit
        // is preserved: existing programs are never overwritten, the same ID is
        // kept (no duplicate, all internal references keep working), and
        // sessions/history/records/performances/goals are never touched.
        const getAllProg = progStore.getAll();
        getAllProg.onsuccess = () => {
          const existingProgs = (getAllProg.result || []) as WorkoutProgram[];
          if (shouldSeedDefaultProgram(existingProgs)) {
            progStore.put(MY_PROGRAM);
          }
        };

        // Never recreate deleted programs. Only add missing exercise-library entries.
        const getAllEx = exStore.getAll();
        getAllEx.onsuccess = () => {
          const existing = (getAllEx.result || []) as Exercise[];
          const existingIds = new Set(existing.map((e) => e.id));
          initialExercises.forEach((initEx) => {
            if (!existingIds.has(initEx.id)) exStore.put(initEx);
          });
        };
      }

      tx.oncomplete = async () => {
        try {
          await SportTrackStorage.ensureProgressionBackfill(db);
          resolve();
        } catch (e) {
          reject(e);
        }
      };
      tx.onerror = () => reject(tx.error || new Error('IndexedDB transaction failed'));
      tx.onabort = () => reject(tx.error || new Error('IndexedDB transaction aborted'));
    });
  }

  // Additive, idempotent v6 -> v7 backfill. Rebuilds the progression history from
  // previously saved sessions and recomputes the exercise bests whenever empty.
  private static async ensureProgressionBackfill(db: IDBDatabase): Promise<void> {
    const read = async (store: string) =>
      new Promise<any[]>((resolve, reject) => {
        const tx = db.transaction(store, 'readonly');
        const req = tx.objectStore(store).getAll();
        req.onsuccess = () => resolve(req.result as any[]);
        req.onerror = () => reject(req.error);
      });

    const write = async (perfs: ExercisePerformance[], bests: ExerciseBest[]) =>
      new Promise<void>((resolve, reject) => {
        const tx = db.transaction(['exercisePerformances', 'exerciseBests'], 'readwrite');
        const perfStore = tx.objectStore('exercisePerformances');
        const bestStore = tx.objectStore('exerciseBests');
        for (const p of perfs) perfStore.put(p);
        for (const b of bests) bestStore.put(b);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error || new Error('Backfill write failed'));
      });

    const sessions = (await read('sessions')) as WorkoutSession[];
    let perfs = (await read('exercisePerformances')) as ExercisePerformance[];

    if (perfs.length === 0 && sessions.length > 0) {
      perfs = sessions.flatMap((s) => buildSessionPerformances(s));
    }
    if (perfs.length === 0) return;

    await write(perfs, recomputeExerciseBests(perfs));
  }

  // Profile
  public static async getProfile(): Promise<UserProfile> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('profile', 'readonly');
      const req = tx.objectStore('profile').get('main_profile');
      req.onsuccess = () => {
        if (req.result) {
          const { id, ...data } = req.result;
          resolve(data as UserProfile);
        } else {
          resolve(initialProfile);
        }
      };
      req.onerror = () => reject(req.error);
    });
  }

  public static async saveProfile(profile: UserProfile): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('profile', 'readwrite');
      const req = tx.objectStore('profile').put({ id: 'main_profile', ...profile });
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  // Generic List Operations
  public static async getAll<T>(storeName: string): Promise<T[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const req = tx.objectStore(storeName).getAll();
      req.onsuccess = () => resolve(req.result as T[]);
      req.onerror = () => reject(req.error);
    });
  }

  public static async putItem<T>(storeName: string, item: T): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const req = tx.objectStore(storeName).put(item);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  public static async deleteItem(storeName: string, id: string): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const req = tx.objectStore(storeName).delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  // Specific helpers
  public static async getPrograms(): Promise<WorkoutProgram[]> {
    return this.getAll<WorkoutProgram>('programs');
  }

  public static async getExercises(): Promise<Exercise[]> {
    return this.getAll<Exercise>('exercises');
  }

  public static async getSessions(): Promise<WorkoutSession[]> {
    return this.getAll<WorkoutSession>('sessions');
  }

  public static async getRecords(): Promise<PersonalRecord[]> {
    return this.getAll<PersonalRecord>('records');
  }

  public static async getGoals(): Promise<Goal[]> {
    return this.getAll<Goal>('goals');
  }

  public static async getMeasurements(): Promise<BodyMeasurement[]> {
    return this.getAll<BodyMeasurement>('measurements');
  }

  public static async getExercisePerformances(): Promise<ExercisePerformance[]> {
    return this.getAll<ExercisePerformance>('exercisePerformances');
  }

  public static async getExerciseBests(): Promise<ExerciseBest[]> {
    return this.getAll<ExerciseBest>('exerciseBests');
  }

  public static async saveExercisePerformances(entries: ExercisePerformance[]): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('exercisePerformances', 'readwrite');
      const store = tx.objectStore('exercisePerformances');
      for (const entry of entries) store.put(entry);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error('Saving performances failed'));
      tx.onabort = () => reject(tx.error || new Error('Saving performances aborted'));
    });
  }

  public static async saveExerciseBests(bests: ExerciseBest[]): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('exerciseBests', 'readwrite');
      const store = tx.objectStore('exerciseBests');
      for (const best of bests) store.put(best);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error('Saving bests failed'));
      tx.onabort = () => reject(tx.error || new Error('Saving bests aborted'));
    });
  }

  // Session draft (auto-saved in-progress session)
  public static async getSessionDraft(): Promise<WorkoutDraft | null> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('sessionDrafts', 'readonly');
      const req = tx.objectStore('sessionDrafts').get('active_draft');
      req.onsuccess = () => resolve((req.result as WorkoutDraft) || null);
      req.onerror = () => reject(req.error);
    });
  }

  public static async saveSessionDraft(draft: WorkoutDraft): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('sessionDrafts', 'readwrite');
      const req = tx.objectStore('sessionDrafts').put({ ...draft, id: 'active_draft' });
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  public static async deleteSessionDraft(): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('sessionDrafts', 'readwrite');
      const req = tx.objectStore('sessionDrafts').delete('active_draft');
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  // Full Database Backup Export (LOT J).
  // Produces a versioned JSON backup of ALL user data (the 10 object stores)
  // plus the LOT H user preferences (localStorage) when available.
  // formatVersion is independent of DB_VERSION and never changes it.
  public static async exportAllData(): Promise<string> {
    const [profile, programs, exercises, sessions, records, goals, measurements, exercisePerformances, exerciseBests] = await Promise.all([
      this.getProfile(),
      this.getPrograms(),
      this.getExercises(),
      this.getSessions(),
      this.getRecords(),
      this.getGoals(),
      this.getMeasurements(),
      this.getExercisePerformances(),
      this.getExerciseBests(),
    ]);
    const activeDraft = await this.getSessionDraft();

    const data: Record<string, unknown> = {
      profile,
      programs,
      exercises,
      sessions,
      records,
      goals,
      measurements,
      exercisePerformances,
      exerciseBests,
      // sessionDrafts is exported as a (possibly empty) ARRAY — consistent with
      // the array-store model used for every other store and with the import
      // validation. The store holds at most one draft, keyed 'active_draft'.
      sessionDrafts: activeDraft ? [activeDraft] : [],
    };

    return serializeBackup(data, getWorkoutSettings());
  }

  // Full Database Import (LOT J).
  // Parses and VALIDATES the JSON before opening any write transaction, so an
  // invalid / malformed / wrong-version file can never clear or half-modify the
  // existing database. Only a fully-validated backup triggers a (single, atomic)
  // write transaction. On success, the SportTrack preferences (localStorage) are
  // also restored — other localStorage keys are never touched.
  public static async importAllData(jsonString: string): Promise<boolean> {
    let data: Record<string, unknown>;
    let settings: unknown;
    try {
      ({ data, settings } = parseBackup(jsonString));
    } catch (e) {
      if (e instanceof BackupError) {
        console.error('Backup import rejected:', e.code, e.message);
      } else {
        console.error('Backup import rejected:', e);
      }
      return false;
    }

    try {
      const db = await this.getDB();
      const tx = db.transaction(
        ['profile', 'programs', 'exercises', 'sessions', 'records', 'goals', 'measurements', 'exercisePerformances', 'exerciseBests', 'sessionDrafts'],
        'readwrite'
      );

      // Fully-validated backup: write every store. profile is a single object;
      // each remaining store is a validated array of records with string ids.
      tx.objectStore('profile').put({ id: 'main_profile', ...(data.profile as UserProfile) });

      const programsStore = tx.objectStore('programs');
      programsStore.clear();
      (data.programs as WorkoutProgram[]).forEach((item) => programsStore.put(item));

      const exercisesStore = tx.objectStore('exercises');
      exercisesStore.clear();
      (data.exercises as Exercise[]).forEach((item) => exercisesStore.put(item));

      const sessionsStore = tx.objectStore('sessions');
      sessionsStore.clear();
      (data.sessions as WorkoutSession[]).forEach((item) => sessionsStore.put(item));

      const recordsStore = tx.objectStore('records');
      recordsStore.clear();
      (data.records as PersonalRecord[]).forEach((item) => recordsStore.put(item));

      const goalsStore = tx.objectStore('goals');
      goalsStore.clear();
      (data.goals as Goal[]).forEach((item) => goalsStore.put(item));

      const measurementsStore = tx.objectStore('measurements');
      measurementsStore.clear();
      (data.measurements as BodyMeasurement[]).forEach((item) => measurementsStore.put(item));

      const perfsStore = tx.objectStore('exercisePerformances');
      perfsStore.clear();
      (data.exercisePerformances as ExercisePerformance[]).forEach((item) => perfsStore.put(item));

      const bestsStore = tx.objectStore('exerciseBests');
      bestsStore.clear();
      (data.exerciseBests as ExerciseBest[]).forEach((item) => bestsStore.put(item));

      const draftsStore = tx.objectStore('sessionDrafts');
      draftsStore.clear();
      const drafts = data.sessionDrafts as WorkoutDraft[];
      drafts.forEach((item) => draftsStore.put({ ...item, id: 'active_draft' }));

      return new Promise((resolve) => {
        tx.oncomplete = () => {
          // Only restore preferences after the IndexedDB write has fully
          // committed. Restores ONLY the SportTrack settings key; no other
          // localStorage key is ever created, modified or removed.
          if (settings !== undefined) {
            try {
              // Normalise before writing: imported settings may carry extra
              // keys or incorrect types that pass JSON-level validation but
              // would bypass the strict per-field checks applied on normal load.
              const safe = normaliseWorkoutSettings(settings);
              window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(safe));
            } catch {
              // storage unavailable -> non-fatal
            }
          }
          resolve(true);
        };
        tx.onerror = () => resolve(false);
        tx.onabort = () => resolve(false);
      });
    } catch (e) {
      console.error('Import error', e);
      return false;
    }
  }

  // Reset to a clean SportTrack state (no completed activity/demo data).
  public static async resetToDefault(): Promise<void> {
    const db = await this.getDB();
    const tx = db.transaction(
      ['profile', 'programs', 'exercises', 'sessions', 'records', 'goals', 'measurements', 'exercisePerformances', 'exerciseBests', 'sessionDrafts'],
      'readwrite'
    );
    tx.objectStore('profile').clear();
    tx.objectStore('programs').clear();
    tx.objectStore('exercises').clear();
    tx.objectStore('sessions').clear();
    tx.objectStore('records').clear();
    tx.objectStore('goals').clear();
    tx.objectStore('measurements').clear();
    tx.objectStore('exercisePerformances').clear();
    tx.objectStore('exerciseBests').clear();
    tx.objectStore('sessionDrafts').clear();

    profileStorePut(tx);
    initialPrograms.forEach((p) => tx.objectStore('programs').put(p));
    initialExercises.forEach((e) => tx.objectStore('exercises').put(e));

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error('Reset failed'));
      tx.onabort = () => reject(tx.error || new Error('Reset aborted'));
    });
  }

}

function profileStorePut(tx: IDBTransaction) {
  tx.objectStore('profile').put({ id: 'main_profile', ...initialProfile });
}
