/** Reset all data */
export const resetAllData = async () => {
	localStorage.clear();
	sessionStorage.clear();

	// Clear all indexedDB
	if (window.indexedDB) {
		const dbs = await indexedDB.databases();
		for (const db of dbs) {
			indexedDB.deleteDatabase(db.name!);
		}
	}
};
