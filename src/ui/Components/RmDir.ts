import { LitElement, html, TemplateResult } from "lit-element";
import { property } from "lit-element/decorators.js";
import { getIcon } from "obsidian";
import {RMTreeItem} from "../../../@types/scrybble";

export class RmDir extends LitElement {
	@property({type: Object})
	directory!: RMTreeItem


	render(): TemplateResult {
		return html` <div class="tree-item" @click="${this._handleClick}" aria-label="Open folder">
				<div class="tree-item-self is-clickable">
					<span class="tree-item-icon">${getIcon('folder')}</span> ${this.directory.name}
				</div>
			</div>
		`;
	}

	protected createRenderRoot(): HTMLElement | DocumentFragment {
		return this;
	}

	private _handleClick(): void {
		this.dispatchEvent(new CustomEvent('rm-click', {
			detail: { name: this.directory.name, path: this.directory.path, type: 'd' },
			bubbles: true,
			composed: true
		}));
	}
}
