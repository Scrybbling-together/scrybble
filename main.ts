import {App, Modal, Notice, Plugin, requestUrl, Setting, WorkspaceLeaf} from 'obsidian';
import {
	AuthenticateWithGumroadLicenseResponse,
	DeviceCodeResponse,
	DeviceTokenResponse,
	FeedbackFormDetails,
	OneTimeCodeResponse,
	ResetConnectionResponse,
	RMFileTree,
	ScrybbleApi,
	ScrybblePersistentStorage,
	ScrybbleSettings,
	ScrybbleUser,
	SearchFilters,
	SearchResult,
	SyncDelta,
} from "./@types/scrybble";
import {Settings} from "./src/settings";
import {SCRYBBLE_VIEW, ScrybbleView} from "./src/ScrybbleView";
import loadLitComponents from "./src/ui/loadComponents";
import {SyncQueue} from "./src/SyncQueue";
import {Authentication} from "./src/Authentication";
import {SettingsImpl} from "./src/SettingsImpl";
import {pino} from "./src/errorHandling/logging";

class InputModal extends Modal {
	private result: string = "";
	private readonly title: string;
	private readonly placeholder: string;
	private readonly onSubmit: (result: string | null) => void;

	constructor(app: App, title: string, placeholder: string, onSubmit: (result: string | null) => void) {
		super(app);
		this.title = title;
		this.placeholder = placeholder;
		this.onSubmit = onSubmit;
	}

	onOpen() {
		const {contentEl} = this;

		contentEl.createEl("h3", {text: this.title});

		new Setting(contentEl)
			.setName("Value")
			.addText((text) => {
				text
					.setPlaceholder(this.placeholder)
					.onChange((value) => {
						this.result = value;
					});
				text.inputEl.addEventListener("keydown", (e) => {
					if (e.key === "Enter") {
						this.close();
						this.onSubmit(this.result || null);
					}
				});
			});

		new Setting(contentEl)
			.addButton((btn) =>
				btn
					.setButtonText("Search")
					.setCta()
					.onClick(() => {
						this.close();
						this.onSubmit(this.result || null);
					})
			)
			.addButton((btn) =>
				btn
					.setButtonText("Cancel")
					.onClick(() => {
						this.close();
						this.onSubmit(null);
					})
			);
	}

	onClose() {
		const {contentEl} = this;
		contentEl.empty();
	}
}

const AUTO_SYNC_MAX_PER_TICK = 10;

export default class Scrybble extends Plugin implements ScrybbleApi, ScrybblePersistentStorage {
	// @ts-expect-error TS2564 -- onload acts as a constructor.
	public settings: ScrybbleSettings;
	// @ts-expect-error TS2564 -- onload acts as a constructor.
	public syncQueue: SyncQueue;
	// @ts-expect-error TS2564 -- onload acts as a constructor.
	public authentication: Authentication;

	private autoSyncTimer: number | null = null;

	get access_token(): string | null {
		return this.settings.access_token ?? null;
	}

	get refresh_token(): string | null {
		return this.settings.refresh_token ?? null;
	}

