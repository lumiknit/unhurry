class SimpleTransaction<T> {
	tx: IDBTransaction;
	store: IDBObjectStore;

	constructor(tx: IDBTransaction, store: string) {
		this.tx = tx;
		this.store = tx.objectStore(store);
	}

	get(key: IDBValidKey | IDBKeyRange): Promise<T> {
		return new Promise((resolve, reject) => {
			const req = this.store.get(key);
			req.onsuccess = () => {
				resolve(req.result);
			};
			req.onerror = () => {
				reject(req.error);
			};
		});
	}

	put(obj: T, key?: IDBValidKey): Promise<void> {
		return new Promise((resolve, reject) => {
			const req = this.store.put(obj, key);
			req.onsuccess = () => {
				resolve();
			};
			req.onerror = () => {
				reject(req.error);
			};
		});
	}

	delete(key: IDBValidKey | IDBKeyRange): Promise<void> {
		return new Promise((resolve, reject) => {
			const req = this.store.delete(key);
			req.onsuccess = () => {
				resolve();
			};
			req.onerror = () => {
				reject(req.error);
			};
		});
	}

	clear(): Promise<void> {
		return new Promise((resolve, reject) => {
			const req = this.store.clear();
			req.onsuccess = () => {
				resolve();
			};
			req.onerror = () => {
				reject(req.error);
			};
		});
	}

	getAll(
		query?: IDBValidKey | IDBKeyRange | null,
		count?: number
	): Promise<T[]> {
		return new Promise((resolve, reject) => {
			const req = this.store.getAll(query, count);
			req.onsuccess = () => {
				resolve(req.result);
			};
			req.onerror = () => {
				reject(req.error);
			};
		});
	}
}

type UpgradeCallback = (db: IDBDatabase) => void;

/**
 * Simple promise-based IndexedDB client.
 * It only support a single DB with a single store.
 *
 * Every object in the store must have a field named '_id', which is the primary key.
 */
export class SimpleIDB {
	name: string;
	store: string;
	version: number;

	upgradeCallback?: UpgradeCallback;

	db: IDBDatabase | null = null;

	constructor(name: string, store: string, version: number = 1) {
		this.name = name;
		this.store = store;
		this.version = version;
	}

	setUpgradeCallback(callback: UpgradeCallback) {
		this.upgradeCallback = callback;
	}

	/**
	 * Open the database.
	 */
	open(): Promise<void> {
		return new Promise((resolve, reject) => {
			const req = indexedDB.open(this.name);
			req.onupgradeneeded = () => {
				const db = req.result;
				if (!db.objectStoreNames.contains(this.store)) {
					db.createObjectStore(this.store, {
						keyPath: '_id',
						autoIncrement: true,
					});
					//store.createIndex('_id', '_id', { unique: true });
					if (this.upgradeCallback) {
						this.upgradeCallback(db);
					}
				}
			};
			req.onsuccess = () => {
				this.db = req.result;
				resolve();
			};
			req.onerror = () => {
				reject(req.error);
			};
		});
	}

	async transaction<T>(
		mode: IDBTransactionMode = 'readonly',
		options?: IDBTransactionOptions
	): Promise<SimpleTransaction<T>> {
		if (!this.db) {
			await this.open();
		}
		return new SimpleTransaction<T>(
			this.db!.transaction(this.store, mode, options),
			this.store
		);
	}
}
