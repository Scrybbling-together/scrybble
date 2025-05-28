import pino from "pino";
import LogEvent = pino.LogEvent;
import WriteFn = pino.WriteFn;

interface LocalStorageTransportOptions {
	key: string;
	maxEntries: number;
}
const storageKey = 'scrybble-logs';
const maxEntries = 200;

export function retrieveScrybbleLogs() {
	return JSON.parse(localStorage.getItem(storageKey) ?? "[]");
}

export default function writeToLocalstorage(obj: Record<string, any>) {
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

		console.log(logEntry);

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
