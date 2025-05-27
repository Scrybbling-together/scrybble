import {RmDir} from "./RmDir";
import {RmFile} from "./RmFile";
import {RmFileTree} from "./RmFileTree";
import {ScrybbleFileTreeComponent} from "./ScrybbleFileTree";
import {ScrybbleSyncHistoryComponent} from "./SyncHistory";
import {NavigateToFile} from "./navigateToFile";
import {ErrorComponent} from "./ErrorComponent";
import {SyncProgressIndicator} from "./SyncNotice";
import {ScrybbleUI} from "./ScrybbleUI";
import {SupportPage} from "./SupportPage";
import {AccountPage} from "./AccountPage";

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
}
