import {LitElement, nothing} from "lit-element";
import {html} from "lit-html";
import {getIcon} from "obsidian";
import {property, state} from "lit-element/decorators.js";
import {sanitizeFilename} from "../../support";
import {consume} from "@lit/context";
import {scrybbleContext} from "../scrybbleContext";
import {ScrybbleCommon, SyncFile} from "../../../@types/scrybble";
import {SyncJobStates} from "../../SyncJob";

export class RmFile extends LitElement {
	@consume({context: scrybbleContext})
	@property({type: Object, attribute: false})
	scrybble!: ScrybbleCommon;

	@property({type: Object})
	file!: SyncFile;

	@state()
	private currentlySyncing: boolean = false;

	@state()
	private syncOverride: SyncFile['sync'] | undefined = undefined;

	constructor() {
		super();
	}

	get sync(): SyncFile['sync'] {
		if (this.syncOverride != null) {
			return this.syncOverride;
		}
		return this.file.sync;
	}

	connectedCallback() {
		super.connectedCallback();
		this.scrybble.sync.subscribeToSyncStateChangesForFile(this.file.path, (newState: SyncJobStates) => {
			this.currentlySyncing = !(newState === SyncJobStates.downloaded || newState === SyncJobStates.failed_to_process);

			if (newState === SyncJobStates.downloaded) {
				this.syncOverride = {
					error: false,
					completed: true,
					created_at: "Just now",
					id: "Unknown"
				};
			} else if (newState === SyncJobStates.failed_to_process) {
				this.syncOverride = {
					error: true,
					completed: false,
					created_at: "Just now",
					id: "Unknown"
				};
			}

			this.requestUpdate();
		});
	}

	disconnectedCallback() {
		super.disconnectedCallback();
		this.scrybble.sync.unsubscribeToSyncStateChangesForFile(this.file.path);
	}

	render() {
		let syncState: "file-check-2" | "file-clock" | "file" | "file-x-2";
		if (this.currentlySyncing) {
			syncState = "file-clock";
		} else if (this.sync?.error) {
			syncState = "file-x-2";
		} else if (this.sync?.completed) {
			syncState = "file-check-2";
		} else if (this.sync != null && !this.sync?.error && !this.sync?.completed) {
			syncState = "file-clock";
		} else {
			syncState = "file";
		}

		const {pdf, md} = this.findFile();

		return html`
			<div class="tree-item" @click="${this._handleClick}" aria-label="${`${this.file.name}
			
Click to download file to your vault`}">
				<div class="tree-item-self rm-file is-clickable">
					<span class="tree-item-icon">${this.currentlySyncing ? this.renderSpinner() : getIcon(syncState)}</span>
					<span class="filename">${this.file.name}</span>
				</div>
			</div>
			<div class="tree-item">
				<div class="tree-item-self additional">
					<span class="when">${this.sync ? this.sync.created_at : "Not synced yet"}</span>
					<span class="file-links">
						${this.sync ? html`
							<a class="feedback" @click="${this.openFeedbackDialog.bind(this)}">feedback</a>
							<span class="vertical-separator"></span>
							<span class="pill pdf ${pdf ? "available" : "unavailable"}"
								  @click="${this.clickPdf.bind(this)}">PDF</span>
							<span class="pill md ${md ? "available" : "unavailable"}"
								  @click="${this.clickMd.bind(this)}">MD</span>
						` : nothing}
					</span>
				</div>
			</div>
		`;
	}

	protected createRenderRoot(): HTMLElement | DocumentFragment {
		return this
	}

	private openFeedbackDialog(_e) {
		this.scrybble.openFeedbackDialog(this.file,
			async (details) => {
				await this.scrybble.api.fetchGiveFeedback(details);
			});
	}

	private clickMd(e) {
		const {md, mdPath} = this.findFile()

		if (md) {
			const fileNavigator = this.scrybble.fileNavigator

			fileNavigator.showContextMenu(e, [
				{
					title: "Open Markdown file in new tab",
					icon: "file-plus",
					onClick: () => fileNavigator.openInNewTab(mdPath)
				},
				{
					title: "Open Markdown file in vertical split view",
					icon: "separator-vertical",
					onClick: () => fileNavigator.openInVerticalSplit(mdPath)
				},
				{
					title: "Open Markdown file in horizontal split view",
					icon: "separator-horizontal",
					onClick: () => fileNavigator.openInHorizontalSplit(mdPath)
				}]);
		}
	}

	private clickPdf(e) {
		const {pdf, pdfPath} = this.findFile()

		if (pdf) {
			const fileNavigator = this.scrybble.fileNavigator

			fileNavigator.showContextMenu(e, [
				{
					title: "Open PDF file in new tab",
					icon: "file-plus",
					onClick: () => fileNavigator.openInNewTab(pdfPath)
				},
				{
					title: "Open PDF file in vertical split view",
					icon: "separator-vertical",
					onClick: () => fileNavigator.openInVerticalSplit(pdfPath)
				},
				{
					title: "Open PDF file in horizontal split view",
					icon: "separator-horizontal",
					onClick: () => fileNavigator.openInHorizontalSplit(pdfPath)
				}]);
		}
	}

	private _handleClick() {
		this.dispatchEvent(new CustomEvent('rm-click', {
			detail: {name: this.file.name, path: this.file.path, type: 'f'},
			bubbles: true,
			composed: true
		}));
	}

	private findFile() {
		// The path to the file is constructed from:
		// 1. The configured root folder from settings
		// 2. The sanitized filename
		// 3. Adding .pdf/.md extension
		const sanitizedName = sanitizeFilename(this.file.path.substring(1, this.file.path.length), true);
		const rootFolder = this.scrybble.settings.sync_folder;

		const pdfPath = rootFolder ? `${rootFolder}/${sanitizedName}.pdf` : `${sanitizedName}.pdf`;
		const mdPath = rootFolder ? `${rootFolder}/${sanitizedName}.md` : `${sanitizedName}.md`;

		const pdf = this.scrybble.fileNavigator.getFileByPath(pdfPath);
		const md = this.scrybble.fileNavigator.getFileByPath(mdPath);

		return {
			pdfPath,
			mdPath,
			pdf,
			md
		};
	}

	private renderSpinner() {
		return html`${getIcon('loader-circle')}`;
	}
}

