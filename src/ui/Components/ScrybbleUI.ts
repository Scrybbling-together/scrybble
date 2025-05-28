import {html, nothing, TemplateResult} from "lit-html";
import {ErrorMessage, Errors} from "../../errorHandling/Errors";
import {getIcon} from "obsidian";
import {ScrybbleCommon} from "../../../@types/scrybble";
import {scrybbleContext} from "../scrybbleContext";
import {provide} from "@lit/context";
import {LitElement} from "lit-element";
import {property, state} from "lit-element/decorators.js";

export enum ScrybbleViewType {
	FILE_TREE = "file_tree",
	SYNC_HISTORY = "sync_history",
	SUPPORT = "support",
	ACCOUNT = "login"
}

export class ScrybbleUI extends LitElement {
	@state()
	private currentView: ScrybbleViewType = ScrybbleViewType.FILE_TREE;

	@state()
	private error: ErrorMessage | null = null;

	@state()
	private isLoading: boolean = false;

	@property({type: Object, attribute: false})
	@provide({context: scrybbleContext})
	private scrybble!: ScrybbleCommon;

	@property({type: Function, attribute: false})
	onViewSwitch!: (view: ScrybbleViewType) => void;

	@property({type: Function, attribute: false})
	onErrorRefresh!: () => Promise<void>;

	private async initialize() {
		this.isLoading = true;

		if (!this.scrybble.storage.access_token || !this.scrybble.user.loaded) {
			this.currentView = ScrybbleViewType.ACCOUNT
			this.isLoading = false;
			return;
		}

		try {
			const state = await this.scrybble.api.fetchOnboardingState();
			this.error = null;
		} catch (e) {
			this.error = Errors.handle("GENERAL_ERROR", e as Error);
		} finally {
			this.isLoading = false;
		}
	}

	async connectedCallback() {
		super.connectedCallback();
		await this.initialize();
	}

	async switchView(view: ScrybbleViewType): Promise<void> {
		if (this.currentView !== view) {
			this.currentView = view;
			this.onViewSwitch(view);
		}
	}

	async handleErrorRefresh(): Promise<void> {
		this.error = null;
		this.isLoading = true;
		await this.initialize();
		await this.onErrorRefresh();
	}

	render(): TemplateResult {
		const { error, isLoading } = this;

		const errorTemplate = error ? html`
            <error-view .error="${error}" .actions="${[html`
                <button class="retry" @click="${() => this.handleErrorRefresh()}">Refresh</button>`]}"/>` : nothing;

		const loadingTemplate = isLoading ? html`<div>Loading...</div>` : nothing;

		return html`
			${this.renderNavigation()}
			<div class="scrybble-container">
				${this.currentView === ScrybbleViewType.SUPPORT ? nothing : errorTemplate}
				${loadingTemplate}
				${(error && this.currentView !== ScrybbleViewType.SUPPORT) || isLoading ? nothing : this.renderCurrentView()}
			</div>
        `;
	}

	private renderNavigation(): TemplateResult {
		const { currentView } = this;

		return html`
            <div class="nav-header">
                <div class="nav-buttons-container">
                    <button style="display: flex; flex-direction: column"
						?disabled="${!Boolean(this.scrybble.user)}"
                        class="clickable-icon nav-action-button ${currentView === ScrybbleViewType.FILE_TREE ? 'is-active' : ''}"
                        aria-label="File tree"
                        @click="${() => this.switchView(ScrybbleViewType.FILE_TREE)}">
                        <span>${getIcon("folder")}</span>
                        <span>Files</span>
                    </button>
                    <button style="display: flex; flex-direction: column"
						?disabled="${!Boolean(this.scrybble.user)}"
                        class="clickable-icon nav-action-button ${currentView === ScrybbleViewType.SYNC_HISTORY ? 'is-active' : ''}"
                        aria-label="Sync history"
                        @click="${() => this.switchView(ScrybbleViewType.SYNC_HISTORY)}">
                        <span>${getIcon("file-stack")}</span>
                        <span>Sync history</span>
                    </button>
                    <button style="display: flex; flex-direction: column"
						?disabled="${!Boolean(this.scrybble.user)}"
                        class="clickable-icon nav-action-button ${currentView === ScrybbleViewType.SUPPORT ? 'is-active' : ''}"
                        aria-label="Support"
                        @click="${() => this.switchView(ScrybbleViewType.SUPPORT)}">
                        <span>${getIcon("badge-help")}</span>
                        <span>Support</span>
                    </button>
					<button style="display: flex; flex-direction: column"
							class="clickable-icon nav-action-button ${currentView === ScrybbleViewType.ACCOUNT ? 'is-active' : ''}"
							aria-label="Account"
							@click="${() => this.switchView(ScrybbleViewType.ACCOUNT)}">
						<span>${getIcon("user")}</span>
						<span>Account</span>
					</button>
                </div>
            </div>
        `;
	}

	private renderCurrentView(): TemplateResult | typeof nothing {
		const { currentView } = this;

		switch (currentView) {
			case ScrybbleViewType.FILE_TREE:
				return html`<scrybble-file-tree/>`;
			case ScrybbleViewType.SYNC_HISTORY:
				return html`<scrybble-sync-history/>`;
			case ScrybbleViewType.SUPPORT:
				return html`<scrybble-support/>`;
			case ScrybbleViewType.ACCOUNT:
				return html`<scrybble-account/>`
			default:
				return nothing;
		}
	}

	protected createRenderRoot(): HTMLElement | DocumentFragment {
		return this
	}


}