	async onload() {
		pino.info("Loading Scrybble plugin")

		// only needs to happen once, ever.
		pino.info("Loading lit components")
		loadLitComponents()

		this.settings = new SettingsImpl(await this.loadData(), async () => {
			await this.saveData(this.settings);
		});
		this.authentication = new Authentication(this.settings, this);

		this.syncQueue = new SyncQueue(
			this.settings,
			this.app.vault,
			this,
			function onStartDownloadFile(job) {
			},
			(job) => {
				this.settings.sync_state[job.filename] = job.sync_id!
				this.settings.save()
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
		syncHistory.onClickEvent(this.showScrybbleFiletree.bind(this));

		this.addCommand({
			id: "open-scrybble-pane",
			name: "Browse your reMarkable files",
			callback: this.showScrybbleFiletree.bind(this)
		})

		this.addCommand({
			id: "search-by-name",
			name: "Search files by name",
			callback: async () => {
				const query = await this.promptForInput("Enter name pattern (regex)", "e.g. .*meeting.*");
				if (query) {
					await this.openWithSearchFilters({query});
				}
			}
		})

		this.addCommand({
			id: "search-by-tag",
			name: "Search files by tag",
			callback: async () => {
				const tag = await this.promptForInput("Enter tag name", "e.g. Work");
				if (tag) {
					await this.openWithSearchFilters({tags: [tag]});
				}
			}
		})

		this.addCommand({
			id: "show-starred-files",
			name: "Show starred files",
			callback: async () => {
				await this.openWithSearchFilters({starred: true});
			}
		})

		this.app.workspace.onLayoutReady(this.checkAccountStatus.bind(this));
	}

	async showScrybbleFiletree(): Promise<WorkspaceLeaf | null> {
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
			await leaf?.setViewState({type: SCRYBBLE_VIEW, active: true});
		}

		// "Reveal" the leaf in case it is in a collapsed sidebar
		if (leaf instanceof WorkspaceLeaf) {
			await workspace.revealLeaf(leaf);
		}

		return leaf;
	}

	async authenticatedRequest(url: string, options: any = {}) {
		return requestUrl({
			...options,
			url,
			headers: {
				...options.headers,
				"Authorization": `Bearer ${this.access_token}`
			}
		});
	}

	async sync(auto: boolean = false) {
		const latestSyncState = await this.fetchSyncDelta()
		const settings = this.settings

		for (const {filename, id, download_url} of latestSyncState) {
			// there is an update to a file iff
			// 1. it is not in the sync state OR
			// 2. the id remote is higher than the id locally
			const file_not_synced_locally = !(filename in settings.sync_state);
			const file_has_update = settings.sync_state[filename] < id;
			if (file_not_synced_locally || file_has_update) {
				await this.syncQueue.downloadProcessedFile(filename, download_url, id, auto)
			}
		}
	}

	async fetchSyncDelta(): Promise<ReadonlyArray<SyncDelta>> {
		const response = await this.authenticatedRequest(`${this.settings.endpoint}/api/sync/delta`, {
			method: "GET",
			headers: {
				"Accept": "application/json",
			}
		})
		return response.json
	}

	async fetchFileTree(path: string = "/"): Promise<RMFileTree> {
		const response = await this.authenticatedRequest(`${this.settings.endpoint}/api/sync/RMFileTree`, {
			method: "POST",
			headers: {
				"Accept": "application/json",
				"Content-Type": "application/json"
			},
			body: JSON.stringify({path})
		})
		return response.json
	}

	async fetchSearchFiles(filters: SearchFilters): Promise<SearchResult> {
		const response = await this.authenticatedRequest(`${this.settings.endpoint}/api/sync/search`, {
			method: "POST",
			headers: {
				"Accept": "application/json",
				"Content-Type": "application/json"
			},
			body: JSON.stringify(filters)
		})
		return response.json
	}

	async fetchSyncState(sync_id: number) {
		const response = await this.authenticatedRequest(`${this.settings.endpoint}/api/sync/status`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"accept": "application/json",
			},
			body: JSON.stringify({sync_id})
		});

