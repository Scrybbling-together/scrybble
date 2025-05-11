import {html, TemplateResult} from "lit-html";

interface ResponseError extends Error {
	status: number;
	message: string;
}

export type ErrorMessage = {
	title: TemplateResult;
	message: TemplateResult;
	helpAction: TemplateResult;
	details?: Error;
}

type ErrorHandler = (e: Error | ResponseError |  undefined) => ErrorMessage

function formatError(e?: Error | ResponseError): TemplateResult {
	if (e && 'status' in e && e.status) {
		return html`response status - ${e.status}`;
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

	"SERVER_CONNECTION_ERROR": (e?: Error | ResponseError) => ({
		title: html`Connection error`,
		message: html`Could not connect to the Scrybble servers${formatError(e)}`,
		helpAction: html`Please send an e-mail to mail@scrybble.ink`,
		details: e
	})
} satisfies Record<string, ErrorHandler>;

export class ScrybbleErrorHandler {
	public static handleError(error_name: keyof typeof errors, e?: Error) {
		console.log(`Scrybble ${error_name} occurred.`)
		console.dir(e)
		return errors[error_name](e)
	}
}
