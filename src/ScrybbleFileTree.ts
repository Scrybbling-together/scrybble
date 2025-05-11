import {getIcon, ItemView, Notice, requestUrl, WorkspaceLeaf} from "obsidian";
import Scrybble from "../main";
import {html, nothing, render} from "lit-html";
import {RMFileTree} from "../@types/scrybble";
import {ErrorMessage, ScrybbleErrorHandler} from "./errorHandling/Errors";

export const SCRYBBLE_FILETREE = "SCRYBBLE_FILETREE";

export class ScrybbleFileTree extends ItemView {
	navigation = true
	private plugin: Scrybble;
	private tree: RMFileTree;
	private cwd = "/";
	private loading: boolean = true;
	private error: ErrorMessage | null;

	constructor(leaf: WorkspaceLeaf, plugin: Scrybble) {
		super(leaf);
		this.plugin = plugin;
	}

	async refresh() {
		await this.loadTree()
		await this.renderTree()
	}

	async handleClickFileOrFolder({detail: {name, path, type}}) {
		if (type === "f") {
			const frag = createFragment()
			render(html`<h2>Downloading reMarkable file!</h2><p>Your file <b>${name}</b> is downloading</p><p
				class="text-muted">You can view sync progress at <a href="https://scrybble.ink/inspect-sync">The
				scrybble site</a></p>`, frag);

			new Notice(frag)
		} else if (type === "d") {
			this.cwd = path
			await this.loadTree()
			await this.renderTree()
		}
	}

	renderTree() {
		this.contentEl.style.display = "flex"
		this.contentEl.style.flexDirection = "column"

		const error = this.error ? html`
			<div class="pane-empty">
				<h2 style="color: var(--text-muted)">${this.error.title}</h2>
				<p style="color: var(--text-muted)">${this.error.message}</p>
				<p style="color: var(--text-warning)">${this.error.helpAction}</p>
			</div>` : nothing

		const loading = this.loading ? html`
			<div class="pane-empty">loading...</div>` : nothing
		const tree = !this.error && this.tree ? html`
			<rm-tree .tree="${this.tree}" @rm-click="${this.handleClickFileOrFolder.bind(this)}"></rm-tree>` : nothing

		render(html`
			<div class="nav-header">
				<div class="nav-buttons-container">
					<div class="clickable-icon nav-action-button" aria-label="refresh"
						 @click="${this.refresh.bind(this)}">
						<span>${getIcon("refresh-cw")}</span>
					</div>
				</div>
			</div>
			<div
				style="position: relative; overflow-y: auto; flex: 1 0 0; padding-inline-start: var(--size-4-3); padding-inline-end: var(--size-4-3)">
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
			this.error = ScrybbleErrorHandler.handleError("NOT_LOGGED_IN")
			this.loading = false
			this.renderTree()
			return
		}

		try {
			const state = await this.plugin.fetchOnboardingState()
			if (state !== "ready") {
				this.error = ScrybbleErrorHandler.handleError("NOT_SETUP")
				this.loading = false
				this.renderTree()
				return
			}

			await this.loadTree()
		} catch (e) {
			this.error = ScrybbleErrorHandler.handleError("TREE_LOADING_ERROR", e)
		} finally {
			this.loading = false
			this.renderTree()
		}
	}

	async loadTree() {
		try {
			this.loading = true
			this.renderTree()
			this.tree = await this.plugin.fetchFileTree(this.cwd)
			this.error = null
		} catch (e) {
			this.error = ScrybbleErrorHandler.handleError("TREE_LOADING_ERROR", e)
		} finally {
			this.loading = false
		}
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


