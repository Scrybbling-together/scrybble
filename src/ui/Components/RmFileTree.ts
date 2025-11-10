import {LitElement} from "lit-element";
import {html} from "lit-html";
import {property} from "lit-element/decorators.js";
import {RMFileTree, ScrybbleCommon} from "../../../@types/scrybble";
import {consume} from "@lit/context";
import {scrybbleContext} from "../scrybbleContext";

export class RmFileTree extends LitElement {
	@consume({context: scrybbleContext})
	@property({type: Object, attribute: false})
	scrybble!: ScrybbleCommon;

	@property({type: Object})
	tree!: RMFileTree;

	@property({type: String})
	cwd!: string;

	render() {
		return html`
			<div class="scrybble-filetree">
				<div class="tree-item-self">
					<div class="tree-item-inner text-normal">Current directory is <b>${this.tree.cwd}</b></div>
				</div>

				<div class="files">
					${this.tree.items.map((fileOrDirectory) => {
						if (fileOrDirectory.type === "d") {
							return html`<sc-rm-dir .directory="${fileOrDirectory}" />`;
						} else if (fileOrDirectory.type === "f") {
							return html` <sc-rm-file .file="${fileOrDirectory}" />`;
						}
					})}
				</div>
			</div>`
	}

	protected createRenderRoot(): HTMLElement | DocumentFragment {
		return this
	}
}

