import * as p from "pino";
import writeToLocalstorage from "./LocalStorageTransport";

export const pino = p.default({
	browser: {
		write: writeToLocalstorage
	}
})
// window.addEventListener("error", function (e) {
// 	pino.error("Uncaught error :", e)
// })
// window.addEventListener('unhandledrejection', function (e) {
// 	pino.error("Uncaught error :", e)
// })
// window.onerror = pino.error.bind(pino)
