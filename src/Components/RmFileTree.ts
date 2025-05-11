import {LitElement} from "lit-element";
import {html} from "lit-html";

export class RmFileTree extends LitElement {
	protected createRenderRoot(): HTMLElement | DocumentFragment {
		return this
	}

	static get properties() {
		return {
			tree: {type: Object},
			cwd: {type: String}
		}
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

