import {getIcon, ItemView, WorkspaceLeaf} from "obsidian";
import Scrybble from "../main";
import {html, nothing, render} from "lit-html";
import {ErrorMessage, ScrybbleLogger} from "./errorHandling/Errors";

export const SCRYBBLE_VIEW = "SCRYBBLE_VIEW";

// View type enum
export enum ScrybbleViewType {
	FILE_TREE = "file_tree",
	SYNC_HISTORY = "sync_history"
}

export class ScrybbleView extends ItemView {
	navigation = true;
	private readonly plugin: Scrybble;
	private currentView: ScrybbleViewType = ScrybbleViewType.FILE_TREE;
	private error: ErrorMessage | null = null;

	constructor(leaf: WorkspaceLeaf, plugin: Scrybble) {
		super(leaf);
		this.plugin = plugin;
	}

	async onload() {
		await this.renderView()
		if (!this.plugin.access_token) {
			this.error = ScrybbleLogger.handleError("NOT_LOGGED_IN");
			await this.renderView();
			return;
		}

		try {
			const state = await this.plugin.fetchOnboardingState();
			if (state !== "ready") {
				this.error = ScrybbleLogger.handleError("NOT_SETUP");
				await this.renderView();
				return;
			}
		} catch (e) {
			this.error = ScrybbleLogger.handleError("GENERAL_ERROR", e);
		} finally {
			await this.renderView();
		}
	}

	async errorRefresh() {
		await this.onload()
	}

	async renderView() {
		this.contentEl.style.display = "flex";
		this.contentEl.style.flexDirection = "column";

		const error = this.error ? html`
			<error-view .error="${this.error}" .actions="${[html`
				<button class="retry" @click="${this.errorRefresh.bind(this)}">Refresh</button>`]}"/>` : nothing;

		render(html`
			<div class="nav-header">
				<div class="nav-buttons-container">
					<div style="display: flex; flex-direction: column"
						 class="clickable-icon nav-action-button ${this.currentView === ScrybbleViewType.FILE_TREE ? 'is-active' : ''}"
						 aria-label="File tree"
						 @click="${() => this.switchView(ScrybbleViewType.FILE_TREE)}">
						<span>${getIcon("folder")}</span>
						<span>Files</span>
					</div>
					<div style="display: flex; flex-direction: column"
						 class="clickable-icon nav-action-button ${this.currentView === ScrybbleViewType.SYNC_HISTORY ? 'is-active' : ''}"
						 aria-label="Sync history"
						 @click="${() => this.switchView(ScrybbleViewType.SYNC_HISTORY)}">
						<span>${getIcon("file-stack")}</span>
						<span>Sync history</span>
					</div>
				</div>
			</div>
			<div
				style="position: relative; overflow-y: auto; flex: 1 0 0; padding-inline-start: var(--size-4-3); padding-inline-end: var(--size-4-3)">
				<div class="tree-item-self">
					<h1 class="tree-item-inner">Scrybble reMarkable sync</h1>
				</div>

				${error}
				${this.error ? nothing : this.renderCurrentView()}
			</div>
		`, this.contentEl);
	}

	renderCurrentView() {
		if (this.currentView === ScrybbleViewType.FILE_TREE) {
			return html`
				<scrybble-file-tree .plugin="${this.plugin}"></scrybble-file-tree>`;
		} else if (this.currentView === ScrybbleViewType.SYNC_HISTORY) {
			return html`
				<scrybble-sync-history .plugin="${this.plugin}"></scrybble-sync-history>`;
		}
		return nothing;
	}

	async switchView(view: ScrybbleViewType) {
		if (this.currentView !== view) {
			this.currentView = view;
			await this.renderView();
		}
	}

	getDisplayText(): string {
		return "Scrybble";
	}

	getViewType(): string {
		return SCRYBBLE_VIEW;
	}

	getIcon() {
		return "pencil-line";
	}
}
