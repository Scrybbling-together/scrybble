import * as p from "pino";
import writeToLocalstorage from "./LocalStorageTransport";

export const pino = p.default({
	browser: {
		write: writeToLocalstorage,
		formatters: {
			// bindings: () => {
			// 	return {};
			// },
			level: (label) => {
				return {level: label.toUpperCase()};
			},

		},
	},
})
window.addEventListener("error", function (e) {
	pino.error("Uncaught error :", e)
})
window.addEventListener('unhandledrejection', function (e) {
	pino.error("Uncaught error :", e)
})
window.onerror = pino.error.bind(pino)
