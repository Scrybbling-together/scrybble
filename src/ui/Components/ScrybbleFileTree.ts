// ScrybbleFileTreeComponent.ts
import {html, LitElement, nothing} from 'lit-element';
import {property, state} from 'lit-element/decorators.js';
import {RMFileTree, ScrybbleCommon} from "../../../@types/scrybble";
import {ErrorMessage, Errors} from "../../errorHandling/Errors";
import {scrybbleContext} from "../scrybbleContext";
import {consume} from "@lit/context";
import {getIcon} from "obsidian";

export class ScrybbleFileTreeComponent extends LitElement {
	@consume({context: scrybbleContext})
	@property({type: Object, attribute: false})
	scrybble!: ScrybbleCommon;

	@state()
	private tree!: RMFileTree;

	@state()
	private cwd = "/";

	@state()
	private loading: boolean = true;

	@state()
	private error: ErrorMessage | null = null;

	async connectedCallback() {
		super.connectedCallback();
		await this.loadTree();
	}

	async refresh() {
		await this.loadTree();
		this.requestUpdate();
	}

	async handleClickFileOrFolder({detail: {path, type}}: any) {
		if (type === "f") {
			try {
				// Errors.info(`Downloading file ${obfuscateString(path, 60)}`)
				await this.scrybble.sync.requestSync(path)
			} catch (e) {
				// Errors.handle("GENERAL_ERROR", e)
			}
		} else if (type === "d") {
			this.cwd = path;
			await this.loadTree();
		}
	}

	async loadTree() {
		try {
			this.loading = true;
			this.requestUpdate();
			this.tree = await this.scrybble.api.fetchFileTree(this.cwd);
			this.error = null;
		} catch (e) {
			this.error = Errors.handle("TREE_LOADING_ERROR", e as Error);
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
