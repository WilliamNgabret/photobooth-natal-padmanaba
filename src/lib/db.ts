export interface OfflinePhoto {
    id: string;
    dataUrl: string;
    width: number;
    height: number;
    layoutName: string;
    timestamp: number;
    synced: boolean;
    supabaseId?: string;
    retries: number;
}

const DB_NAME = 'photobooth_db';
const STORE_NAME = 'photos';
const DB_VERSION = 1;

export const db = {
    async open(): Promise<IDBDatabase> {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);

            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME, { keyPath: 'id' });
                }
            };
        });
    },

    async savePhoto(photo: OfflinePhoto): Promise<void> {
        const db = await this.open();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            const request = store.put(photo);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    },

    async getPendingPhotos(): Promise<OfflinePhoto[]> {
        const db = await this.open();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readonly');
            const store = tx.objectStore(STORE_NAME);
            const request = store.getAll();
            request.onsuccess = () => {
                const all = request.result as OfflinePhoto[];
                resolve(all.filter(p => !p.synced));
            };
            request.onerror = () => reject(request.error);
        });
    },

    async getDataUrl(id: string): Promise<string | null> {
        const db = await this.open();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readonly');
            const store = tx.objectStore(STORE_NAME);
            const request = store.get(id);
            request.onsuccess = () => {
                resolve(request.result ? request.result.dataUrl : null);
            };
            request.onerror = () => reject(request.error);
        });
    },

    async markSynced(id: string, supabaseId: string): Promise<void> {
        const db = await this.open();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            const getReq = store.get(id);

            getReq.onsuccess = () => {
                const item = getReq.result;
                if (item) {
                    item.synced = true;
                    item.supabaseId = supabaseId;
                    store.put(item);
                    resolve();
                } else {
                    // If item is missing, just resolve
                    resolve();
                }
            };
            getReq.onerror = () => reject(getReq.error);
        });
    },

    async incrementRetry(id: string): Promise<void> {
        const db = await this.open();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            const getReq = store.get(id);

            getReq.onsuccess = () => {
                const item = getReq.result;
                if (item) {
                    item.retries = (item.retries || 0) + 1;
                    store.put(item);
                    resolve();
                } else {
                    resolve();
                }
            };
            getReq.onerror = () => reject(getReq.error);
        });
    }
};
