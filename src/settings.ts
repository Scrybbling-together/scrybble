import {App, PluginSettingTab, Setting} from "obsidian";
import Scrybble from "../main";

export class Settings extends PluginSettingTab {
	// @ts-expect-error TS2564
	private endpointSetting: Setting;
	// @ts-expect-error TS2564
	private clientSecretSetting: Setting;
	// @ts-expect-error TS2564
	private connectedMessage: HTMLElement;
	// @ts-expect-error TS2564
	private clientIdSetting: Setting;
	// @ts-expect-error TS2564
	private autoSyncSetting: Setting;
	// @ts-expect-error TS2564
	private autoSyncIntervalSetting: Setting;
	// @ts-expect-error TS2564
	private resetBaselineSetting: Setting;
	// @ts-expect-error TS2564
	private syncEverythingSetting: Setting;

	constructor(app: App, private readonly plugin: Scrybble) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty()
		containerEl.createEl("h2", {text: "Output"})

		new Setting(containerEl)
			.setName('Output folder')
			.setDesc(`Where your reMarkable files will be stored.
Default is "scrybble/"`)
			.addText((text) => text
				.setValue(this.plugin.settings.sync_folder)
				.setPlaceholder("scrybble/")
				.onChange(async (value) => {
					this.plugin.settings.sync_folder = value;
					await this.plugin.settings.save();
				}));

		containerEl.createEl("h2", {text: "Scrybble server"})

		new Setting(containerEl)
			.setName("Self hosted")
			.setDesc("Enable if you host your own Scrybble server")
			.addToggle((toggle) => {
				toggle.setValue(this.plugin.settings.self_hosted)
					.onChange(async (value) => {
						this.plugin.settings.self_hosted = value;
						await this.plugin.settings.save();
						this.updateVisibility();
						this.plugin.startAutoSync();
					})
			})


		this.endpointSetting = new Setting(containerEl)
			.setName("Endpoint")
			.setDesc("Link to a Scrybble server, leave unchanged for the official scrybble.ink server")
			.addText((text) => text
				.setPlaceholder("http://localhost")
				.setValue(this.plugin.settings.custom_host.endpoint)
				.onChange(async (value) => {
					this.plugin.settings.custom_host.endpoint = value;
					await this.plugin.settings.save();
					this.updateClientFieldsVisibility();
				}));

		this.clientIdSetting = new Setting(containerEl)
			.setName("Server client ID")
			.addText((text) => {
				text.inputEl.setAttribute('type', 'password')
				return text
					.setValue(this.plugin.settings.custom_host.client_id)
					.onChange(async (value) => {
						this.plugin.settings.custom_host.client_id = value;
						await this.plugin.settings.save();
					});
			})

		this.clientSecretSetting = new Setting(containerEl)
			.setName("Server client secret")
			.addText((text) => {
				text.inputEl.setAttribute('type', 'password')
				return text
					.setValue(this.plugin.settings.custom_host.client_secret)
					.onChange(async (value) => {
						this.plugin.settings.custom_host.client_secret = value;
						await this.plugin.settings.save();
					});
			});

		this.connectedMessage = containerEl.createEl("p", {
			text: "Connected to the official scrybble server, no additional configuration required."
		});

		this.autoSyncSetting = new Setting(containerEl)
			.setName("Automatic sync")
			.setDesc("Self-hosted only: periodically pull new reMarkable files into your vault automatically.")
			.addToggle((toggle) => toggle
				.setValue(this.plugin.settings.auto_sync)
				.onChange(async (value) => {
					this.plugin.settings.auto_sync = value;
					await this.plugin.settings.save();
					this.plugin.startAutoSync();
				}));

