import {html, TemplateResult} from "lit-html";
import {pino} from "./logging";

export interface ResponseError extends Error {
	status: number;
	message: string;
}

/**
 * @property title Say what happened
 * @property message Provide reassurance, say why it happened and give a suggestion to fix it.
 * @property helpAction Give a concrete way to reach step_definitions or report the error; give them a way out
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
	"FILE_DOWNLOAD_ERROR": (e?: Error | ResponseError) => ({
		title: html`Unable to download the file`,
		message: html`..`,
		helpAction: html`...`
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

	"AUTHENTICATION_CHECK_ERROR": (e?: Error | ResponseError) => ({
		title: html`Authentication check failed`,
		message: html`We couldn't verify your login status${formatError(e)}`,
		helpAction: html`Please check your internet connection and try again. If the problem persists, contact mail@scrybble.ink for support`,
		details: e
	}),

	"OAUTH_INITIATION_ERROR": (e?: Error | ResponseError) => ({
		title: html`Login failed to start`,
		message: html`We couldn't start the login process${formatError(e)}`,
		helpAction: html`Please check your internet connection and try again. If the problem persists, contact mail@scrybble.ink for support`,
		details: e
	}),

	"OAUTH_COMPLETION_ERROR": (e?: Error | ResponseError) => ({
		title: html`Login completion failed`,
		message: html`Login was successful but we couldn't fetch your account information${formatError(e)}`,
		helpAction: html`Please try refreshing the page. If the problem persists, contact mail@scrybble.ink for support`,
		details: e
	}),

	"USER_INFO_FETCH_ERROR": (e?: Error | ResponseError) => ({
		title: html`Account information unavailable`,
		message: html`We couldn't load your account information${formatError(e)}`,
		helpAction: html`Please try refreshing the page or logging out and back in. If the problem persists, contact mail@scrybble.ink for support`,
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

export class Errors {
	public static handle(error_name: keyof typeof errors, e?: Error) {
		pino.error(`Scrybble ${error_name} occurred.`)
		pino.error(e)
		if (e && "message" in e && e.message.includes("ERR_CONNECTION_REFUSED")) {
			return errors["SERVER_CONNECTION_ERROR"](e)
		}
		return errors[error_name](e)
	}
}
