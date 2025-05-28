import {ScrybbleSettings} from "../@types/scrybble";
import {App, Notice, PluginSettingTab, Setting} from "obsidian";
import Scrybble from "../main";
import {Errors} from "./errorHandling/Errors";

export const DEFAULT_SETTINGS: ScrybbleSettings = {
	sync_folder: "scrybble",
	self_hosted: false,
	custom_host: {
		endpoint: "",
		client_secret: ""
	},
	sync_state: {}
}


export class Settings extends PluginSettingTab {
	plugin: Scrybble;

	constructor(app: App, plugin: Scrybble) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.createEl("h2", {text: "Scrybble server"})

		new Setting(containerEl)
			.setName("Self hosted")
			.setDesc("Enable if you host your own Scrybble server")
			.addToggle((toggle) => {
				toggle.setValue(this.plugin.settings.self_hosted)
					.onChange((value) => {
						this.plugin.settings.self_hosted = value;
						this.plugin.saveSettings();
						this.display();
					})
			})

		if (this.plugin.settings.self_hosted) {
			new Setting(containerEl)
				.setName("Endpoint")
				.setDesc("Link to a Scrybble server, leave unchanged for the official scrybble.ink server")
				.addText((text) => text
					.setPlaceholder("http://localhost")
					.setValue(this.plugin.settings.custom_host.endpoint)
					.onChange((value) => {
						this.plugin.settings.custom_host.endpoint = value;
						this.plugin.saveSettings();
					}));


			new Setting(containerEl)
				.setName("Server client secret")
				.setDesc("Visit http://{your-host}/client-secret")
				.addText((text) => {
					text.inputEl.setAttribute('type', 'password')
					return text
						.setValue(this.plugin.settings.custom_host.client_secret)
						.onChange((value) => {
							this.plugin.settings.custom_host.client_secret = value;
							this.plugin.saveSettings();
						});
				});
		} else {
			containerEl.createEl("p", {text: "Connected to the official scrybble server, no additional configuration required."});
		}
	}
}
