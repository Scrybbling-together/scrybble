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

	@state()
	private copySuccess = false;

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

			case AuthStates.REQUESTING_DEVICE_CODE:
				return this.renderLoadingView("Preparing authentication...");

			case AuthStates.WAITING_FOR_USER_AUTHORIZATION:
			case AuthStates.POLLING_FOR_TOKEN:
				return this.renderDeviceAuthorizationView();

			case AuthStates.FETCHING_USER:
				return this.renderLoadingView("Fetching user information...");

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
	private async startDeviceFlow(): Promise<void> {
		pino.info("Starting Device Authorization flow");

		try {
			this.error = null;
			await this.scrybble.authentication.initiateDeviceFlow(this.scrybble.settings);
		} catch (error) {
			this.error = Errors.handle("DEVICE_AUTH_INITIATION_ERROR", error as Error);
		}
	}

	private async handleLogout(): Promise<void> {
		await this.scrybble.authentication.logout();
	}

	private async handleErrorRetry(): Promise<void> {
		pino.info("Retrying after error");
		this.error = null;
	}

	private async copyUserCode(): Promise<void> {
		const success = await this.scrybble.authentication.copyUserCodeToClipboard();
		if (success) {
			this.copySuccess = true;
			setTimeout(() => {
				this.copySuccess = false;
				this.requestUpdate();
			}, 2000);
			this.requestUpdate();
		}
	}

	private openVerificationUrl(): void {
		this.scrybble.authentication.openVerificationUrl();
	}

	private async cancelDeviceFlow(): Promise<void> {
		await this.scrybble.authentication.cancelDeviceFlow();
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

	private renderDeviceAuthorizationView(): TemplateResult {
		const deviceAuth = this.scrybble.authentication.deviceAuth;
		if (!deviceAuth) {
			return this.renderLoadingView("Loading authorization...");
		}

		const isPolling = this.authState === AuthStates.POLLING_FOR_TOKEN;

		return html`
        <div class="account-card">
            <div class="device-auth-header">
                <div class="auth-icon">
                    ${getIcon("smartphone")}
                </div>
                <h2>Complete Authorization</h2>
                <p>To connect your Scrybble account, follow these steps:</p>
            </div>

            <div class="device-auth-steps">
                <div class="step ${isPolling ? 'step-completed' : ''}">
                    <div class="step-number">1</div>
                    <div class="step-content">
                        <h3>Open the authorization page</h3>
                        <p>Click the button below to open the authorization page in your browser:</p>
                        <button 
                            class="verification-url-button" 
                            @click="${this.openVerificationUrl}">
                            <div class="button-icon">${getIcon("external-link")}</div>
                            <span>Open Authorization Page</span>
                        </button>
                        <div class="url-display">
                            <code>${deviceAuth.verification_uri}</code>
                        </div>
                    </div>
                </div>

                <div class="step ${isPolling ? 'step-completed' : ''}">
                    <div class="step-number">2</div>
                    <div class="step-content">
                        <h3>Enter the verification code</h3>
                        <p>On the authorization page, enter this code:</p>
                        <div class="code-display">
                            <div class="user-code">
                                <code>${deviceAuth.user_code}</code>
                                <button 
                                    class="copy-code-button ${this.copySuccess ? 'success' : ''}"
                                    @click="${this.copyUserCode}"
                                    title="Copy verification code">
                                    ${this.copySuccess ?
			html`<div class="button-icon">${getIcon("check")}</div><span>Copied!</span>` :
			html`<div class="button-icon">${getIcon("copy")}</div><span>Copy Code</span>`
		}
                                </button>
                            </div>
                            <p class="code-hint">This code expires in ${Math.floor(deviceAuth.expires_in / 60)} minutes</p>
                        </div>
                    </div>
                </div>

                <div class="step ${isPolling ? 'step-active' : ''}">
                    <div class="step-number">
                        ${isPolling ? html`<div class="step-spinner">${getIcon("loader-2")}</div>` : '3'}
                    </div>
                    <div class="step-content">
                        <h3>${isPolling ? 'Waiting for authorization...' : 'Return here'}</h3>
                        ${isPolling ?
			html`
                                <p>Please complete the authorization process in your browser.</p>
                                <div class="polling-status">
                                    <p>This window will update automatically once authorization is complete.</p>
                                </div>
                            ` :
			html`<p>After authorizing in your browser, this page will automatically update. Keep this window open!</p>`
		}
                    </div>
                </div>
            </div>

            <div class="device-auth-actions">
                <button 
                    class="cancel-button" 
                    @click="${this.cancelDeviceFlow}">
                    <div class="button-icon">${getIcon("x")}</div>
                    <span>Cancel</span>
                </button>
            </div>

            <div class="device-auth-help">
                <details>
                    <summary>Need help?</summary>
                    <div class="help-content">
                        <p><strong>The authorization page didn't open?</strong></p>
                        <p>Manually go to: <code>${deviceAuth.verification_uri}</code></p>
                        
                        <p><strong>Having trouble copying the code?</strong></p>
                        <p>Manually type: <strong>${deviceAuth.user_code}</strong></p>
                        
                        <p><strong>Code not working?</strong></p>
                        <p>Make sure you're logged into the correct Scrybble account in your browser.</p>
                    </div>
                </details>
            </div>
        </div>
    `;
	}
	private renderPollingView(): TemplateResult {
		const deviceAuth = this.scrybble.authentication.deviceAuth;

		return html`
			<div class="account-card">
				<div class="polling-container">
					<div class="spinner">
						${getIcon("loader-2")}
					</div>
					<h3>Waiting for authorization</h3>
					<p>Please complete the authorization process in your browser.</p>
					
					${deviceAuth ? html`
						<div class="polling-reminder">
							<p>If you haven't already, please:</p>
							<ol>
								<li>Go to <strong>${deviceAuth.verification_uri}</strong></li>
								<li>Enter code: <strong>${deviceAuth.user_code}</strong></li>
								<li>Authorize the application</li>
							</ol>
						</div>
					` : nothing}

					<div class="polling-actions">
						<button 
							class="secondary-button" 
							@click="${this.cancelDeviceFlow}">
							Cancel
						</button>
					</div>

					<p class="polling-hint">This window will update automatically once authorization is complete.</p>
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
						@click="${this.startDeviceFlow}">
						<div class="button-icon">
							${getIcon("log-in")}
						</div>
						<span>Sign in with Scrybble</span>
					</button>
				</div>

				<div class="account-help">
					<h3>How it works:</h3>
					<ol>
						<li>Click "Sign in with Scrybble" above</li>
						<li>A browser window will open with an authorization page</li>
						<li>Enter the verification code shown in Obsidian</li>
						<li>Return to Obsidian - you'll be automatically signed in!</li>
					</ol>
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
