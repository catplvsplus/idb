import { DeferredPromise } from './DeferredPromise.js';

export class ObjectStore<V> {
    public readonly data: IDBObjectStore;

    public constructor(store: IDBObjectStore) {
        this.data = store;
    }

    public add(value: V, key?: IDBValidKey): Promise<IDBValidKey> {
        return ObjectStore.promisifyRequest<IDBValidKey>(this.data.add(value, key));
    }

    public put(value: V, key?: IDBValidKey): Promise<IDBValidKey> {
        return ObjectStore.promisifyRequest<IDBValidKey>(this.data.put(value, key));
    }

    public delete(query: IDBValidKey|IDBKeyRange): Promise<void> {
        return ObjectStore.promisifyRequest<undefined>(this.data.delete(query));
    }

    public clear(): Promise<void> {
        return ObjectStore.promisifyRequest<undefined>(this.data.clear());
    }

    public count(query?: IDBValidKey|IDBKeyRange): Promise<number> {
        return ObjectStore.promisifyRequest<number>(this.data.count(query));
    }

    public get(query: IDBValidKey|IDBKeyRange): Promise<V|undefined> {
        return ObjectStore.promisifyRequest<V|undefined>(this.data.get(query));
    }

    public getAll(query?: IDBValidKey|IDBKeyRange|null, count?: number): Promise<V[]> {
        return ObjectStore.promisifyRequest<V[]>(this.data.getAll(query, count));
    }

    public getAllKeys(queryOrOptions?: IDBValidKey|IDBKeyRange|null, count?: number): Promise<IDBValidKey[]> {
        return ObjectStore.promisifyRequest<IDBValidKey[]>(this.data.getAllKeys(queryOrOptions, count));
    }

    public getKey(query: IDBValidKey|IDBKeyRange): Promise<IDBValidKey|undefined> {
        return ObjectStore.promisifyRequest<IDBValidKey|undefined>(this.data.getKey(query));
    }

    public openCursor(query?: IDBValidKey|IDBKeyRange|null, direction?: IDBCursorDirection): IDBRequest<IDBCursorWithValue|null> {
        return this.data.openCursor(query, direction);
    }

    public openKeyCursor(query?: IDBValidKey|IDBKeyRange|null, direction?: IDBCursorDirection): IDBRequest<IDBCursor|null> {
        return this.data.openKeyCursor(query, direction);
    }

    public index(name: string): IDBIndex {
        return this.data.index(name);
    }

    public createIndex(name: string, keyPath: string|Iterable<string>, options?: IDBIndexParameters): IDBIndex {
        return this.data.createIndex(name, keyPath, options);
    }

    public deleteIndex(name: string): void {
        this.data.deleteIndex(name);
    }

    public async *entries(): AsyncGenerator<[IDBValidKey, V], void, void> {
        const cursorRequest = this.data.openCursor();

        const awaitCursor = (): Promise<IDBCursorWithValue|null> => {
            return new Promise((resolve, reject) => {
                cursorRequest.onerror = () => reject(cursorRequest.error);
                cursorRequest.onsuccess = () => resolve(cursorRequest.result);
            });
        };

        let cursor = await awaitCursor();

        while (cursor) {
            yield [cursor.key, cursor.value];

            cursor.continue();
            cursor = await awaitCursor();
        }
    }

    public async entriesAsync(): Promise<[IDBValidKey, V][]> {
        const entries: [IDBValidKey, V][] = [];

        for await (const result of this.entries()) {
            entries.push(result);
        }

        return entries;
    }

    public async filter<S extends keyof V>(
        storeName: S,
        predicate: (value: V[S], key: IDBValidKey, store: S) => boolean,
        limit: number = Infinity
    ): Promise<V[S][]> {
        const results: V[S][] = [];

        for await (const [key, value] of this.entries()) {
            if (predicate(value[storeName], key, storeName)) {
                results.push(value[storeName]);
            }

            if (results.length >= limit) {
                break;
            }
        }

        return results;
    }

    public static async promisifyRequest<T>(request: IDBRequest<T>): Promise<T> {
        const { signal, abort } = new AbortController();

        const promise = new DeferredPromise<T>();

        request.addEventListener(
            'success',
            () => promise.resolve(request.result),
            { signal, once: true }
        );

        request.addEventListener(
            'error',
            () => promise.reject(request.error),
            { signal, once: true }
        );

        const result = await promise;
        abort();

        return result;
    }
}