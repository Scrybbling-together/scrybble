import { LitElement, html, TemplateResult } from "lit-element";
import { property } from "lit-element/decorators.js";
import { getIcon } from "obsidian";

export class RmDir extends LitElement {
	@property({ type: String })
	name!: string;

	@property({ type: String })
	path!: string;

	render(): TemplateResult {
		return html`
			<div class="tree-item" @click="${this._handleClick}" aria-label="Open folder">
				<div class="tree-item-self is-clickable">
					<span class="tree-item-icon">${getIcon('folder')}</span> ${this.name}
				</div>
			</div>
		`;
	}

	protected createRenderRoot(): HTMLElement | DocumentFragment {
		return this;
	}

	private _handleClick(): void {
		this.dispatchEvent(new CustomEvent('rm-click', {
			detail: { name: this.name, path: this.path, type: 'd' },
			bubbles: true,
			composed: true
		}));
	}
}
