import {LitElement} from "lit-element";
import {html} from "lit-html";
import {property} from "lit-element/decorators.js";
import {RMFileTree} from "../../../@types/scrybble";

export class RmFileTree extends LitElement {
	@property({type: Object})
	tree!: RMFileTree;

	@property({type: String})
	cwd!: string;

	protected createRenderRoot(): HTMLElement | DocumentFragment {
		return this
	}

	render() {
		return html`<div class="scrybble-filetree">
				<div class="tree-item-self">
					<div class="tree-item-inner text-normal">Current directory is <b>${this.tree.cwd}</b></div>
				</div>

				${this.tree.items.map((item) => {
					if (item.type === "d") {
						return html`
							<rm-dir .name="${item.name}" .path="${item.path}"></rm-dir>`;
					} else if (item.type === "f") {
						return html`
							<rm-file .name="${item.name}" .path="${item.path}"></rm-file>`;
					}
				})}
			</div>`
	}
}

