# @catplvsplus/idb

A simple type-safe & promise-based abstracted wrapper for IndexedDB.

## Installation

```bash
npm install @catplvsplus/idb
```

## Usage

```typescript
import { IndexedDB } from '@catplvsplus/idb';

const db = await IndexedDB.open({
    name: 'my-database',
    version: 1,
    stores: [
        {
            name: 'my-store',
            keyPath: 'id'
        }
    ]
});

await db.put('my-store', { id: 1, name: 'John Doe' });  // Add a record to the object store
await db.get('my-store', 1);                            // Retrieve the record with id 1
await db.count('my-store');                             // Count the number of records in the object store
await db.delete('my-store', 1);                         // Delete the record with id 1
await db.clear('my-store');                             // Clear all records in the object store

const transaction = db.transaction({                    // Start a transaction
    storeNames: 'my-store',
    mode: 'readwrite'
});

const store = transaction.objectStore('my-store');       // Get the object store from the transaction
await store.add({ id: 2, name: 'Jane Doe' });            // Add a record to the object store within the transaction
await store.get(2);                                      // Retrieve the record with id 2 within the transaction

await db.deleteDatabase();                               // Delete the database
await db.close();                                        // Close the database
```