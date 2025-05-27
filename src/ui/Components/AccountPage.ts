import {html, TemplateResult} from "lit-html";
import {LitElement} from "lit-element";
import {property, state} from "lit-element/decorators.js";
import {consume} from "@lit/context";
import {scrybbleContext} from "../scrybbleContext";
import {ScrybbleCommon, ScrybbleUser} from "../../../@types/scrybble";
import {getIcon} from "obsidian";

export class AccountPage extends LitElement {
	@consume({context: scrybbleContext})
	@property({attribute: false})
	scrybble!: ScrybbleCommon;

	@state()
	private isLoading = true;

	@state()
	private isLoggingIn = false;

	@state()
	private loginError: string | null = null;

	@state()
	private isAuthenticated = false;

	@state()
	private userInfo: ScrybbleUser | null = null;

	async connectedCallback() {
		super.connectedCallback();
		await this.checkAuthenticationStatus();
	}

	render(): TemplateResult {
		if (this.isLoading) {
			return html`
				<div class="spinner">
					${getIcon("loader-2")}
				</div>`;
		}
		if (this.isAuthenticated && this.userInfo) {
			return this.renderAuthenticatedView();
		} else {
			return this.renderLoginView();
		}
	}

	protected createRenderRoot(): HTMLElement | DocumentFragment {
		return this;
	}

	private async checkAuthenticationStatus(): Promise<void> {
		try {
			if (this.scrybble.storage.access_token) {
				this.isLoading = true;
				this.userInfo = await this.scrybble.api.fetchGetUser();
			}
		} catch (error) {
			console.error('Failed to check authentication status:', error);
			this.isAuthenticated = false;
			this.userInfo = null;
		} finally {
			this.isLoading = false;
		}
	}

	private async startOAuthFlow(): Promise<void> {
		try {
			this.isLoggingIn = true;
			this.loginError = null;

			this.scrybble.api.fetchInitiateOAuthPKCE();
			this.scrybble.setOnOAuthCompletedCallback(this.onOAuthCompleted.bind(this));
		} catch (error) {
			console.error('OAuth flow error:', error);
			this.loginError = 'Failed to start login process. Please try again.';
			this.isLoggingIn = false;
		}
	}

	private async onOAuthCompleted(): Promise<void> {
		try {
			this.isLoading = true;
			const user = await this.scrybble.api.fetchGetUser();
			this.scrybble.user = user;
			this.userInfo = user;
			this.isAuthenticated = true;
			this.isLoggingIn = false;
			this.loginError = null;
		} catch (error) {
			console.error('Failed to fetch user info after OAuth:', error);
			this.loginError = 'Authentication completed but failed to fetch user information.';
			this.isLoggingIn = false;
		} finally {
			this.isLoading = false;
		}
	}

	private formatDate(dateString: string): string {
		try {
			return new Date(dateString).toLocaleDateString();
		} catch {
			return 'Unknown';
		}
	}

	private renderLoginView(): TemplateResult {
		return html`
			<div class="account-container">
				<div class="account-card">
					<div class="account-header">
						<div class="account-icon">
							${getIcon("key-round")}
						</div>
						<h2>Connect to Scrybble</h2>
						<p>Sign in to sync your ReMarkable highlights with Obsidian</p>
					</div>

					${this.loginError ? html`
						<div class="account-error">
							<div class="error-icon">
								${getIcon("alert-circle")}
							</div>
							<span>${this.loginError}</span>
						</div>
					` : ''}

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
			</div>
		`;
	}

	private formatGumroadSubscriptionManageUrl() {
		return `https://gumroad.com/subscriptions/${this.userInfo!.subscription_status.licenseInformation?.subscription_id}/manage`;
	}

	private renderAuthenticatedView(): TemplateResult {
		const {userInfo} = this;

		return html`
			<div class="account-container">
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
									<span>Subscription <a href="${this.formatGumroadSubscriptionManageUrl()}">Manage</a></span>
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
			</div>
		`;
	}
}
