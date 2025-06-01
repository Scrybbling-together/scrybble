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
}
