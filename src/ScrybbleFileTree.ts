import {getIcon, ItemView, Notice, WorkspaceLeaf} from "obsidian";
import Scrybble from "../main";
import {html, nothing, render} from "lit-html";
import {RMFileTree} from "../@types/scrybble";

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

	async refresh() {
		console.log('refreshing')
		await this.loadTree()
		console.log('done refreshing')
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
				<div class="nav-header">
					<div class="nav-buttons-container">
						<div class="clickable-icon" aria-label="refresh" @click="${this.refresh.bind(this)}"><span>${getIcon("refresh-cw")}</span></div>
					</div>
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
			this.error = null
			this.errorHelp = null
		} catch (e) {
			console.dir(e)
			this.error = `There's a problem loading your files - response code ${e.status}.`
			this.errorHelp = "Please try refreshing in a minute or so, otherwise you can contact mail@scrybble.ink for support"
		} finally {
			this.loading = false
			this.renderTree()
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


