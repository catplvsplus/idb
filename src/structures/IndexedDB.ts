import { AsyncEventEmitter } from '@vladfrangu/async_event_emitter';
import { Transaction } from './Transaction.js';

export class IndexedDB<V extends IndexedDBSchema> extends AsyncEventEmitter<IndexedDBEvents<V>> {
    public storage: IDBDatabase;

    public constructor(storage: IDBDatabase) {
        super();

        this.storage = storage;
        this.storage.addEventListener('versionchange', (event) => this.emit('versionchange', event));
        this.storage.addEventListener('close', (event) => this.emit('close', event));
        this.storage.addEventListener('error', (event) => this.emit('error', event));
        this.storage.addEventListener('abort', (event) => this.emit('abort', event));
    }

    public transaction<K extends keyof V = keyof V>(options: IndexedDBTransactionOptions<V, K>): Transaction<Pick<V, K>> {
        const { storeNames, mode = 'readonly', ...opts } = options;

        return new Transaction(this.storage.transaction(String(storeNames), mode, opts));
    }

    public get<K extends keyof V>(storeName: K, key: IDBValidKey): Promise<V[K] | undefined> {
        const transaction = this.transaction({ storeNames: storeName, mode: 'readonly' });
        const store = transaction.objectStore(storeName);

        return store.get(key);
    }

    public getAll<K extends keyof V>(storeName: K, query?: IDBValidKey|IDBKeyRange|null, count?: number): Promise<V[K][]> {
        const transaction = this.transaction({ storeNames: storeName, mode: 'readonly' });
        const store = transaction.objectStore(storeName);

        return store.getAll(query, count);
    }

    public getAllKeys<K extends keyof V>(storeName: K, query?: IDBValidKey|IDBKeyRange|null, count?: number): Promise<IDBValidKey[]> {
        const transaction = this.transaction({ storeNames: storeName, mode: 'readonly' });
        const store = transaction.objectStore(storeName);

        return store.getAllKeys(query, count);
    }

    public count<K extends keyof V>(storeName: K, query?: IDBValidKey|IDBKeyRange): Promise<number> {
        const transaction = this.transaction({ storeNames: storeName, mode: 'readonly' });
        const store = transaction.objectStore(storeName);

        return store.count(query);
    }

    public add<K extends keyof V>(storeName: K, value: V[K], key?: IDBValidKey): Promise<IDBValidKey> {
        const transaction = this.transaction({ storeNames: storeName, mode: 'readwrite' });
        const store = transaction.objectStore(storeName);

        return store.add(value, key);
    }

    public put<K extends keyof V>(storeName: K, value: V[K], key?: IDBValidKey): Promise<IDBValidKey> {
        const transaction = this.transaction({ storeNames: storeName, mode: 'readwrite' });
        const store = transaction.objectStore(storeName);

        return store.put(value, key);
    }

    public delete<K extends keyof V>(storeName: K, key: IDBValidKey): Promise<void> {
        const transaction = this.transaction({ storeNames: storeName, mode: 'readwrite' });
        const store = transaction.objectStore(storeName);

        return store.delete(key);
    }

    public clear<K extends keyof V>(storeName: K): Promise<void> {
        const transaction = this.transaction({ storeNames: storeName, mode: 'readwrite' });
        const store = transaction.objectStore(storeName);

        return store.clear();
    }

    public async close(): Promise<void> {
        return new Promise<void>(resolve => {
            this.storage.addEventListener('close', () => resolve());
            this.storage.close();
        });
    }

    public async deleteDatabase(): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            const request = indexedDB.deleteDatabase(this.storage.name);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve();
        });
    }

    public static async open<V extends IndexedDBSchema>(options: IndexedDBOptions): Promise<IndexedDB<V>> {
        if (!IndexedDB.supported()) {
            throw new Error('Offline storage is not supported in this environment.');
        }

        const request = indexedDB.open(options.name, options.version);
        const storage = await new Promise<IndexedDB<V>>((resolve, reject) => {
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(new IndexedDB<V>(request.result));

            request.onupgradeneeded = () => {
                const db = request.result;

                for (const store of options.stores) {
                    if (db.objectStoreNames.contains(store.name)) {
                        continue;
                    }

                    const objectStore = db.createObjectStore(
                        store.name,
                        {
                            keyPath: store.keyPath,
                            autoIncrement: store.autoIncrement
                        }
                    );

                    for (const index of store.indexes || []) {
                        objectStore.createIndex(
                            index.name,
                            index.keyPath,
                            {
                                unique: index.unique,
                                multiEntry: index.multiEntry
                            }
                        );
                    }
                }
            };
        });

        return storage;
    }

    public static supported(): boolean {
        return typeof window !== 'undefined'
            && 'indexedDB' in window
            && 'navigator' in window
            && 'storage' in navigator;
    }

    public static async estimate(): Promise<StorageEstimate> {
        if (!IndexedDB.supported()) {
            throw new Error('IndxedDB is not supported in this environment.');
        }

        return navigator.storage.estimate();
    }

    public static async persist(): Promise<boolean> {
        if (!IndexedDB.supported()) {
            throw new Error('IndxedDB is not supported in this environment.');
        }

        return navigator.storage.persist();
    }

    public static async persisted(): Promise<boolean> {
        if (!IndexedDB.supported()) {
            throw new Error('Offline storage is not supported in this environment.');
        }

        return navigator.storage.persisted();
    }
}

export type IndexedDBSchema = { [key: string]: unknown; };

export interface IndexedDBOptions {
    name: string;
    version?: number;
    stores: {
        name: string;
        keyPath: string;
        autoIncrement?: boolean;
        indexes?: {
            name: string;
            keyPath: string|Iterable<string>;
            multiEntry?: boolean;
            unique?: boolean;
        }[];
    }[];
}

export interface IndexedDBEvents<V extends IndexedDBSchema> {
    versionchange: [event: IDBVersionChangeEvent];
    close: [event: Event];
    error: [event: Event];
    abort: [event: Event];
    put: [value: IndexedDBValue<V, keyof V>];
    delete: [value: IndexedDBValue<V, keyof V>];
    clear: [storeName: keyof V];
}

export interface IndexedDBTransactionOptions<V extends IndexedDBSchema, S extends keyof V> extends IDBTransactionOptions {
    storeNames: S|S[];
    mode?: IDBTransactionMode;
}

export interface IndexedDBValue<V extends IndexedDBSchema, S extends keyof V> {
    storeName: S;
    key: IDBValidKey;
    value: V[S]|undefined;
}
