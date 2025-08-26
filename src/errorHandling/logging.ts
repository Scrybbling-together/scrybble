import pino from 'pino';
import {LocalStorageStream} from "./LocalStorageTransport";

const stream = new LocalStorageStream();

export const logger = pino({
	level: 'info'
}, stream)
