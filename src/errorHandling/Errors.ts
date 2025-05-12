import {html, TemplateResult} from "lit-html";

interface ResponseError extends Error {
	status: number;
	message: string;
}

/**
 * @property title Say what happened
 * @property message Provide reassurance, say why it happened and give a suggestion to fix it.
 * @property helpAction Give a concrete way to reach support or report the error; give them a way out
 * @property details Internal property for logging purposes, not relevant for end-users
 */
export type ErrorMessage = {
	title: TemplateResult;
	message: TemplateResult;
	helpAction: TemplateResult;
	details?: Error;
}

type ErrorHandler = (e: Error | ResponseError |  undefined) => ErrorMessage

function formatError(e?: Error | ResponseError): TemplateResult {
	if (e && 'status' in e && e.status) {
		return html`: response status - ${e.status}`;
	}

	return html``;
}
const errors = {
	"NOT_LOGGED_IN": (e?: Error | ResponseError) => ({
		title: html`Not logged in`,
		message: html`You are not logged in to Scrybble`,
		helpAction: html`Please make sure to log-in first. Go to settings -> community plugins -> Scrybble and log in to your Scrybble account.`
	}),

	"NOT_SETUP": (e?: Error | ResponseError) => ({
		title: html`Setup incomplete`,
		message: html`Your Scrybble account is not fully set up yet`,
		helpAction: html`Go to https://scrybble.ink, log in and visit the dashboard to finish setting up.`
	}),

	"TREE_LOADING_ERROR": (e?: Error | ResponseError) => ({
		title: html`File loading error`,
		message: html`There's a problem loading your files${formatError(e)}`,
		helpAction: html`Please try refreshing in a minute or so, otherwise you can contact mail@scrybble.ink for support`,
		details: e
	}),

	"SYNC_HISTORY_ERROR": (e?: Error | ResponseError) => ({
		title: html`Sync history error`,
		message: html`There was a problem loading your sync history${formatError(e)}`,
		helpAction: html`Please try refreshing in a minute or so, or check your connection to the Scrybble servers`,
		details: e
	}),

	"GENERAL_ERROR": (e?: Error | ResponseError) => ({
		title: html`Something went wrong`,
		message: html`An unexpected error occurred${formatError(e)}`,
		helpAction: html`Please try again or contact mail@scrybble.ink for support`,
		details: e
	}),

	"SERVER_CONNECTION_ERROR": (e?: Error | ResponseError) => ({
		title: html`Connection error`,
		message: html`Could not connect to the Scrybble servers${formatError(e)}`,
		helpAction: html`Please send an e-mail to mail@scrybble.ink`,
		details: e
	})
} satisfies Record<string, ErrorHandler>;

export class ScrybbleLogger {
	public static handleError(error_name: keyof typeof errors, e?: Error) {
		console.log(`Scrybble ${error_name} occurred.`)
		console.dir(e)
		if ("message" in e && e.message.includes("ERR_CONNECTION_REFUSED")) {
			return errors["SERVER_CONNECTION_ERROR"](e)
		}
		return errors[error_name](e)
	}

	public static info(message: string) {
		console.log(`Scrybble info: ${message}`)
	}
}
