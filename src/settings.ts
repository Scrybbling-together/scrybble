import {ScrybbleSettings} from "../@types/scrybble";
import {App, Notice, PluginSettingTab, Setting} from "obsidian";
import Scrybble from "../main";

export const DEFAULT_SETTINGS: ScrybbleSettings = {
	last_successful_sync_id: -1,
	sync_folder: "scrybble",
	self_hosted: false,
	custom_host: {
		endpoint: "",
		client_secret: ""
	},
}


export class Settings extends PluginSettingTab {
	plugin: Scrybble;

	constructor(app: App, plugin: Scrybble) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		let password = "";
		let username = "";

		containerEl.empty();
		containerEl.createEl('h1', {text: 'Sync ReMarkable notes'});

		if (this.plugin.access_token === null) {
			new Setting(containerEl)
				.setName('Login')
				.setDesc('Login details')
				.addText(text => text
					.setPlaceholder('Enter your username')
					.onChange((value) => {
						username = value;
					}))
				.addText(text => {
					text.setPlaceholder('Enter your password');
					text.inputEl.setAttribute('type', 'password');
					text.onChange((value) => {
						password = value;
					});
				})
				.addButton((button) => {
					button.setButtonText('Log in');
					button.onClick(async () => {
						try {
							const host = this.plugin.getHost();
							const {access_token} = await this.plugin.fetchOAuthToken(username, password);
							localStorage.setItem('scrybble_access_token', access_token);
							this.display();
						} catch (error) {
							new Notice("Scrybble: Failed to log in, check your username and password")
							console.error(error);
						}
					});
				});
		} else {
			new Setting(containerEl)
				.setName('Log out')
				.setDesc('You are currently logged in')
				.addButton((button) => {
					button.setButtonText('Log out');
					button.onClick(async () => {
						localStorage.removeItem('scrybble_access_token');
						this.display();
					});
				});

			new Setting(containerEl)
				.setName('Output folder')
				.setDesc('Folder where your synchronized files will be stored.')
				.addText((text) => text
					.setValue(this.plugin.settings.sync_folder)
					.onChange((value) => {
						this.plugin.settings.sync_folder = value;
						this.plugin.saveSettings();
					}));

			new Setting(containerEl)
				.setName('Manual synchronization')
				.addButton((button) => {
					button.setButtonText('Go');
					button.onClick(() => {
						this.plugin.sync();
					})
				});
		}

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
