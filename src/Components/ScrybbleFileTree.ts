// ScrybbleFileTreeComponent.ts
import {css, html, LitElement, nothing} from 'lit-element';
import {property, state} from 'lit-element/decorators.js';
import {getIcon, Notice} from "obsidian";
import {render} from "lit-html";
import Scrybble from "../../main";
import {RMFileTree} from "../../@types/scrybble";
import {ErrorMessage, ScrybbleErrorHandler} from "../errorHandling/Errors";

export class ScrybbleFileTreeComponent extends LitElement {
	static styles = css`
		:host {
			display: block;
			width: 100%;
		}
	`;
	@property({type: Object})
	plugin: Scrybble;

	@state()
	private tree: RMFileTree;

	@state()
	private cwd = "/";

	@state()
	private loading: boolean = true;

	@state()
	private error: ErrorMessage | null = null;

	constructor(plugin: Scrybble) {
		super();
		this.plugin = plugin;
	}

	async connectedCallback() {
		super.connectedCallback();
		await this.loadTree();
	}

	async refresh() {
		await this.loadTree();
		this.requestUpdate();
	}

	async handleClickFileOrFolder({detail: {name, path, type}}) {
		if (type === "f") {
			const frag = createFragment();
			render(html`<h2>Downloading reMarkable file!</h2>
			<p>Your file <b>${name}</b> is downloading</p>
			<p class="text-muted">You can view sync progress at
				<a href="https://scrybble.ink/inspect-sync">The scrybble site</a></p>`, frag);
			new Notice(frag);
		} else if (type === "d") {
			this.cwd = path;
			await this.loadTree();
		}
	}

	async loadTree() {
		try {
			this.loading = true;
			this.requestUpdate();
			this.tree = await this.plugin.fetchFileTree(this.cwd);
			this.error = null;
		} catch (e) {
			this.error = ScrybbleErrorHandler.handleError("TREE_LOADING_ERROR", e);
		} finally {
			this.loading = false;
			this.requestUpdate();
		}
	}

	render() {
		const error = this.error ? html`
			<div class="scrybble-error" style="
         padding: var(--size-4-4);
         background-color: var(--background-modifier-error-rgb, rgba(224, 49, 71, 0.05));
         border-radius: var(--radius-m);
         margin-bottom: var(--size-4-4);
      ">
				<h3 style="color: var(--text-error); margin: 0 0 var(--size-4-2);">${this.error.title}</h3>
				<p style="color: var(--text-muted); margin: 0 0 var(--size-4-2);">${this.error.message}</p>
				<p style="color: var(--text-accent); margin: 0;">${this.error.helpAction}</p>
			</div>` : nothing;

		const heading = html`
			<div style="
         display: flex; 
         justify-content: space-between;
         align-items: center;
         margin-bottom: var(--size-4-4);
         border-bottom: 1px solid var(--background-modifier-border);
         padding-bottom: var(--size-4-2);
      ">
				<h3 style="margin: 0; font-weight: var(--font-semibold);">reMarkable file tree</h3>
				<button
					?disabled="${this.loading}"
					@click="${this.refresh.bind(this)}"
					class="mod-cta"
					style="display: flex; align-items: center; gap: var(--size-4-1);"
				>
					<span class="tree-item-icon" style="height: 16px; width: 16px;">${getIcon('refresh-ccw')}</span>
					${this.loading ? "Loading..." : "Refresh"}
				</button>
			</div>`;

		const tree = !this.error && this.tree ? html`
			<rm-tree .tree="${this.tree}" @rm-click="${this.handleClickFileOrFolder.bind(this)}"></rm-tree>` : nothing;

		return html`
			<div style="padding: var(--size-4-4); height: 100%; display: flex; flex-direction: column;">
				${heading}
				${error}
				${tree}
			</div>
		`;
	}

	protected createRenderRoot(): HTMLElement | DocumentFragment {
		return this
	}
}
