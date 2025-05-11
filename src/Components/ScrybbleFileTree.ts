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
			<div class="pane-empty">
				<h2 style="color: var(--text-muted)">${this.error.title}</h2>
				<p style="color: var(--text-muted)">${this.error.message}</p>
				<p style="color: var(--text-warning)">${this.error.helpAction}</p>
			</div>` : nothing;

		const loading = html`<div style="display: flex; margin-bottom: var(--size-4-4)">
				<button ?disabled="${this.loading}" @click="${this.refresh}" class="clickable-icon">
					<span class="tree-item-icon">${getIcon('refresh-ccw')}</span>&nbsp; ${this.loading? "Loading..." : "Refresh"}
				</button>
			</div>`;

		const tree = !this.error && this.tree ? html`
			<rm-tree .tree="${this.tree}" @rm-click="${this.handleClickFileOrFolder.bind(this)}"></rm-tree>` : nothing;

		return html`
			<div>
				${loading}
				${error}
				${tree}
			</div>
		`;
	}

	protected createRenderRoot(): HTMLElement | DocumentFragment {
		return this
	}
}
