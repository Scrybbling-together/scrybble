import {html, LitElement, nothing} from 'lit-element';
import {property, state} from 'lit-element/decorators.js';
import Scrybble from "../../main";
import {ErrorMessage, ScrybbleLogger} from "../errorHandling/Errors";
import {getIcon} from "obsidian";
import {SyncItem} from "../../@types/scrybble";

export class ScrybbleSyncHistoryComponent extends LitElement {
	@property({type: Object})
	plugin: Scrybble;
	@state()
	private syncItems: SyncItem[] = [];
	@state()
	private currentPage: number = 1;
	@state()
	private lastPage: number = 1;
	@state()
	private total: number = 0;
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
		await this.loadSyncHistory();
	}

	async loadSyncHistory(page: number = 1) {
		try {
			this.loading = true;
			this.requestUpdate();

			const response = await this.plugin.fetchPaginatedSyncHistory(page);
			this.syncItems = response.data;
			this.currentPage = response.current_page;
			this.lastPage = response.last_page;
			this.total = response.total;
			this.error = null;
		} catch (e) {
			this.error = ScrybbleLogger.handleError("SYNC_HISTORY_ERROR", e);
		} finally {
			this.loading = false;
			this.requestUpdate();
		}
	}

	async refresh() {
		await this.loadSyncHistory(this.currentPage);
	}

	async previousPage() {
		if (this.currentPage > 1) {
			await this.loadSyncHistory(this.currentPage - 1);
		}
	}

	async nextPage() {
		if (this.currentPage < this.lastPage) {
			await this.loadSyncHistory(this.currentPage + 1);
		}
	}

	render() {
		const error = this.error ? html`
			<div class="scrybble-error">
				<h3>${this.error.title}</h3>
				<p>${this.error.message}</p>
				<p>${this.error.helpAction}</p>
			</div>` : nothing;

		const refreshButton = html`
			<div class="scrybble-header">
				<h3>Sync History</h3>
				<button
					?disabled="${this.loading}"
					@click="${this.refresh.bind(this)}"
					class="mod-cta scrybble-refresh-button"
				>
					<span class="tree-item-icon scrybble-icon">${getIcon('refresh-ccw')}</span>
					${this.loading ? "Loading..." : "Refresh"}
				</button>
			</div>`;

		const syncHistory = !this.error && this.syncItems.length ? html`
			<div class="scrybble-sync-history">
				${this.syncItems.map(item => html`
					<div class="scrybble-sync-item ${item.completed ? 'scrybble-sync-item-completed' : (item.error ? 'scrybble-sync-item-error' : 'scrybble-sync-item-progress')}">
						<div class="scrybble-sync-date">${item.created_at}</div>
						<div class="scrybble-sync-filename" title="${item.filename}">${item.filename}</div>
						<div class="scrybble-sync-status ${item.completed ? 'scrybble-sync-status-completed' : (item.error ? 'scrybble-sync-status-error' : 'scrybble-sync-status-progress')}">
							${item.completed ? 'Completed' : (item.error ? 'Error' : 'In progress')}
						</div>
					</div>
				`)}
			</div>` : html`
			<div class="scrybble-empty-state">No sync history found</div>`;

		const pagination = this.syncItems.length ? html`
			<div class="scrybble-pagination">
				<button
					class="${this.currentPage <= 1 ? '' : 'mod-cta'}"
					?disabled=${this.currentPage <= 1}
					@click="${this.previousPage.bind(this)}"
					style="display: ${this.currentPage <= 1 ? 'none' : 'block'};"
				>Previous
				</button>

				<span class="scrybble-page-info">Page ${this.currentPage} of ${this.lastPage}</span>

				<button
					class="${this.currentPage >= this.lastPage ? '' : 'mod-cta'}"
					?disabled=${this.currentPage >= this.lastPage}
					@click="${this.nextPage.bind(this)}"
					style="display: ${this.currentPage >= this.lastPage ? 'none' : 'block'};"
				>Next
				</button>
			</div>` : nothing;

		return html`
			<div class="scrybble-container">
				${refreshButton}
				${error}
				<div class="scrybble-content">
					${!this.loading ? syncHistory : html`
						<div class="scrybble-loading">
                        <span class="tree-item-icon scrybble-spinner">
                            ${getIcon('loader')}
                        </span>
						</div>
					`}
				</div>
				${pagination}
			</div>
		`;
	}
	protected createRenderRoot(): HTMLElement | DocumentFragment {
		return this
	}
}
