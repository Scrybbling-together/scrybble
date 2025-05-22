import {Plugin, requestUrl, WorkspaceLeaf} from 'obsidian';
import {Host, PaginatedResponse, RMFileTree, ScrybbleSettings, SyncDelta, SyncItem} from "./@types/scrybble";
import {DEFAULT_SETTINGS, Settings} from "./src/settings";
import {SCRYBBLE_VIEW, ScrybbleView} from "./src/ScrybbleView";
import loadLitComponents from "./src/Components/loadComponents";
import {SyncQueue} from "./src/SyncQueue";

// only needs to happen once, ever.
loadLitComponents()

export default class Scrybble extends Plugin {
	// @ts-ignore -- onload acts as a constructor.
	public settings: ScrybbleSettings;
	private syncQueue: SyncQueue;

	get access_token(): string | null {
		return localStorage.getItem('scrybble_access_token');
	}

	get base_url(): string {
		return this.getHost().endpoint;
	}

	async onload() {
		this.settings = await this.loadSettings()


		this.syncQueue = new SyncQueue(this,
			function onStartDownloadFile(job) {},
			 (job) => {
				 this.settings.sync_state[job.filename] = job.sync_id
				 this.saveSettings()
			}
		);

		this.addSettingTab(new Settings(this.app, this));
		this.registerView(SCRYBBLE_VIEW,
			(leaf) => {
				return new ScrybbleView(leaf, this);
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
		const {workspace} = this.app;

		let leaf: WorkspaceLeaf | null = null;
		const leaves = workspace.getLeavesOfType(SCRYBBLE_VIEW);

		if (leaves.length > 0) {
			// A leaf with our view already exists, use that
			leaf = leaves[0];
		} else {
			// Our view could not be found in the workspace, create a new leaf
			// in the right sidebar for it
			leaf = workspace.getRightLeaf(false);
			await leaf.setViewState({type: SCRYBBLE_VIEW, active: true});
		}

		// "Reveal" the leaf in case it is in a collapsed sidebar
		workspace.revealLeaf(leaf);
	}

	async sync() {
		const latestSyncState = await this.fetchSyncDelta()
		const settings = this.settings

		for (const {filename, id, download_url} of latestSyncState) {
			// there is an update to a file iff
			// 1. it is not in the sync state OR
			// 2. the id remote is higher than the id locally
			if (!(filename in settings.sync_state) || settings.sync_state[filename] < id) {
				console.log(`downloading file ${filename} with id ${id}`)
				await this.syncQueue.downloadProcessedFile(filename, download_url, id)
			}
		}
	}

	async requestFileToBeSynced(filename: string) {
		this.syncQueue.requestSync(filename)
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
		return this.settings as ScrybbleSettings;
	}

	async saveSettings() {
		await this.saveData(this.settings);
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

	async fetchPaginatedSyncHistory(page: number = 1): Promise<PaginatedResponse<SyncItem>> {
		const response = await requestUrl({
			url: `${this.base_url}/api/sync/inspect-sync?paginated=true&page=${page}`,
			method: "GET",
			headers: {
				"Authorization": `Bearer ${this.access_token}`,
				"Content-Type": "application/json"
			}
		});

		return response.json;
	}

	async fetchFileTree(path: string = "/"): Promise<RMFileTree> {
		const response = await requestUrl({
			url: `${this.base_url}/api/sync/RMFileTree`,
			method: "POST",
			headers: {
				"Accept": "application/json",
				"Authorization": `Bearer ${this.access_token}`,
				"Content-Type": "application/json"
			},
			body: JSON.stringify({path})
		})
		return response.json
	}

	async fetchSyncState(sync_id: number) {
		const response = await requestUrl({
			url: `${this.base_url}/api/sync/status`,
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"accept": "application/json",
				"Authorization": `Bearer ${this.access_token}`
			},
			body: JSON.stringify({ sync_id })
		});

		return response.json
	}

	async fetchRequestFileToBeSynced(filePath: string): Promise<{ sync_id: number; filename: string; }> {
		const response = await requestUrl({
			url: `${this.base_url}/api/sync/file`,
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"accept": "application/json",
				"Authorization": `Bearer ${this.access_token}`
			},
			body: JSON.stringify({
				file: filePath
			})
		});

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

