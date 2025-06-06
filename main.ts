import {Plugin, requestUrl, WorkspaceLeaf} from 'obsidian';
import {
	AuthenticateWithGumroadLicenseResponse,
	DeviceCodeResponse,
	DeviceTokenResponse,
	FeedbackFormDetails,
	OneTimeCodeResponse,
	PaginatedResponse,
	RMFileTree,
	ScrybbleApi,
	ScrybblePersistentStorage,
	ScrybbleSettings,
	ScrybbleUser,
	SyncDelta,
	SyncFile
} from "./@types/scrybble";
import {Settings} from "./src/settings";
import {SCRYBBLE_VIEW, ScrybbleView} from "./src/ScrybbleView";
import loadLitComponents from "./src/ui/loadComponents";
import {SyncQueue} from "./src/SyncQueue";
import {Authentication} from "./src/Authentication";
import {SettingsImpl} from "./src/SettingsImpl";
import {pino} from "./src/errorHandling/logging";

// only needs to happen once, ever.
loadLitComponents()

export default class Scrybble extends Plugin implements ScrybbleApi, ScrybblePersistentStorage {
	// @ts-ignore -- onload acts as a constructor.
	public settings: ScrybbleSettings;
	public syncQueue: SyncQueue;
	public authentication: Authentication;

	get access_token(): string | null {
		return this.settings.access_token ?? null;
	}

	get refresh_token(): string | null {
		return this.settings.refresh_token ?? null;
	}

	async onload() {
		pino.info("Loading Scrybble plugin")
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
				this.settings.sync_state[job.filename] = job.sync_id
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
			name: "Open the Scrybble UI",
			callback: this.showScrybbleFiletree.bind(this)
		})

		this.app.workspace.onLayoutReady(this.checkAccountStatus.bind(this));
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

	async sync() {
		const latestSyncState = await this.fetchSyncDelta()
		const settings = this.settings

		for (const {filename, id, download_url} of latestSyncState) {
			// there is an update to a file iff
			// 1. it is not in the sync state OR
			// 2. the id remote is higher than the id locally
			if (!(filename in settings.sync_state) || settings.sync_state[filename] < id) {
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
		return response.json
	}

	async fetchPaginatedSyncHistory(page: number = 1): Promise<PaginatedResponse<SyncFile>> {
		const response = await this.authenticatedRequest(`${this.settings.endpoint}/api/sync/inspect-sync?paginated=true&page=${page}`, {
			method: "GET",
			headers: {
				"Content-Type": "application/json"
			}
		});

		return response.json;
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

	async fetchRequestFileToBeSynced(filePath: string): Promise<{ sync_id: number; filename: string; }> {
		const response = await this.authenticatedRequest(`${this.settings.endpoint}/api/sync/file`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"accept": "application/json",
			},
			body: JSON.stringify({
				file: filePath
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

	public async fetchOAuthAccessToken(code: string, codeVerifier: string) {
		const response = await requestUrl({
			url: `${this.settings.endpoint}/oauth/token`,
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Accept': 'application/json'
			},
			body: JSON.stringify({
				grant_type: 'authorization_code',
				client_id: 2,
				code: code,
				redirect_uri: 'obsidian://scrybble-oauth',
				code_verifier: codeVerifier
			})
		});

		if (response.status !== 200) {
			throw new Error(`Token exchange failed: ${response.status}`);
		}

		return response.json;
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
				client_id: '01972250-9214-7159-ae68-45a841b071e4', // Your device client ID
				scope: '', // Adjust scopes as needed
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
				client_id: '01972250-9214-7159-ae68-45a841b071e4', // Your device client ID
				device_code: deviceCode,
				client_secret: "ci3rL0u7S4pl2fgGQMELEWXYKKbWdnBz3P9D2q9A"
			}).toString(),
			throw: false
		});

		return response.json;
	}

	public async fetchRefreshOAuthAccessToken(): Promise<{ access_token: string, refresh_token: string }> {
		pino.info(`Sending request for a refresh token with ${this.refresh_token}`);
		const formData = new URLSearchParams({
			grant_type: 'refresh_token',
			client_id: '2',
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
			body: JSON.stringify({license})
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

	private async checkAccountStatus() {
		await this.authentication.initializeAuth();
		if (this.authentication.isAuthenticated()) {
			await this.sync();
		}
	}
}

