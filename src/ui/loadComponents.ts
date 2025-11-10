import {RmDir} from "./Components/RmDir";
import {RmFile} from "./Components/RmFile";
import {RmFileTree} from "./Components/RmFileTree";
import {ScrybbleFileTreeComponent} from "./Pages/ScrybbleFileTree";
import {ErrorComponent} from "./Components/ErrorComponent";
import {SyncProgressIndicator} from "./Components/SyncNotice";
import {ScrybbleUI} from "./Pages/ScrybbleUI";
import {SupportPage} from "./Pages/SupportPage";
import {AccountPage} from "./Pages/AccountPage";
import {ScrybbleOnboarding} from "./Pages/OnboardingPage";
import {addIcon, getIcon} from "obsidian";
import {Errors} from "../errorHandling/Errors";

export default function loadLitComponents() {
	try {
		if (!window.customElements.get("sc-rm-tree")) {
			window.customElements.define("sc-rm-tree", RmFileTree)
		}
		if (!window.customElements.get("sc-rm-file")) {
			window.customElements.define('sc-rm-file', RmFile)
		}
		if (!window.customElements.get("sc-rm-dir")) {
			window.customElements.define('sc-rm-dir', RmDir)
		}
		if (!window.customElements.get("sc-file-tree")) {
			window.customElements.define('sc-file-tree', ScrybbleFileTreeComponent)
		}
		if (!window.customElements.get("sc-error-view")) {
			window.customElements.define('sc-error-view', ErrorComponent)
		}
		if (!window.customElements.get("sc-sync-progress-indicator")) {
			window.customElements.define('sc-sync-progress-indicator', SyncProgressIndicator)
		}

		// pages
		if (!window.customElements.get("sc-ui")) {
			window.customElements.define("sc-ui", ScrybbleUI)
		}
		if (!window.customElements.get("sc-support")) {
			window.customElements.define('sc-support', SupportPage)
		}
		if (!window.customElements.get("sc-account")) {
			window.customElements.define('sc-account', AccountPage)
		}
		if (!window.customElements.get("sc-onboarding")) {
			window.customElements.define('sc-onboarding', ScrybbleOnboarding)
		}
	} catch (e) {
		Errors.handle("COMPONENT_REGISTRATION_ERROR", e as Error)
	}

	try {
		// unsure why this icon is unavailable, it should be available given Obsidian's lucide version
		if (getIcon('file-x-2') == null) {
			addIcon("file-x-2", `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-file-x2-icon lucide-file-x-2"><path d="M4 22h14a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v4"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="m8 12.5-5 5"/><path d="m3 12.5 5 5"/></svg>`);
		}
	} catch (e) {
		Errors.handle("ICON_REGISTRATION_ERROR", e as Error)
	}
}