		this.autoSyncIntervalSetting = new Setting(containerEl)
			.setName("Automatic sync interval (minutes)")
			.setDesc("How often to check for new files. Minimum 1.")
			.addText((text) => text
				.setValue(String(this.plugin.settings.auto_sync_interval_minutes))
				.onChange(async (value) => {
					const n = parseInt(value, 10);
					this.plugin.settings.auto_sync_interval_minutes = Number.isFinite(n) && n >= 1 ? n : 15;
					await this.plugin.settings.save();
					this.plugin.startAutoSync();
				}));

		this.resetBaselineSetting = new Setting(containerEl)
			.setName("Reset auto-sync baseline")
			.setDesc("Forget what auto-sync has seen and re-snapshot your current library as the new starting point. Downloads nothing.")
			.addButton((btn) => btn
				.setButtonText("Reset baseline")
				.onClick(() => this.plugin.resetAutoSyncBaseline()));

		this.syncEverythingSetting = new Setting(containerEl)
			.setName("Sync entire library")
			.setDesc("Pull every reMarkable file into your vault now (one-time backfill). This can be a lot of files.")
			.addButton((btn) => btn
				.setButtonText("Sync everything")
				.setWarning()
				.onClick(() => this.plugin.syncEntireLibrary()));

		this.updateVisibility();
	}

	private updateClientFieldsDescription(): void {
		const endpoint = this.plugin.settings.custom_host.endpoint;

		if (endpoint && endpoint.trim()) {
			const setupUrl = `${endpoint.replace(/\/$/, '')}/self-host-setup`;

			this.clientIdSetting.descEl.innerHTML = `Visit <a href="${setupUrl}" class="external-link">${setupUrl}</a> to get your credentials`;
			this.clientSecretSetting.descEl.innerHTML = `Visit <a href="${setupUrl}" class="external-link">${setupUrl}</a> to get your credentials`;
		} else {
			this.clientIdSetting.descEl.textContent = "Enter the endpoint URL first";
			this.clientSecretSetting.descEl.textContent = "Enter the endpoint URL first";
		}
	}

	private updateClientFieldsVisibility(): void {
		const endpoint = this.plugin.settings.custom_host.endpoint;
		const hasValidEndpoint = endpoint && endpoint.trim() && endpoint.startsWith('http');

		this.clientIdSetting.components.forEach(component => {
			if ('inputEl' in component) {
				(component as any).inputEl.disabled = !hasValidEndpoint;
			}
		});

		this.clientSecretSetting.components.forEach(component => {
			if ('inputEl' in component) {
				(component as any).inputEl.disabled = !hasValidEndpoint;
			}
		});

		this.updateClientFieldsDescription();

		if (hasValidEndpoint) {
			this.clientIdSetting.settingEl.style.opacity = "";
			this.clientSecretSetting.settingEl.style.opacity = "";
		} else {
			this.clientIdSetting.settingEl.style.opacity = "0.5";
			this.clientSecretSetting.settingEl.style.opacity = "0.5";
		}
	}

	private updateVisibility(): void {
		if (this.plugin.settings.self_hosted) {
			this.endpointSetting.settingEl.style.display = "";
			this.clientSecretSetting.settingEl.style.display = "";
			this.clientIdSetting.settingEl.style.display = "";
			this.connectedMessage.style.display = "none";
			this.autoSyncSetting.settingEl.style.display = "";
			this.autoSyncIntervalSetting.settingEl.style.display = "";
			this.resetBaselineSetting.settingEl.style.display = "";
			this.syncEverythingSetting.settingEl.style.display = "";
			this.updateClientFieldsVisibility();
		} else {
			this.endpointSetting.settingEl.style.display = "none";
			this.clientSecretSetting.settingEl.style.display = "none";
			this.clientIdSetting.settingEl.style.display = "none";
			this.connectedMessage.style.display = "";
			this.autoSyncSetting.settingEl.style.display = "none";
			this.autoSyncIntervalSetting.settingEl.style.display = "none";
			this.resetBaselineSetting.settingEl.style.display = "none";
			this.syncEverythingSetting.settingEl.style.display = "none";
		}
	}
}
