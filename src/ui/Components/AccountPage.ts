import {html, TemplateResult} from "lit-html";
import {LitElement, nothing} from "lit-element";
import {property, state} from "lit-element/decorators.js";
import {consume} from "@lit/context";
import {scrybbleContext} from "../scrybbleContext";
import {ScrybbleCommon, ScrybbleUser} from "../../../@types/scrybble";
import {getIcon} from "obsidian";
import {ErrorMessage, Errors} from "../../errorHandling/Errors";
import {pino} from "../../errorHandling/logging";

export class AccountPage extends LitElement {
	@consume({context: scrybbleContext})
	@property({attribute: false})
	scrybble!: ScrybbleCommon;

	@state()
	private isLoading = true;

	@state()
	private isLoggingIn = false;

	@state()
	private error: ErrorMessage | null = null;

	@state()
	private isAuthenticated = false;

	@state()
	private userInfo: ScrybbleUser | null = null;

	async connectedCallback() {
		super.connectedCallback();
		this.scrybble.setOnOAuthCompletedCallback(this.onOAuthCompleted.bind(this));
		await this.checkAuthenticationStatus();
	}

	render(): TemplateResult {
		const errorTemplate = this.error ? html`
			<error-view .error="${this.error}" .actions="${[
				html`
					<button class="retry" @click="${() => this.handleErrorRefresh()}">Retry</button>`
			]}"></error-view>
		` : nothing;

		if (this.isLoading) {
			return html`
				<div class="account-container">
					<div class="spinner">
						${getIcon("loader-2")}
					</div>
				</div>`;
		}

		return html`
			<div class="account-container">
				${errorTemplate}
				${this.error ? nothing : (this.isAuthenticated && this.userInfo ? this.renderAuthenticatedView() : this.renderLoginView())}
			</div>
		`;
	}

	protected createRenderRoot(): HTMLElement | DocumentFragment {
		return this;
	}

	private async checkAuthenticationStatus(): Promise<void> {
		pino.info("Checking authentication status");

		try {
			if (this.scrybble.storage.access_token) {
				pino.info("Access token found, fetching user info");
				this.isLoading = true;
				this.userInfo = await this.scrybble.api.fetchGetUser();
				this.isAuthenticated = true;
				pino.info("User info fetched successfully", {userId: this.userInfo.user.id});
			} else {
				pino.info("No access token found");
				this.isAuthenticated = false;
				this.userInfo = null;
			}
			this.error = null;
		} catch (error) {
			this.error = Errors.handle("AUTHENTICATION_CHECK_ERROR", error as Error);
			this.isAuthenticated = false;
			this.userInfo = null;
		} finally {
			this.isLoading = false;
		}
	}

	private async startOAuthFlow(): Promise<void> {
		pino.info("Starting OAuth flow");

		try {
			this.isLoggingIn = true;
			this.error = null;

			this.scrybble.api.fetchInitiateOAuthPKCE();
			pino.info("OAuth flow initiated successfully");
		} catch (error) {
			this.error = Errors.handle("OAUTH_INITIATION_ERROR", error as Error);
			this.isLoggingIn = false;
		}
	}

	private async onOAuthCompleted(): Promise<void> {
		pino.info("OAuth flow completed, fetching user info");

		try {
			this.isLoading = true;
			const user = await this.scrybble.api.fetchGetUser();
			this.scrybble.user = user;
			this.userInfo = user;
			this.isAuthenticated = true;
			this.isLoggingIn = false;
			this.error = null;

			pino.info("OAuth completion successful", {
				userId: user.user.id,
				hasSubscription: user.subscription_status.exists
			});
		} catch (error) {
			this.error = Errors.handle("OAUTH_COMPLETION_ERROR", error as Error);
			this.isLoggingIn = false;
		} finally {
			this.isLoading = false;
		}
	}

	private async handleErrorRefresh(): Promise<void> {
		pino.info("Refreshing account page after error");
		this.error = null;
		this.isLoading = true;
		await this.checkAuthenticationStatus();
	}

	private formatDate(dateString: string): string {
		try {
			return new Date(dateString).toLocaleDateString();
		} catch (error) {
			pino.warn("Failed to format date", {dateString, error});
			return 'Unknown';
		}
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
						class="primary-button ${this.isLoggingIn ? 'loading' : ''}"
						@click="${this.startOAuthFlow}"
						?disabled="${this.isLoggingIn}">
						${this.isLoggingIn ? html`
							<div class="spinner">
								${getIcon("loader-2")}
							</div>
							<span>Opening browser...</span>
						` : html`
							<div class="button-icon">
								${getIcon("log-in")}
							</div>
							<span>Sign in with Scrybble</span>
						`}
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
		if (!this.userInfo?.subscription_status.licenseInformation?.subscription_id) {
			pino.warn("Missing subscription ID for Gumroad URL");
			return "#";
		}
		return `https://gumroad.com/subscriptions/${this.userInfo.subscription_status.licenseInformation.subscription_id}/manage`;
	}

	private renderAuthenticatedView(): TemplateResult {
		const {userInfo} = this;

		return html`
			<div class="account-card">
				<div class="account-header authenticated">
					<h2>Welcome back ${userInfo!.user.name}</h2>
					<p>You're connected to Scrybble</p>
				</div>

				<div class="user-info-section">
					<div class="info-grid">
						<div class="info-item">
							<div class="info-label">
								${getIcon("user")}
								<span>Name</span>
							</div>
							<div class="info-value">${userInfo!.user.name}</div>
						</div>

						<div class="info-item">
							<div class="info-label">
								${getIcon("mail")}
								<span>Email</span>
							</div>
							<div class="info-value">${userInfo!.user.email}</div>
						</div>

						<div class="info-item">
							<div class="info-label">
								${getIcon("calendar")}
								<span>Member since</span>
							</div>
							<div class="info-value">${this.formatDate(userInfo!.user.created_at)}</div>
						</div>

						<div class="info-item">
							<div class="info-label">
								${getIcon("crown")}
								<span>Subscription <a
									href="${this.formatGumroadSubscriptionManageUrl()}">Manage</a></span>
							</div>
							${userInfo!.subscription_status.lifetime ?
								html`
									<div class="info-value subscription-status-lifetime">
										Lifetime license!
									</div>` :
								html`
									<div
										class="info-value ${userInfo!.subscription_status.exists ? "subscription-status-active" : "subscription-status-inactive"}">
										${userInfo!.subscription_status.exists ? "Active" : "No active license"}
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
								<div class="stat-number">${userInfo!.total_syncs}</div>
								<div class="stat-label">Documents synced</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		`;
	}
}
