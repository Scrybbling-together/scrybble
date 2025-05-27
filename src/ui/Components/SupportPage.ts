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

				<div class="section">
					<h4>Bug Report Template</h4>
					<p>Copy this template when sending a bug report:</p>
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

				<div class="section">
					<h4>View Error Logs</h4>
					<p>Before reporting issues, check what's happening:</p>
					<div class="button-group">
						<button class="button" @click=${this.showLogs}>
							Show Logs
						</button>
						<button class="button button-secondary download-logs" @click=${this.downloadLogs}>
							${getIcon("download")} Download Logs
						</button>
					</div>
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
		navigator.clipboard.writeText(template).then(() => this.showTemporaryMessage("Copied!", ".copy-button"));
	}

	private downloadLogs() {
		try {
			const logs = retrieveScrybbleLogs();
			if (!logs) {
				// Show user feedback
				this.showTemporaryMessage('No logs available to download', ".download-logs");
				return;
			}

			// Create formatted log content
			const logContent = JSON.stringify(logs, null, 2);
			const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
			const filename = `scrybble-logs-${timestamp}.json`;

			// Create and trigger download
			const blob = new Blob([logContent], { type: 'application/json' });
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = filename;
			a.style.display = 'none';
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);

			// Show success feedback
			this.showTemporaryMessage('Logs downloaded successfully', ".download-logs");
		} catch (error) {
			console.error('Error downloading logs:', error);
			this.showTemporaryMessage('Error downloading logs', ".download-logs");
		}
	}

	private showTemporaryMessage(message: string, btnClass: string) {
		const button = this.querySelector(btnClass) as HTMLButtonElement;
		if (button) {
			const originalText = button.innerHTML;
			button.innerHTML = message;
			button.disabled = true;
			setTimeout(() => {
				button.innerHTML = originalText;
				button.disabled = false;
			}, 2000);
		}
	}

	private getEnvironment(): string {
		return `- Obsidian version: ${this.scrybble.meta.obsidianVersion}
- Scrybble version: ${this.scrybble.meta.scrybbleVersion}
- Platform: ${this.scrybble.meta.platformInfo}`;
	}

	private getBugReportTemplate(): string {
		return `**What happened:**
[Describe the issue]

**Steps to reproduce:**
1. 
2. 
3. 

**Expected behavior:**
[What should have happened]

**Environment:**
${this.getEnvironment()}

**Error logs:**
[Attach the downloaded error logs to the e-mail if possible]

**Additional context:**
[Any other relevant information]`;
	}
}
