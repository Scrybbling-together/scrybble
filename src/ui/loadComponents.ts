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

export default function loadLitComponents() {
	if (!window.customElements.get("rm-tree")) {
		window.customElements.define("rm-tree", RmFileTree)
	}
	if (!window.customElements.get("rm-file")) {
		window.customElements.define('rm-file', RmFile)
	}
	if (!window.customElements.get("rm-dir")) {
		window.customElements.define('rm-dir', RmDir)
	}
	if (!window.customElements.get("scrybble-file-tree")) {
		window.customElements.define('scrybble-file-tree', ScrybbleFileTreeComponent)
	}
	if (!window.customElements.get("error-view")) {
		window.customElements.define('error-view', ErrorComponent)
	}
	if (!window.customElements.get("sync-progress-indicator")) {
		window.customElements.define('sync-progress-indicator', SyncProgressIndicator)
	}

	// pages
	if (!window.customElements.get("scrybble-ui")) {
		window.customElements.define("scrybble-ui", ScrybbleUI)
	}
	if (!window.customElements.get("scrybble-support")) {
		window.customElements.define('scrybble-support', SupportPage)
	}
	if (!window.customElements.get("scrybble-account")) {
		window.customElements.define('scrybble-account', AccountPage)
	}
	if (!window.customElements.get("scrybble-onboarding")) {
		window.customElements.define('scrybble-onboarding', ScrybbleOnboarding)
	}

	// unsure why this icon is unavailable, it should be available given Obsidian's lucide version
	if (getIcon('file-x-2') == null) {
		addIcon("file-x-2", `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-file-x2-icon lucide-file-x-2"><path d="M4 22h14a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v4"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="m8 12.5-5 5"/><path d="m3 12.5 5 5"/></svg>`);
	}
}
