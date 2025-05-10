import {App, Notice} from "obsidian";

/**
 * Migrations represent changes in the underlying data model, similar to how they function in databases.
 * They are typically tuples of form [test(localStorage, settings) -> effect(app)]
 * Given that there is currently only one migration, no need to set the types up formally in that manner yet.
 */
export default function migrations(app: App) {
	if (localStorage.getItem("scrybble_access_token")) {
		// localStorage.removeItem("scrybble_access_token");
		const notice = new DocumentFragment();
		const h1 = notice.createEl("h1");
		h1.innerText = "Log in to Scrybble";

		const body = notice.createEl("p");
		body.innerText = "You need to re-authenticate with Scrybble to use Scrybble sync. Visit your Scrybble settings page to do so."

		new Notice(notice, 15000);
	}
}
