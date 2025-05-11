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

		const refreshButton = html`
			<div style="
         display: flex; 
         justify-content: space-between;
         align-items: center;
         margin-bottom: var(--size-4-4);
         border-bottom: 1px solid var(--background-modifier-border);
         padding-bottom: var(--size-4-2);
      ">
				<h3 style="margin: 0; font-weight: var(--font-semibold);">Sync History</h3>
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

		const syncHistory = !this.error && this.syncItems.length ? html`
			<div style="
         display: flex;
         flex-direction: column;
         gap: var(--size-4-2);
         margin-bottom: var(--size-4-4);
      ">
				${this.syncItems.map(item => html`
					<div style="
               display: grid;
               grid-template-columns: auto 1fr auto;
               align-items: center;
               gap: var(--size-4-3);
               padding: var(--size-4-2) var(--size-4-3);
               border-radius: var(--radius-s);
               background-color: var(--background-secondary);
               border-left: 3px solid ${item.completed ? 'var(--color-green)' : (item.error ? 'var(--color-red)' : 'var(--color-orange)')};
            ">
						<div style="
                  color: var(--text-muted);
                  font-size: var(--font-smaller);
                  white-space: nowrap;
               ">${item.created_at}
						</div>

						<div style="
                  overflow: hidden;
                  text-overflow: ellipsis;
                  white-space: nowrap;
                  font-weight: var(--font-medium);
               " title="${item.filename}">${item.filename}
						</div>

						<div style="
                  padding: var(--size-2-2) var(--size-4-2);
                  border-radius: var(--radius-s);
                  font-size: var(--font-smaller);
                  background-color: ${item.completed ? 'rgba(var(--color-green-rgb), 0.1)' : (item.error ? 'rgba(var(--color-red-rgb), 0.1)' : 'rgba(var(--color-orange-rgb), 0.1)')};
                  color: ${item.completed ? 'var(--color-green)' : (item.error ? 'var(--color-red)' : 'var(--color-orange)')};
                  white-space: nowrap;
               ">${item.completed ? 'Completed' : (item.error ? 'Error' : 'In progress')}
						</div>
					</div>
				`)}
			</div>` : html`
			<div style="
            padding: var(--size-4-6);
            color: var(--text-muted);
            text-align: center;
            background-color: var(--background-secondary);
            border-radius: var(--radius-m);
         ">No sync history found
			</div>`;

		const pagination = this.syncItems.length ? html`
			<div style="
         display: flex;
         justify-content: space-between;
         align-items: center;
         padding: var(--size-4-2) 0;
         border-top: 1px solid var(--background-modifier-border);
      ">
				<button
					class="${this.currentPage <= 1 ? '' : 'mod-cta'}"
					?disabled=${this.currentPage <= 1}
					@click="${this.previousPage.bind(this)}"
					style="display: ${this.currentPage <= 1 ? 'none' : 'block'};"
				>Previous
				</button>

				<span style="color: var(--text-muted);">Page ${this.currentPage} of ${this.lastPage}</span>

				<button
					class="${this.currentPage >= this.lastPage ? '' : 'mod-cta'}"
					?disabled=${this.currentPage >= this.lastPage}
					@click="${this.nextPage.bind(this)}"
					style="display: ${this.currentPage >= this.lastPage ? 'none' : 'block'};"
				>Next
				</button>
			</div>` : nothing;

		return html`
			<div style="padding: var(--size-4-4); height: 100%; display: flex; flex-direction: column;">
				${refreshButton}
				${error}
				<div style="flex: 1; overflow-y: auto;">
					${!this.loading ? syncHistory : html`
						<div style="display: flex; justify-content: center; padding: var(--size-4-8);">
                  <span class="tree-item-icon" style="animation: rotate 2s linear infinite;">
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
