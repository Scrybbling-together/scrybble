import {html, nothing, TemplateResult} from "lit-html";
import {ErrorMessage} from "../../errorHandling/Errors";
import {getIcon} from "obsidian";
import {ScrybbleCommon} from "../../../@types/scrybble";
import {scrybbleContext} from "../scrybbleContext";
import {provide} from "@lit/context";
import {LitElement} from "lit-element";
import {property, state} from "lit-element/decorators.js";
import {AuthStates} from "../../Authentication";

export enum ScrybbleViewType {
	FILE_TREE = "file_tree",
	SUPPORT = "support",
	ACCOUNT = "login",
	ONBOARDING = "onboarding"
}

export class ScrybbleUI extends LitElement {
	@state()
	private currentView: ScrybbleViewType = ScrybbleViewType.FILE_TREE;

	@state()
	private error: ErrorMessage | null = null;

	@property({type: Object, attribute: false})
	@provide({context: scrybbleContext})
	private scrybble!: ScrybbleCommon;

	@property({type: Function, attribute: false})
	onViewSwitch!: (view: ScrybbleViewType) => void;

	@property({type: Function, attribute: false})
	onErrorRefresh!: () => Promise<void>;

	private async initialize() {
		this.scrybble.authentication.addStateChangeListener((state) => {
			if (state === AuthStates.AUTHENTICATED) {
				if (this.scrybble.authentication.user?.onboarding_state !== "ready") {
					this.currentView = ScrybbleViewType.ONBOARDING;
				}
				this.requestUpdate();
			} else if (state === AuthStates.UNAUTHENTICATED) {
				this.requestUpdate();
			}
		});

		if (!this.scrybble.settings.access_token) {
			this.currentView = ScrybbleViewType.ACCOUNT
			return;
		}
	}

	private shouldDisableNavButton(): boolean {
		if (this.currentView === ScrybbleViewType.ONBOARDING) {
			return this.scrybble.authentication.user!.onboarding_state !== "ready";
		}
		return !this.scrybble.authentication.user;
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
		await this.initialize();
		await this.onErrorRefresh();
	}

	render(): TemplateResult {
		const { error } = this;

		const errorTemplate = error ? html`
            <error-view .error="${error}" .actions="${[html`
                <button class="retry" @click="${() => this.handleErrorRefresh()}">Refresh</button>`]}"/>` : nothing;

		return html`
			${this.renderNavigation()}
			<div class="scrybble-container">
				${this.currentView === ScrybbleViewType.SUPPORT ? nothing : errorTemplate}
				${(error && this.currentView !== ScrybbleViewType.SUPPORT) ? nothing : this.renderCurrentView()}
			</div>
        `;
	}

	private renderNavigation(): TemplateResult {
		const { currentView } = this;

		return html`
			<div class="nav-header">
				<div class="nav-buttons-container">
					<button style="display: flex; flex-direction: column"
							?disabled="${this.shouldDisableNavButton()}"
							class="clickable-icon nav-action-button ${currentView === ScrybbleViewType.FILE_TREE ? 'is-active' : ''}"
							aria-label="${this.shouldDisableNavButton() ? "Complete setup first" : "File tree"}"
							@click="${() => this.switchView(ScrybbleViewType.FILE_TREE)}">
						<span>${getIcon("folder")}</span>
						<span>Files</span>
					</button>
					<button style="display: flex; flex-direction: column"
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
			case ScrybbleViewType.SUPPORT:
				return html`<scrybble-support/>`;
			case ScrybbleViewType.ACCOUNT:
				return html`<scrybble-account/>`;
			case ScrybbleViewType.ONBOARDING:
				return html`<scrybble-onboarding 
					.onboardingReady="${this.requestUpdate.bind(this)}"
				/>`;
			default:
				return nothing;
		}
	}

	protected createRenderRoot(): HTMLElement | DocumentFragment {
		return this
	}
}
