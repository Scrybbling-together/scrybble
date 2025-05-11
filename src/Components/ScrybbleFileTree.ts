// ScrybbleFileTreeComponent.ts
import {css, html, LitElement, nothing} from 'lit-element';
import {property, state} from 'lit-element/decorators.js';
import {getIcon, Notice} from "obsidian";
import {render} from "lit-html";
import Scrybble from "../../main";
import {RMFileTree} from "../../@types/scrybble";
import {ErrorMessage, ScrybbleLogger} from "../errorHandling/Errors";
import {obfuscateString} from "../support";

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
			render(html`<h2>Downloading reMarkable file!</h2><p>Your file <b>${name}</b> is syncing and will be available in your vault soon.</p>`, frag);
			try {
				ScrybbleLogger.info(`Downloading file ${obfuscateString(path, 60)}`)
				await this.plugin.downloadFile(path)
			} catch (e) {
				ScrybbleLogger.handleError("GENERAL_ERROR", e)
			}
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
			this.error = ScrybbleLogger.handleError("TREE_LOADING_ERROR", e);
		} finally {
			this.loading = false;
			this.requestUpdate();
		}
	}

	render() {
		const error = this.error ? html`
			<div class="scrybble-error">
				<h3>${this.error.title}</h3>
				<p>${this.error.message}</p>
				<p>${this.error.helpAction}</p>
			</div>` : nothing;

		const heading = html`
			<div class="scrybble-header">
				<h3>reMarkable file tree</h3>
				<button
					?disabled="${this.loading}"
					@click="${this.refresh.bind(this)}"
					class="mod-cta scrybble-refresh-button"
				>
					<span class="tree-item-icon scrybble-icon">${getIcon('refresh-ccw')}</span>
					${this.loading ? "Loading..." : "Refresh"}
				</button>
			</div>`;

		const tree = !this.error && this.tree ? html`
			<rm-tree .tree="${this.tree}" @rm-click="${this.handleClickFileOrFolder.bind(this)}"></rm-tree>` : nothing;

		return html`
			<div class="scrybble-container">
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
