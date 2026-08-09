import { AsyncEventEmitter } from '@vladfrangu/async_event_emitter';
import type { IndexedDBSchema } from './IndexedDB.js';
import { ObjectStore } from './ObjectStore.js';
import { DeferredPromise } from './DeferredPromise.js';

export class Transaction<V extends IndexedDBSchema> extends AsyncEventEmitter {
    public readonly data: IDBTransaction;

    public constructor(transaction: IDBTransaction) {
        super();

        this.data = transaction;

        this.data.addEventListener('abort', (event) => this.emit('abort', event));
        this.data.addEventListener('complete', (event) => this.emit('complete', event));
        this.data.addEventListener('error', (event) => this.emit('error', event));
    }

    public objectStore<K extends keyof V>(name: K): ObjectStore<V[K]> {
        return new ObjectStore<V[K]>(this.data.objectStore(String(name)));
    }

    public abort(): void {
        this.data.abort();
    }

    public commit(): void {
        this.data.commit();
    }

    public async awaitComplete(): Promise<void> {
        const { signal, abort } = new AbortController();

        const promise = new DeferredPromise<void>();

        this.data.addEventListener(
            'complete',
            () => promise.resolve(),
            { signal, once: true }
        );

        this.data.addEventListener(
            'error',
            () => promise.reject(this.data.error),
            { signal, once: true }
        );

        this.data.addEventListener(
            'abort',
            () => promise.reject(new Error('Transaction aborted')),
            { signal, once: true }
        );

        await promise;
        abort();
    }
}

export interface TransactionEvents {
    abort: Event;
    complete: Event;
    error: Event;
}