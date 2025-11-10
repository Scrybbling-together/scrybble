import {html, nothing, TemplateResult} from "lit-html";
import {LitElement} from "lit-element";
import {property, state} from "lit-element/decorators.js";
import {OnboardingState, ScrybbleCommon} from "../../../@types/scrybble";
import {consume} from "@lit/context";
import {scrybbleContext} from "../scrybbleContext";
import {ErrorMessage, Errors} from "../../errorHandling/Errors";

export class ScrybbleOnboarding extends LitElement {
	@consume({context: scrybbleContext})
	@property({type: Object, attribute: false})
	scrybble!: ScrybbleCommon;

	@property({type: String})
	onboardingReady!: () => {};

	@state()
	private error: ErrorMessage | null = null;

	@state()
	private isLoading: boolean = false;

	@state()
	private license: string = '';

	@state()
	private oneTimeCode: string = '';

	@state()
	private feedback: string = '';

	get onboardingState() {
		return this.scrybble.authentication.user!.onboarding_state;
	}

	set onboardingState(state: OnboardingState) {
		this.scrybble.authentication.user!.onboarding_state = state;
	}

	resetFeedbackAndErrors() {
		if (this.error) {
			this.error = null;
		}
		if (this.feedback) {
			this.feedback = '';
		}
	}

	render(): TemplateResult | typeof nothing {
		if (!this.onboardingState) {
			return html`
				<div class="loading-container">Loading onboarding...</div>`;
		}

		let view: TemplateResult;

		switch (this.onboardingState) {
			case "setup-gumroad":
				view = this.renderGumroadLicense();
				break;

			case "setup-one-time-code":
				view = this.renderOneTimeCode(true);
				break;

			case "setup-one-time-code-again":
				view = this.renderOneTimeCode(false);
				break;

			case "ready":
				view = this.renderReadyState();
				break;

			default:
				view = html`
					<div>Unknown onboarding state: ${this.onboardingState}</div>`;
		}

		return html`
			<div class="account-container">
				${this.feedback ? html`
					<div class="account-error">
						<span class="error-icon">⚠️</span>
						${this.feedback}
					</div>
				` : ''}
				<sc-error-view .error=${this.error}></sc-error-view>
				 
				${view}
			</div>`
	}

	protected createRenderRoot(): HTMLElement | DocumentFragment {
		return this;
	}

	private async handleStateChange(): Promise<void> {
		try {
			this.onboardingState = await this.scrybble.api.fetchOnboardingState()
			if (this.onboardingState === "ready") {
				this.onboardingReady();
			}
		} catch (e) {
			this.error = Errors.handle("GENERAL_ERROR", e as Error);
		}
	}

	private async handleLicenseSubmit(e: Event): Promise<void> {
		e.preventDefault();

		if (!this.license.trim()) {
			this.feedback = "Please enter your license key";
			return;
		}

		this.isLoading = true;
		this.error = null;

		try {
			const response = await this.scrybble.api.sendGumroadLicense(this.license.trim());
			if ("error" in response) {
				if (response.error.includes("not found")) {
					this.feedback = response.error;
				} else {
					this.error = Errors.handle("GENERAL_ERROR", new Error(response.error));
				}
			} else {
				// Success - response contains newState
				this.onboardingState = response.newState;
				await this.handleStateChange();
			}
		} catch (e) {
			this.error = Errors.handle("GENERAL_ERROR", new Error("Failed to submit license"));
		} finally {
			this.isLoading = false;
		}
	}

	private async handleOneTimeCodeSubmit(e: Event): Promise<void> {
		e.preventDefault();

		if (!this.oneTimeCode.trim()) {
			this.feedback = "Please enter your one-time code";
			return;
		}

		if (this.oneTimeCode.length !== 8) {
			this.feedback = "Code must be exactly 8 characters";
			return;
		}

		if (!/^[a-z]{8}$/.test(this.oneTimeCode)) {
			this.feedback = "Code must contain only lowercase letters";
			return;
		}

		this.isLoading = true;
		this.resetFeedbackAndErrors();

		try {
			const response = await this.scrybble.api.sendOneTimeCode(this.oneTimeCode.trim());

			if ('error' in response) {
				this.error = Errors.handle("GENERAL_ERROR", new Error(response.error));
			} else {
				this.onboardingState = response.newState;
				await this.handleStateChange();
			}
		} catch (e) {
			this.error = Errors.handle("GENERAL_ERROR", new Error(e instanceof Error ? e.message : "Failed to submit code"));
		} finally {
			this.isLoading = false;
		}
	}

