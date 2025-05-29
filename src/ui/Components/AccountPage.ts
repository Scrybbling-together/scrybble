import {html, TemplateResult} from "lit-html";
import {LitElement, nothing} from "lit-element";
import {property, state} from "lit-element/decorators.js";
import {consume} from "@lit/context";
import {scrybbleContext} from "../scrybbleContext";
import {ScrybbleCommon} from "../../../@types/scrybble";
import {getIcon} from "obsidian";
import {ErrorMessage, Errors} from "../../errorHandling/Errors";
import {pino} from "../../errorHandling/logging";
import {AuthStates} from "../../Authentication";

export class AccountPage extends LitElement {
	@consume({context: scrybbleContext})
	@property({attribute: false})
	scrybble!: ScrybbleCommon;

	@state()
	private authState: AuthStates = AuthStates.INIT;

	@state()
	private error: ErrorMessage | null = null;

	async connectedCallback() {
		super.connectedCallback();

		// Get initial state
		this.authState = this.scrybble.authentication.getState();

		// Listen for state changes
		this.scrybble.authentication.addStateChangeListener(this.stateChangeHandler);
	}

	disconnectedCallback() {
		super.disconnectedCallback();
	}

	render(): TemplateResult {
		const errorTemplate = this.error ? html`
			<error-view .error="${this.error}" .actions="${[
				html`
					<button class="retry" @click="${() => this.handleErrorRetry()}">Retry</button>`
			]}"></error-view>
		` : nothing;

		return html`
			<div class="account-container">
				${errorTemplate}
				${this.error ? nothing : this.renderStateBasedContent()}
			</div>
		`;
	}

	protected createRenderRoot(): HTMLElement | DocumentFragment {
		return this;
	}

	private stateChangeHandler = (newState: AuthStates) => {
		console.log("State change", newState);
		this.authState = newState;
		this.requestUpdate();
	};

	private renderStateBasedContent(): TemplateResult {
		switch (this.authState) {
			case AuthStates.INIT:
				return this.renderLoadingView("Initializing...");

			case AuthStates.FETCHING_USER:
				return this.renderLoadingView("Fetching user information...");

			case AuthStates.WAITING_FOR_OAUTH_CALLBACK:
				return this.renderWaitingForOAuthView();

			case AuthStates.REFRESHING_TOKEN:
				return this.renderLoadingView("Refreshing authentication...");

			case AuthStates.AUTHENTICATED:
				return this.renderAuthenticatedView();

			case AuthStates.UNAUTHENTICATED:
				return this.renderLoginView();

			default:
				return html`
					<div>Unknown state: ${this.authState}</div>`;
		}
	}

	private async startOAuthFlow(): Promise<void> {
		pino.info("Starting OAuth flow");

		try {
			this.error = null;
			await this.scrybble.authentication.initiateOAuthFlow(this.scrybble.settings);
		} catch (error) {
			this.error = Errors.handle("OAUTH_INITIATION_ERROR", error as Error);
		}
	}

	private async handleLogout(): Promise<void> {
		await this.scrybble.authentication.logout();
	}

	private async handleErrorRetry(): Promise<void> {
		pino.info("Retrying after error");
		this.error = null;
	}

	private formatDate(dateString: string): string {
		try {
			return new Date(dateString).toLocaleDateString();
		} catch (error) {
			pino.warn("Failed to format date", {dateString, error});
			return 'Unknown';
		}
	}

	private renderLoadingView(message: string = "Loading..."): TemplateResult {
		return html`
			<div class="account-card">
				<div class="loading-container">
					<div class="spinner">
						${getIcon("loader-2")}
					</div>
					<p>${message}</p>
				</div>
			</div>
		`;
	}

	private renderWaitingForOAuthView(): TemplateResult {
		return html`
			<div class="account-card">
				<div class="oauth-waiting">
					<div class="spinner">
						${getIcon("loader-2")}
					</div>
					<h3>Waiting for authentication</h3>
					<p>Please complete the authentication process in your browser.</p>
					<p class="hint">This window will update automatically once authentication is complete.</p>
				</div>
			</div>
		`;
	}

	private renderLoginView(): TemplateResult {
		return html`
			<div class="account-card">
				<div class="account-header">
					<div class="account-icon">
						${getIcon("key-round")}
					</div>
					<h2>Connect to Scrybble</h2>
					<p>Sign in to sync your ReMarkable highlights with Obsidian</p>
				</div>

				<div class="account-actions">
					<button
						class="primary-button"
						@click="${this.startOAuthFlow}">
						<div class="button-icon">
							${getIcon("log-in")}
						</div>
						<span>Sign in with Scrybble</span>
					</button>
				</div>

				<div class="account-help">
					<p>After clicking "Sign in", you'll be redirected to your browser to complete the authentication
						process.</p>
				</div>
			</div>
		`;
	}

	private formatGumroadSubscriptionManageUrl(): string {
		const user = this.scrybble.authentication.user;
		if (!user.loaded) return "";
		if (!user.subscription_status.licenseInformation?.subscription_id) {
			pino.warn("Missing subscription ID for Gumroad URL");
			return "#";
		}
		return `https://gumroad.com/subscriptions/${user.subscription_status.licenseInformation.subscription_id}/manage`;
	}

	private renderAuthenticatedView(): TemplateResult {
		const userInfo = this.scrybble.authentication.user;
		if (!userInfo.loaded) {
			return this.renderLoadingView("Loading user information...");
		}

		return html`
			<div class="account-card">
				<div class="account-header authenticated">
					<div class="header-top">
						<div>
							<h2>Welcome back ${userInfo.user.name}</h2>
							<p>You're connected to Scrybble</p>
						</div>
					</div>
				</div>

				<div class="user-info-section">
					<div class="info-grid">
						<div class="info-item">
							<div class="info-label">
								${getIcon("user")}
								<span>Name</span>
							</div>
							<div class="info-value">${userInfo.user.name}</div>
						</div>

						<div class="info-item">
							<div class="info-label">
								${getIcon("mail")}
								<span>Email</span>
							</div>
							<div class="info-value">${userInfo.user.email}</div>
						</div>

						<div class="info-item">
							<div class="info-label">
								${getIcon("sunrise")}
								<span>Member since</span>
							</div>
							<div class="info-value">${this.formatDate(userInfo.user.created_at)}</div>
						</div>

						<div class="info-item">
							<div class="info-label">
								${getIcon("crown")}
								<span>Subscription 
									${userInfo.subscription_status.exists ?
										html`<a href="${this.formatGumroadSubscriptionManageUrl()}" target="_blank">Manage</a>` :
										nothing}
								</span>
							</div>
							${userInfo.subscription_status.lifetime ?
								html`<div class="info-value subscription-status-lifetime">Lifetime license!</div>` :
								html`<div
									class="info-value ${userInfo.subscription_status.exists ? "subscription-status-active" : "subscription-status-inactive"}">
									${userInfo.subscription_status.exists ? html`Active` : html`No active license`}
								</div>`
							}
						</div>
					</div>
				</div>

				<div class="account-stats">
					<h3>Sync Statistics</h3>
					<div class="stats-grid">
						<div class="stat-item">
							<div class="stat-icon">
								${getIcon("file-text")}
							</div>
							<div class="stat-content">
								<div class="stat-number">${userInfo.total_syncs}</div>
								<div class="stat-label">Documents synced</div>
							</div>
						</div>
					</div>
				</div>

				<button
					class="logout-button"
					@click="${this.handleLogout}"
					title="Sign out">
					${getIcon("log-out")} Log out
				</button>
			</div>
		`;
	}
}
