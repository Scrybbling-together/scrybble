import {App, Modal, Plugin, requestUrl, Setting, WorkspaceLeaf} from 'obsidian';
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

export default class Scrybble extends Plugin implements ScrybbleApi, ScrybblePersistentStorage {
	// @ts-expect-error TS2564 -- onload acts as a constructor.
	public settings: ScrybbleSettings;
	// @ts-expect-error TS2564 -- onload acts as a constructor.
	public syncQueue: SyncQueue;
	// @ts-expect-error TS2564 -- onload acts as a constructor.
	public authentication: Authentication;

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

	onunload() {
		pino.info("Unloading Scrybble plugin");

		// Stop the sync queue interval
		this.syncQueue.stop();
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
				"Cache-Control": "no-cache",
				"Pragma": "no-cache",
				...options.headers,
				"Authorization": `Bearer ${this.access_token}`
			}
		});
	}

	/**
	 * Validate a requestUrl response before reading `.json`. Obsidian's `requestUrl`
	 * exposes `.json` as a getter that calls JSON.parse(); if the body is not JSON
	 * (an HTML login/error page, a proxy/redirect page, etc.) that throws an opaque
	 * SyntaxError ("Unexpected token '<'") deep in the auth flow. Fail with a clear,
	 * actionable error instead.
	 *
	 * `allowErrorStatus` keeps the content-type guard but tolerates a non-2xx status:
	 * the OAuth device-token poll, for example, legitimately returns 400 with a JSON
	 * `{ "error": "authorization_pending" }` body that the caller must inspect.
	 */
	private expectJson(
		response: { status: number; headers: Record<string, string>; json: any; text: string },
		context: string,
		{ allowErrorStatus = false }: { allowErrorStatus?: boolean } = {}
	): any {
		const contentType = (response.headers?.["content-type"] ?? response.headers?.["Content-Type"] ?? "").toLowerCase();
		const isJson = contentType.includes("application/json");
		if (!isJson || (!allowErrorStatus && response.status >= 400)) {
			const err = new Error(
				`${context}: the Scrybble server returned status ${response.status} ` +
				`with content-type "${contentType || "unknown"}" instead of JSON. ` +
				`If you are self-hosting, check that your server URL is correct and the server is reachable.`
			) as Error & { status: number };
			err.status = response.status;
			throw err;
		}
		return response.json;
	}

	async sync() {
		const latestSyncState = await this.fetchSyncDelta()
		const settings = this.settings

		for (const {filename, id, download_url} of latestSyncState) {
			// there is an update to a file iff
			// 1. it is not in the sync state OR
			// 2. the id remote is higher than the id locally
			const file_not_synced_locally = !(filename in settings.sync_state);
			const file_has_update = settings.sync_state[filename] < id;
			if (file_not_synced_locally || file_has_update) {
				await this.syncQueue.downloadProcessedFile(filename, download_url, id)
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
		return this.expectJson(response, "Fetching sync delta")
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
		return this.expectJson(response, "Loading file tree")
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

		return this.expectJson(response, "Fetching onboarding state")
	}

	async fetchGetUser(): Promise<ScrybbleUser> {
		const response = await this.authenticatedRequest(`${this.settings.endpoint}/api/sync/user`, {
			method: "GET",
			headers: {
				"accept": "application/json",
			}
		});

		return {...this.expectJson(response, "Fetching user")};
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

		const data = this.expectJson(response, "Requesting device code");

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

		return this.expectJson(response, "Polling for device token", { allowErrorStatus: true });
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

		return this.expectJson(response, "Refreshing access token", { allowErrorStatus: true });
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
		await this.authenticatedRequest(`${this.settings.endpoint}/api/sync/remarkable-document-share`, {
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
		}
	}
}

