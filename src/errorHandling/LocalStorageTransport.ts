interface LocalStorageTransportOptions {
	key: string;
	maxEntries: number;
}
const storageKey = 'scrybble-logs';
const maxEntries = 5000;

export function retrieveScrybbleLogs() {
	return localStorage.getItem(storageKey);
}

export default function writeToLocalstorage(obj: any) {
	console.log(obj)
	try {
		// Get existing logs
		const existingLogs = JSON.parse(localStorage.getItem(storageKey) || '[]');

		// Add new log entry with timestamp
		const logEntry = {
			level: obj.level,
			msg: obj.msg,
			...obj,
			timestamp: new Date().toISOString(),
		};

		existingLogs.push(logEntry);

		// Implement rotation: keep only the most recent maxEntries
		if (existingLogs.length > maxEntries) {
			existingLogs.splice(0, existingLogs.length - maxEntries);
		}

		// Save back to localStorage
		localStorage.setItem(storageKey, JSON.stringify(existingLogs));
	} catch (error) {
		// If localStorage fails, try to at least log to console
		console.error('Failed to write to localStorage transport:', error);
		console.log('Original log:', obj);
	}
}