		return response.json
	}

	async fetchRequestFileToBeSynced(rmFileId: string, name: string): Promise<{ sync_id: number; filename: string; }> {
		const response = await this.authenticatedRequest(`${this.settings.endpoint}/api/sync/file`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"accept": "application/json",
			},
			body: JSON.stringify({
				rmFileId,
				name,
			})
		});

		return response.json
	}

	async fetchOnboardingState(): Promise<"unauthenticated" | "setup-gumroad" | "setup-one-time-code" | "setup-one-time-code-again" | "ready"> {
		const response = await this.authenticatedRequest(`${this.settings.endpoint}/api/sync/onboardingState`, {
			method: "GET",
			headers: {
				"accept": "application/json",
				"Authorization": `Bearer ${this.access_token}`
			}
		});

		return response.json
	}

	async fetchGetUser(): Promise<ScrybbleUser> {
		const response = await this.authenticatedRequest(`${this.settings.endpoint}/api/sync/user`, {
			method: "GET",
			headers: {
				"accept": "application/json",
			}
		});

		return {...response.json};
	}

	async fetchDeviceCode(): Promise<DeviceCodeResponse> {
		const response = await requestUrl({
			url: `${this.settings.endpoint}/oauth/device/code`,
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
				'Accept': 'application/json',
			},
			body: new URLSearchParams({
				client_id: this.settings.client_id,
				scope: '',
			}).toString(),
		});

		const data = response.json;

		// Validate response structure
		if (!data.device_code || !data.user_code || !data.verification_uri) {
			throw new Error('Invalid device code response format');
		}

		return data;
	}

	async fetchPollForDeviceToken(deviceCode: string): Promise<DeviceTokenResponse> {
		const response = await requestUrl({
			url: `${this.settings.endpoint}/oauth/token`,
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
				'Accept': 'application/json',
			},
			body: new URLSearchParams({
				grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
				client_id: this.settings.client_id,
				device_code: deviceCode,
				client_secret: this.settings.client_secret
			}).toString(),
			throw: false
		});

		return response.json;
	}

	public async fetchRefreshOAuthAccessToken(): Promise<{ access_token: string, refresh_token: string }> {
		pino.info(`Sending request for a refresh token with ${this.refresh_token}`);
		const formData = new URLSearchParams({
			grant_type: 'refresh_token',
			client_id: this.settings.client_id,
			refresh_token: this.refresh_token!,
			scope: ''
		});
		const response = await requestUrl({
			url: `${this.settings.endpoint}/oauth/token`,
			method: "POST",
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
				'Accept': 'application/json'
			},
			body: formData.toString()
		})

		return response.json;
	}

	async sendGumroadLicense(license: string): Promise<AuthenticateWithGumroadLicenseResponse> {
		const response = await this.authenticatedRequest(`${this.settings.endpoint}/api/sync/gumroadLicense`, {
			method: "POST",
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({license}),
			throw: false
		});

		return response.json;
	}

	async sendOneTimeCode(code: string): Promise<OneTimeCodeResponse> {
		const response = await this.authenticatedRequest(`${this.settings.endpoint}/api/sync/onetimecode`, {
			method: "POST",
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({code})
		});

		return response.json;
	}

	async fetchGiveFeedback(details: FeedbackFormDetails): Promise<void> {
		this.authenticatedRequest(`${this.settings.endpoint}/api/sync/remarkable-document-share`, {
			method: "POST",
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(details)
		});
	}

	async downloadSyncedDocument(downloadUrl: string): Promise<ArrayBuffer> {
		const res = await this.authenticatedRequest(downloadUrl, {
			method: "GET",
		})
		return res.arrayBuffer
	}

	async deleteRemarkableConnection(): Promise<ResetConnectionResponse> {
		const response = await this.authenticatedRequest(`${this.settings.endpoint}/api/sync/remarkable-connection`, {
			method: "DELETE",
			headers: {
				'Accept': 'application/json',
			}
		});

		return response.json;
	}

	private async promptForInput(title: string, placeholder: string): Promise<string | null> {
		return new Promise((resolve) => {
			const modal = new InputModal(this.app, title, placeholder, resolve);
			modal.open();
		});
	}

	private async openWithSearchFilters(filters: SearchFilters): Promise<void> {
		const leaf = await this.showScrybbleFiletree();
		if (!leaf) return;

		// Small delay to ensure the view is rendered
		setTimeout(() => {
			const fileTreeComponent = leaf.view.containerEl.querySelector('sc-file-tree') as any;
			if (fileTreeComponent && typeof fileTreeComponent.setSearchFilters === 'function') {
				fileTreeComponent.setSearchFilters(filters);
			}
		}, 100);
	}

	private async checkAccountStatus() {
		await this.authentication.initializeAuth();
		if (this.authentication.isAuthenticated()) {
			await this.sync();
			this.startAutoSync();
		}
	}

	startAutoSync(): void {
		this.stopAutoSync();
		if (!this.settings.self_hosted || !this.settings.auto_sync || !this.authentication.isAuthenticated()) {
			return;
		}
		const minutes = Math.max(1, this.settings.auto_sync_interval_minutes || 15);
		this.autoSyncTimer = window.setInterval(() => {
			void this.autoSyncScan();
		}, minutes * 60_000);
		this.registerInterval(this.autoSyncTimer);

		// Snapshot the existing library right away the first time it's enabled, so the
		// backlog is baselined immediately instead of after a full interval.
		if (!this.settings.auto_sync_baselined) {
			void this.autoSyncScan();
		}
	}

	stopAutoSync(): void {
		if (this.autoSyncTimer !== null) {
			window.clearInterval(this.autoSyncTimer);
			this.autoSyncTimer = null;
		}
	}

	async resetAutoSyncBaseline(): Promise<void> {
		if (!this.settings.self_hosted) {
			return;
		}
		this.settings.auto_sync_baselined = false;
		this.settings.auto_sync_seen = [];
		await this.settings.save();
		new Notice("Scrybble: auto-sync baseline reset. Your current library is the new starting point.");
		this.startAutoSync();
	}

	async syncEntireLibrary(): Promise<void> {
		if (!this.settings.self_hosted) {
			return;
		}
		if (!this.authentication.isAuthenticated()) {
			new Notice("Scrybble: sign in before syncing your library.");
			return;
		}
		new Notice("Scrybble: scanning your reMarkable library...");
		const files: { path: string; id: string }[] = [];
		await this.collectRemarkableFiles("/", new Set<string>(), files);

		const seen = new Set(this.settings.auto_sync_seen);
		let queued = 0;
		for (const f of files) {
			if (f.path in this.settings.sync_state) {
				continue;
			}
			seen.add(f.path);
			this.syncQueue.requestSync(f.id, f.path, true);
			queued += 1;
		}
		this.settings.auto_sync_seen = Array.from(seen);
		this.settings.auto_sync_baselined = true;
		await this.settings.save();
		new Notice(`Scrybble: queued ${queued} file(s) for sync.`);
	}

	private async autoSyncScan(): Promise<void> {
		if (!this.settings.self_hosted || !this.settings.auto_sync || !this.authentication.isAuthenticated()) {
			return;
		}
		try {
			const files: { path: string; id: string }[] = [];
			await this.collectRemarkableFiles("/", new Set<string>(), files);

			if (!this.settings.auto_sync_baselined) {
				const seen = new Set(this.settings.auto_sync_seen);
				for (const f of files) {
					seen.add(f.path);
				}
				this.settings.auto_sync_seen = Array.from(seen);
				const delta = await this.fetchSyncDelta();
				for (const d of delta) {
					if (!(d.filename in this.settings.sync_state)) {
						this.settings.sync_state[d.filename] = d.id;
					}
				}
				this.settings.auto_sync_baselined = true;
				await this.settings.save();
				return;
			}

			await this.sync(true);

			const seen = new Set(this.settings.auto_sync_seen);
			let requested = 0;
			for (const f of files) {
				if (requested >= AUTO_SYNC_MAX_PER_TICK) {
					break;
				}
				if (seen.has(f.path) || f.path in this.settings.sync_state) {
					continue;
				}
				seen.add(f.path);
				this.syncQueue.requestSync(f.id, f.path, true);
				requested += 1;
			}
			if (requested > 0) {
				this.settings.auto_sync_seen = Array.from(seen);
				await this.settings.save();
			}
		} catch (e) {
			pino.error(e, "Automatic sync scan failed");
		}
	}

	private async collectRemarkableFiles(path: string, visited: Set<string>, acc: { path: string; id: string }[]): Promise<void> {
		if (visited.has(path)) {
			return;
		}
		visited.add(path);

		let tree: RMFileTree;
		try {
			tree = await this.fetchFileTree(path);
		} catch (e) {
			pino.error(e, `Automatic sync could not list "${path}"`);
			return;
		}

		for (const item of tree.items) {
			if (item.type === "d") {
				await this.collectRemarkableFiles(item.path, visited, acc);
			} else if (item.type === "f" && item.id) {
				acc.push({ path: item.path, id: item.id });
			}
		}
	}
}

