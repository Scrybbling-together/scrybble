// ScrybbleFileTreeComponent.ts
import {html, LitElement, nothing} from 'lit-element';
import {property, state} from 'lit-element/decorators.js';
import {RMFileTree, RMTreeItem, ScrybbleCommon, SearchFilters} from "../../../@types/scrybble";
import {ErrorMessage, Errors} from "../../errorHandling/Errors";
import {scrybbleContext} from "../scrybbleContext";
import {consume} from "@lit/context";
import {getIcon} from "obsidian";

export class ScrybbleFileTreeComponent extends LitElement {
	@consume({context: scrybbleContext})
	@property({type: Object, attribute: false})
	scrybble!: ScrybbleCommon;

	@state()
	private items: ReadonlyArray<RMTreeItem> = [];

	@state()
	private mode: 'browse' | 'search' = 'browse';

	@state()
	private cwd = "/";

	@state()
	private searchFilters: SearchFilters = {};

	@state()
	private loading: boolean = true;

	@state()
	private error: ErrorMessage | null = null;

	async connectedCallback() {
		super.connectedCallback();
		await this.loadTree();
	}

	async refresh() {
		if (this.mode === 'browse') {
			await this.loadTree();
		} else {
			await this.executeSearch(this.searchFilters);
		}
		this.requestUpdate();
	}

	async handleClickFileOrFolder({detail: {path, type}}: any) {
		if (type === "f") {
			try {
				this.scrybble.sync.requestSync(path)
			} catch (e) {
				Errors.handle("REQUEST_FILE_SYNC_ERROR", e as Error)
			}
		} else if (type === "d") {
			this.cwd = path;
			this.mode = 'browse';
			await this.loadTree();
		}
	}

	async handleSearch({detail: filters}: CustomEvent<SearchFilters>) {
		this.searchFilters = filters;
		await this.executeSearch(filters);
	}

	async handleClearSearch() {
		this.mode = 'browse';
		this.searchFilters = {};
		await this.loadTree();
	}

	private async executeSearch(filters: SearchFilters) {
		try {
			this.loading = true;
			this.requestUpdate();
			const result = await this.scrybble.api.fetchSearchFiles(filters);
			this.items = result.items;
			this.mode = 'search';
			this.error = null;
		} catch (e) {
			this.error = Errors.handle("SEARCH_ERROR", e as Error);
		} finally {
			this.loading = false;
			this.requestUpdate();
		}
	}

	async loadTree() {
		try {
			this.loading = true;
			this.requestUpdate();
			const tree = await this.scrybble.api.fetchFileTree(this.cwd);
			this.items = tree.items;
			this.error = null;
		} catch (e) {
			this.error = Errors.handle("TREE_LOADING_ERROR", e as Error);
		} finally {
			this.loading = false;
			this.requestUpdate();
		}
	}

	public async setSearchFilters(filters: SearchFilters) {
		this.searchFilters = filters;
		await this.executeSearch(filters);
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

		const searchFilter = html`
			<sc-search-filter
				.filters="${this.searchFilters}"
				.isSearchMode="${this.mode === 'search'}"
				@search="${this.handleSearch.bind(this)}"
				@clear-search="${this.handleClearSearch.bind(this)}"
			></sc-search-filter>`;

		const locationIndicator = this.mode === 'browse'
			? html`<div class="scrybble-location">Current directory is ${this.cwd}</div>`
			: nothing;

		const tree = !this.error && this.items.length > 0 ? html`
			<sc-rm-tree .tree="${{items: this.items, cwd: this.cwd}}" @rm-click="${this.handleClickFileOrFolder.bind(this)}"></sc-rm-tree>` : nothing;

		const emptyState = !this.error && !this.loading && this.items.length === 0 ? html`
			<div class="scrybble-empty-state">
				${this.mode === 'search' ? 'No files match your search criteria.' : 'This folder is empty.'}
			</div>` : nothing;

		return html`
			<div class="inner-container">
				${heading}
				${searchFilter}
				${error}
				${locationIndicator}
				${tree}
				${emptyState}
			</div>
		`;
	}

	protected createRenderRoot(): HTMLElement | DocumentFragment {
		return this
	}
}
