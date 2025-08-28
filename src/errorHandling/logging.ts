import * as p from "pino";

const storageKey = 'scrybble-logs';
const maxEntries = 200;

export function retrieveScrybbleLogs() {
	return JSON.parse(localStorage.getItem(storageKey) ?? "[]");
}

function writeToLocalstorage(obj: Record<string, any>) {
	delete obj["hostname"];
	delete obj["pid"];
	delete obj["time"];

	try {
		// Get existing logs
		const existingLogs: Record<string, any>[] = JSON.parse(localStorage.getItem(storageKey) || '[]');

		// Add new log entry with timestamp
		const logEntry = {
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
export const pino = p.default({
	browser: {
		write: writeToLocalstorage,
		serialize: true,
	},
})
// window.addEventListener("error", function (e) {
// 	pino.error("Uncaught error :", e)
// })
// window.addEventListener('unhandledrejection', function (e) {
// 	pino.error("Uncaught error :", e)
// })
// window.onerror = pino.error.bind(pino)
