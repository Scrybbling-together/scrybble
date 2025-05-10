import {getIcon, ItemView, Notice, Setting, WorkspaceLeaf} from "obsidian";
import Scrybble from "../main";
import {html, nothing, render} from "lit-html";
import {LitElement} from "lit-element";
import {RMFileTree} from "../@types/scrybble";

class RmFileTree extends LitElement {
	protected createRenderRoot(): HTMLElement | DocumentFragment {
		return this
	}

	static get properties() {
		return {
			tree: {type: Object},
			cwd: {type: String}
		}
	}


	handleClickFile({detail: {name, path}}) {
	}

	render() {
		return html`
			<div class="scrybble-filetree">
				<div class="tree-item-self">
					<div class="tree-item-inner">Current directory is ${this.tree.cwd}</div>
				</div>

				${this.tree.items.map((item) => {
					if (item.type === "d") {
						return html`
							<rm-dir .name="${item.name}" .path="${item.path}"
									}"></rm-dir>`;
					} else if (item.type === "f") {
						return html`
							<rm-file .name="${item.name}" .path="${item.path}"
									 @rm-click="${this.handleClickFile.bind(this)}"></rm-file>`;
					}
				})}
			</div>`
	}
}

customElements.define("rm-tree", RmFileTree)

class RmDir extends LitElement {
	static get properties() {
		return {
			name: {type: String},
			path: {type: String}
		}
	}

	render() {
		return html`
			<div class="tree-item" @click="${this._handleClick}" aria-label="Open folder">
				<div class="tree-item-self is-clickable">
					<span class="tree-item-icon">${getIcon('folder')}</span> ${this.name}
				</div>
			</div>`
	}

	protected createRenderRoot(): HTMLElement | DocumentFragment {
		return this
	}

	private _handleClick() {
		this.dispatchEvent(new CustomEvent('rm-click', {
			detail: {name: this.name, path: this.path, type: 'd'},
			bubbles: true,
			composed: true
		}));
	}
}

customElements.define('rm-dir', RmDir)

class RmFile extends LitElement {
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

customElements.define('rm-file', RmFile)

export const SCRYBBLE_FILETREE = "SCRYBBLE_FILETREE";

export class ScrybbleFileTree extends ItemView {
	private plugin: Scrybble;
	private tree: RMFileTree;
	private cwd = "/";
	private loading: boolean = true;
	private error: string | null = null;
	private errorHelp: string | null = null;

	constructor(leaf: WorkspaceLeaf, plugin: Scrybble) {
		super(leaf);
		this.plugin = plugin;
	}

	async handleClickFileOrFolder({detail: {name, path, type}}) {
		if (type === "f") {
			const frag = createFragment()
			render(html`<h2>Downloading reMarkable file!</h2><p>Your file <b>${name}</b> is downloading</p><p class="text-muted">You can view sync progress at <a href="https://scrybble.ink/inspect-sync">The scrybble site</a></p>`, frag);

			new Notice(frag)
		} else if (type === "d") {
			this.cwd = path
			await this.loadTree()
		}
	}

	renderTree() {
		const error = this.error ? html`<div class="pane-empty">
			<h2>There's an error loading your reMarkable files through Scrybble</h2>
			<p>${this.error}</p>
			<p>You can try refreshing in a few moments, or contact support at mail@scrybble.ink</p>
		</div>` : nothing

		const loading = this.loading ? html`<div class="pane-empty">loading...</div>` : nothing
		const tree = !this.error && !this.loading ? html`<rm-tree .tree="${this.tree}" @rm-click="${this.handleClickFileOrFolder.bind(this)}"></rm-tree>` : nothing

		render(html`
			<div class="scrybble">
				<div class="tree-item-self">
					<h1 class="tree-item-inner">Scrybble reMarkable sync</h1>
				</div>
				${error}
				${loading}
				${tree}
			</div>
		`, this.contentEl);
	}

	async onload() {
		if (!this.plugin.access_token) {
			this.error = "Not logged in to Scrybble";
			this.errorHelp = "Please make sure to log-in first. Go to settings -> community plugins -> Scrybble and log in to your Scrybble account."
		}
		const state = await this.plugin.fetchOnboardingState();
		if (state !== "ready") {
			this.error = "Not set-up yet, please set-up on the website";
			this.errorHelp = "Go to https://scrybble.ink, log in and visit the dashboard to finish setting up."
		}

		await this.loadTree()
	}

	async loadTree() {
		try {
			this.loading = true
			this.tree = await this.plugin.fetchFileTree(this.cwd)
			this.loading = false
		} catch (e) {
			this.error = "There's a problem loading your files."
			this.errorHelp = "Please try refreshing in a minute or so, otherwise you can contact mail@scrybble.ink for support"
		}
		this.renderTree();
	}

	onUnload() {

	}

	getDisplayText(): string {
		return "Scrybble";
	}

	getViewType(): string {
		return SCRYBBLE_FILETREE;
	}

	getIcon() {
		return "pencil-line";
	}
}


