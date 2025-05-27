import {LitElement} from "lit-element";
import {html} from "lit-html";
import {getIcon} from "obsidian";
import {retrieveScrybbleLogs} from "../../errorHandling/LocalStorageTransport";
import {consume} from "@lit/context";
import {scrybbleContext} from "../scrybbleContext";
import {property} from "lit-element/decorators.js";
import {ScrybbleCommon} from "../../../@types/scrybble";

export class SupportPage extends LitElement {
	@consume({context: scrybbleContext})
	@property({type: Object, attribute: false})
	scrybble!: ScrybbleCommon;

	render() {
		return html`
			<div class="inner-container">
				<div class="scrybble-header">
					<h3>Scrybble Support</h3>
				</div>

				<!-- Contact Section -->
				<div class="contact-section">
					<h4>Get Help</h4>
					<p><strong>${getIcon("mail")} Email</strong> <a
						href="mailto:mail@scrybble.ink">mail@scrybble.ink</a></p>
					<p><strong>${getIcon("message-circle")} Discord</strong> <a
						href="https://discord.gg/zPrAUzNuSN" target="_blank">Join our community</a> - other users can help too!</p>
				</div>

				<!-- Bug Report Template -->
				<div class="section">
					<h4>Bug Report Template</h4>
					<p>Copy this template when emailing us:</p>
					<textarea
						class="template-textarea"
						readonly
						.value=${this.getBugReportTemplate()}
					></textarea>
					<button
						class="button button-secondary copy-button"
						@click=${this.copyTemplate}
					>
						Copy Template
					</button>
				</div>

				<!-- View Logs Section -->
				<div class="section">
					<h4>View Error Logs</h4>
					<p>Before reporting issues, check what's happening:</p>
					<button class="button" @click=${this.showLogs}>
						Show Logs
					</button>
					<div class="logs-container" id="logs-container"></div>
				</div>
			</div>
		`;
	}

	protected createRenderRoot(): HTMLElement | DocumentFragment {
		return this;
	}

	private showLogs() {
		const container = this.querySelector('#logs-container');
		if (!container) return;

		container.innerHTML = `
			<div class="logs-display">${JSON.stringify(retrieveScrybbleLogs(), null, 2)}</div>
		`;
	}

	private copyTemplate() {
		const template = this.getBugReportTemplate();
		navigator.clipboard.writeText(template).then(() => {
			// Quick feedback
			const button = this.querySelector('.copy-button') as HTMLButtonElement;
			if (button) {
				const originalText = button.textContent;
				button.textContent = 'Copied!';
				button.classList.add('copy-success');
				setTimeout(() => {
					button.textContent = originalText;
					button.classList.remove('copy-success');
				}, 2000);
			}
		});
	}

	private getBugReportTemplate(): string {
		return `Subject: Scrybble issue

**What happened:**
[Describe the issue]

**Steps to reproduce:**
1. 
2. 
3. 

**Expected behavior:**
[What should have happened]

**Environment:**
- Obsidian version: ${this.scrybble.meta.obsidianVersion}
- Scrybble version: ${this.scrybble.meta.scrybbleVersion}
- Platform: ${this.scrybble.meta.platformInfo}

**Error logs:**
[Attach the error logs above to the e-mail if possible]

**Additional context:**
[Any other relevant information]`;
	}
}
