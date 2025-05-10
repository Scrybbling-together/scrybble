import {LitElement} from "lit-element";
import {html} from "lit-html";
import {getIcon} from "obsidian";

export class RmFile extends LitElement {
	static get properties() {
		return {
			name: {type: String},
			path: {type: String}
		}
	}

	render() {
		return html`
			<div class="tree-item" @click="${this._handleClick}" aria-label="Download file to your vault">
				<div class="tree-item-self is-clickable">
					<span class="tree-item-icon">${getIcon('file')}</span> ${this.name}
				</div>
			</div>`
	}

	protected createRenderRoot(): HTMLElement | DocumentFragment {
		return this
	}

	private _handleClick() {
		this.dispatchEvent(new CustomEvent('rm-click', {
			detail: {name: this.name, path: this.path, type: 'f'},
			bubbles: true,
			composed: true
		}));
	}
}

