import {RmDir} from "./RmDir";
import {RmFile} from "./RmFile";
import {RmFileTree} from "./RmFileTree";

export default function loadLitComponents() {
	customElements.define("rm-tree", RmFileTree)
	customElements.define('rm-file', RmFile)
	customElements.define('rm-dir', RmDir)
}
