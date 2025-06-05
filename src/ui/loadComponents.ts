import {RmDir} from "./Components/RmDir";
import {RmFile} from "./Components/RmFile";
import {RmFileTree} from "./Components/RmFileTree";
import {ScrybbleFileTreeComponent} from "./Pages/ScrybbleFileTree";
import {ScrybbleSyncHistoryComponent} from "./Pages/SyncHistory";
import {NavigateToFile} from "./Components/navigateToFile";
import {ErrorComponent} from "./Components/ErrorComponent";
import {SyncProgressIndicator} from "./Components/SyncNotice";
import {ScrybbleUI} from "./Pages/ScrybbleUI";
import {SupportPage} from "./Pages/SupportPage";
import {AccountPage} from "./Pages/AccountPage";
import {ScrybbleOnboarding} from "./Pages/OnboardingPage";
import {addIcon, getIcon} from "obsidian";

export default function loadLitComponents() {
	window.customElements.define("rm-tree", RmFileTree)
	window.customElements.define('rm-file', RmFile)
	window.customElements.define('rm-dir', RmDir)
	window.customElements.define('scrybble-file-tree', ScrybbleFileTreeComponent)
	window.customElements.define('navigate-to-file-btn', NavigateToFile)
	window.customElements.define('error-view', ErrorComponent)
	window.customElements.define('sync-progress-indicator', SyncProgressIndicator)

	// pages
	window.customElements.define("scrybble-ui", ScrybbleUI)
	window.customElements.define('scrybble-sync-history', ScrybbleSyncHistoryComponent)
	window.customElements.define('scrybble-support', SupportPage)
	window.customElements.define('scrybble-account', AccountPage)
	window.customElements.define('scrybble-onboarding', ScrybbleOnboarding)

	// unsure why this one is unavailable, it should be available given Obsidian's lucide version
	if (getIcon('file-x-2') == null) {
		addIcon("file-x-2", `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-file-x2-icon lucide-file-x-2"><path d="M4 22h14a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v4"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="m8 12.5-5 5"/><path d="m3 12.5 5 5"/></svg>`);
	}
}
