import {LitElement, html, nothing, TemplateResult} from "lit-element";
import {property, state} from "lit-element/decorators.js";
import {SearchFilters} from "../../../@types/scrybble";
import {getIcon} from "obsidian";

export class SearchFilter extends LitElement {
	@property({type: Object})
	filters: SearchFilters = {};

	@state()
	private query: string = "";

	@state()
	private tag: string = "";

	@state()
	private starred: boolean = false;

	@property({type: Boolean})
	isSearchMode: boolean = false;

	connectedCallback() {
		super.connectedCallback();
		this.applyFilters(this.filters);
	}

	updated(changedProperties: Map<string, unknown>) {
		if (changedProperties.has('filters')) {
			this.applyFilters(this.filters);
		}
	}

	private applyFilters(filters: SearchFilters) {
		this.query = filters.query ?? "";
		this.tag = filters.tags?.join(", ") ?? "";
		this.starred = filters.starred ?? false;
	}

	render(): TemplateResult {
		return html`
			<form class="search-filter" @submit="${this.handleSubmit}">
				<div class="search-filter-fields">
					<div class="search-filter-field">
						<label for="search-query">Search filenames</label>
						<input
							id="search-query"
							type="text"
							placeholder="e.g. .*meeting.*"
							.value="${this.query}"
							@input="${this.handleQueryChange}"
						/>
					</div>
					<div class="search-filter-field">
						<label for="search-tag">Tags</label>
						<input
							id="search-tag"
							type="text"
							placeholder="e.g. Work, Personal"
							.value="${this.tag}"
							@input="${this.handleTagChange}"
						/>
					</div>
					<div class="search-filter-field search-filter-checkbox">
						<label>
							<input
								type="checkbox"
								.checked="${this.starred}"
								@change="${this.handleStarredChange}"
							/>
							Starred only
						</label>
					</div>
				</div>
				<div class="search-filter-actions">
					<button
						type="submit"
						class="mod-cta"
						?disabled="${!this.hasFilters()}"
					>
						${getIcon('search')}
						Search
					</button>
					${this.isSearchMode ? html`
						<button
							type="button"
							class="mod-warning"
							@click="${this.handleClear}"
						>
							${getIcon('x')}
							Back to browsing
						</button>
					` : nothing}
				</div>
			</form>
		`;
	}

	protected createRenderRoot(): HTMLElement | DocumentFragment {
		return this;
	}

	private handleQueryChange(e: Event) {
		this.query = (e.target as HTMLInputElement).value;
	}

	private handleTagChange(e: Event) {
		this.tag = (e.target as HTMLInputElement).value;
	}

	private handleStarredChange(e: Event) {
		this.starred = (e.target as HTMLInputElement).checked;
	}

	private handleSubmit(e: Event) {
		e.preventDefault();
		this.handleSearch();
	}

	private hasFilters(): boolean {
		return this.query.trim() !== "" || this.tag.trim() !== "" || this.starred;
	}

	private buildFilters(): SearchFilters {
		const filters: SearchFilters = {};

		if (this.query.trim()) {
			filters.query = this.query.trim();
		}

		if (this.tag.trim()) {
			filters.tags = this.tag.split(",").map(t => t.trim()).filter(t => t);
		}

		if (this.starred) {
			filters.starred = true;
		}

		return filters;
	}

	private handleSearch() {
		if (!this.hasFilters()) return;

		this.dispatchEvent(new CustomEvent('search', {
			detail: this.buildFilters(),
			bubbles: true,
			composed: true
		}));
	}

	private handleClear() {
		this.query = "";
		this.tag = "";
		this.starred = false;

		this.dispatchEvent(new CustomEvent('clear-search', {
			bubbles: true,
			composed: true
		}));
	}
}