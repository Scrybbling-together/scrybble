import {RmDir} from "./RmDir";
import {RmFile} from "./RmFile";
import {RmFileTree} from "./RmFileTree";
import {ScrybbleFileTreeComponent} from "./ScrybbleFileTree";
import {ScrybbleSyncHistoryComponent} from "./SyncHistory";
import {NavigateToFile} from "./navigateToFile";
import {ErrorComponent} from "./ErrorComponent";

export default function loadLitComponents() {
	customElements.define("rm-tree", RmFileTree)
	customElements.define('rm-file', RmFile)
	customElements.define('rm-dir', RmDir)
	customElements.define('scrybble-file-tree', ScrybbleFileTreeComponent)
	customElements.define('scrybble-sync-history', ScrybbleSyncHistoryComponent)
	customElements.define('navigate-to-file-btn', NavigateToFile)
	customElements.define('error-view', ErrorComponent)
}
