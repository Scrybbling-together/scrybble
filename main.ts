import {Notice, Plugin, requestUrl, WorkspaceLeaf} from 'obsidian';
import {synchronize} from "./src/sync";
import {Host, RMFileTree, ScrybbleSettings, SyncDelta} from "./@types/scrybble";
import {DEFAULT_SETTINGS, Settings} from "./src/settings";
import {SCRYBBLE_FILETREE, ScrybbleFileTree} from "./src/ScrybbleFileTree";
import loadLitComponents from "./src/Components/loadComponents";

// only needs to happen once, ever.
loadLitComponents()

export default class Scrybble extends Plugin {
	// @ts-ignore -- onload acts as a constructor.
	public settings: ScrybbleSettings;

	async onload() {

		this.settings = await this.loadSettings()
		this.addSettingTab(new Settings(this.app, this));

		this.registerView(SCRYBBLE_FILETREE,
			(leaf) => {
				return new ScrybbleFileTree(leaf, this);
			})

		const syncHistory = this.addStatusBarItem();
		syncHistory.addClass("mod-clickable");
		syncHistory.setText("Scrybble");
		syncHistory.onClickEvent(() => {
			this.showScrybbleFiletree()
		});

		this.app.workspace.onLayoutReady(this.sync.bind(this));
	}

	async showScrybbleFiletree() {
		const { workspace } = this.app;

		let leaf: WorkspaceLeaf | null = null;
		const leaves = workspace.getLeavesOfType(SCRYBBLE_FILETREE);

		if (leaves.length > 0) {
			// A leaf with our view already exists, use that
			leaf = leaves[0];
		} else {
			// Our view could not be found in the workspace, create a new leaf
			// in the right sidebar for it
			leaf = workspace.getRightLeaf(false);
			await leaf.setViewState({ type: SCRYBBLE_FILETREE, active: true });
		}

		// "Reveal" the leaf in case it is in a collapsed sidebar
		workspace.revealLeaf(leaf);
	}

	async sync() {
		const token = this.access_token;
		const settings = await this.loadSettings();

		if (token !== null) {
			try {
				const json = await this.fetchSyncDelta();

				for await (const new_last_sync_id of synchronize(json, settings.last_successful_sync_id, settings.sync_folder)) {
					this.settings.last_successful_sync_id = new_last_sync_id;
					this.saveSettings();
				}
			} catch (e) {
				new Notice("Scrybble: Failed to synchronize. Are you logged in?");
				console.error(e);
				return;
			}
		}
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
		return this.settings as ScrybbleSettings;
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	get access_token(): string | null {
		return localStorage.getItem('scrybble_access_token');
	}

	get base_url(): string {
		return this.getHost().endpoint;
	}

	async fetchSyncDelta(): Promise<ReadonlyArray<SyncDelta>> {
		const response = await requestUrl({
			url: `${this.base_url}/api/sync/delta`,
			method: "GET",
			headers: {
				"Accept": "application/json",
				"Authorization": `Bearer ${this.access_token}`
			}
		})
		return response.json
	}

	async fetchFileTree(path: string="/"): Promise<RMFileTree> {
		const response = await requestUrl({
			url: `${this.base_url}/api/sync/RMFileTree`,
			method: "POST",
			headers: {
				"Accept": "application/json",
				"Authorization": `Bearer ${this.access_token}`,
				"Content-Type": "application/json"
			},
			body: JSON.stringify({ path })
		})

		return response.json
	}

	async fetchOnboardingState(): Promise<"unauthenticated" | "setup-gumroad" | "setup-one-time-code" | "setup-one-time-code-again" | "ready"> {
		const response = await requestUrl({
			url: `${this.base_url}/api/sync/onboardingState`,
			method: "GET",
			headers: {
				"accept": "application/json",
				"Authorization": `Bearer ${this.access_token}`
			}
		});

		return response.json
	}

	async fetchOAuthToken(username: string, password: string): Promise<{
		access_token: string
	}> {
		const client_secret = this.getHost().client_secret;
		const response = await requestUrl({
			url: `${this.base_url}/oauth/token`,
			method: "POST",
			headers: {
				"Accept": "application/json, text/plain, */*",
				"Content-Type": "application/json"
			},
			body: JSON.stringify({
				"grant_type": "password",
				"client_id": "1",
				"client_secret": client_secret,
				"username": username,
				"password": password,
				"scope": ""
			})
		})
		return response.json
	}

	getHost(): Host {
		if (this.settings.self_hosted) {
			return this.settings.custom_host;
		} else {
			return {
				endpoint: "https://scrybble.ink",
				client_secret: "4L2wSQjPFAbGQFs6nfQkxxdNPBkWdfe86CIOxGlc"
			};
		}
	}
}

