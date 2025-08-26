import {Writable} from "stream";

const storageKey = 'scrybble-logs';
const maxEntries = 200;

export function retrieveScrybbleLogs() {
	return JSON.parse(localStorage.getItem(storageKey) ?? "[]");
}

export default function writeToLocalstorage(obj: Record<string, any>, ...rest) {
	delete obj["hostname"];
	delete obj["pid"];
	delete obj["time"];

	try {
		const existingLogs: Record<string, any>[] = JSON.parse(localStorage.getItem(storageKey) || '[]');

		const logEntry = {
			...obj,
			timestamp: new Date().toISOString(),
		};

		existingLogs.push(logEntry);

		if (existingLogs.length > maxEntries) {
			existingLogs.splice(0, existingLogs.length - maxEntries);
		}

		localStorage.setItem(storageKey, JSON.stringify(existingLogs));
	} catch (error) {
		console.error('Failed to write to localStorage transport:', error);
		console.log('Original log:', obj);
	}
}

export class LocalStorageStream extends Writable {
	constructor() {
		super({objectMode: true});
	}

	_write(chunk: any, encoding: string, callback: (error?: Error | null) => void) {
		try {
			const logObj = typeof chunk === 'string' ? JSON.parse(chunk) : chunk;
			writeToLocalstorage(logObj);
			callback();
		} catch (error) {
			callback(error as Error);
		}
	}
}