	private handleLicenseInputChange(e: Event): void {
		const target = e.target as HTMLInputElement;
		this.license = target.value;
		this.resetFeedbackAndErrors()
	}

	private handleCodeInputChange(e: Event): void {
		const target = e.target as HTMLInputElement;
		this.oneTimeCode = target.value.toLowerCase();
		this.resetFeedbackAndErrors()
	}

	private renderGumroadLicense(): TemplateResult {
		return html`
			<div class="account-card">
				<div class="account-header">
					<h2>Connect your gumroad license
						<span class="onboarding-step-indicator">(step 1/2)</span>
					</h2>
					<p>Enter your license key to get started with Scrybble</p>
				</div>

				<form @submit="${this.handleLicenseSubmit}" class="onboarding-form">
					<div class="onboarding-input-group">
						<input
							type="text"
							class="onboarding-input ${this.feedback ? 'input-error' : ''}"
							required
							placeholder="Your license key"
							.value="${this.license}"
							@input="${this.handleLicenseInputChange}"
							?disabled="${this.isLoading}"
						/>
						<button
							class="primary-button"
							type="submit"
							?disabled="${this.isLoading || !this.license.trim()}"
						>
							${this.isLoading ? 'Submitting...' : 'Submit'}
						</button>
					</div>
				</form>

				<div class="onboarding-divider"></div>

				<div class="onboarding-help">
					<a
						href="https://streamsoft.gumroad.com/l/remarkable-to-obsidian"
						class="onboarding-link"
						target="_blank"
					>
						Don't have a license? Try scrybble for free
					</a>
					<p class="onboarding-help-text">The first month is on us. You can cancel at any time.</p>
				</div>
			</div>
		`;
	}

	private renderOneTimeCode(firstTime: boolean): TemplateResult {
		return html`
			<div class="account-card">
				<div class="account-header">
					<h2>Connect with reMarkable
						${firstTime ? html`<span class="onboarding-step-indicator">(step 2/2)</span>` : ''}
					</h2>
					<p>Authenticate with your reMarkable device</p>
				</div>

				${!firstTime ? html`
					<div class="account-error">
						<span class="error-icon">⚠️</span>
						Your authentication token has expired, please log in with reMarkable again
					</div>
				` : ''}

				<div class="onboarding-instructions">
					<p>
						Retrieve your
						<a
							target="_blank"
							href="https://my.remarkable.com/device/desktop/connect"
							class="onboarding-link"
						>
							one-time-code
						</a>
						and fill it in below
					</p>

					<div class="onboarding-note">
						<strong>Note:</strong> connecting ${firstTime ? 'for the first time ' : ''}may take
						<em>well over a minute!</em>
					</div>
				</div>

				<form @submit="${this.handleOneTimeCodeSubmit}" class="onboarding-form">
					<div class="onboarding-input-group">
						<input
							class="onboarding-input onboarding-code-input ${this.feedback ? 'input-error' : ''}"
							required
							minlength="8"
							maxlength="8"
							pattern="[a-z]{8}"
							placeholder="aabbccdd"
							type="text"
							autofocus
							.value="${this.oneTimeCode}"
							@input="${this.handleCodeInputChange}"
							?disabled="${this.isLoading}"
						/>
						<button
							class="primary-button"
							type="submit"
							?disabled="${this.isLoading || this.oneTimeCode.length !== 8}"
						>
							${this.isLoading ? html`
								<span class="onboarding-spinner"></span>
								Checking code...
							` : 'Submit'}
						</button>
					</div>
				</form>
			</div>
		`;
	}

	private renderReadyState(): TemplateResult {
		return html`
			<div class="account-card">
				<div class="onboarding-completion">
					<div class="completion-icon">
						<div class="success-checkmark">✓</div>
					</div>

					<div class="completion-content">
						<h2>Setup complete</h2>
						<p>Your Scrybble connection is ready. You can now browse your reMarkable files and sync them
							to Obsidian.</p>

						<div class="next-steps">
							<div class="step-hint">
								<span class="hint-icon">→</span>
								<span>Browse your files using the <strong>Files</strong> tab above</span>
							</div>
						</div>
					</div>
				</div>
			</div>
		`;
	}
}
