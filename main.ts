import {Plugin, requestUrl, WorkspaceLeaf} from 'obsidian';
import {
	AuthenticateWithGumroadLicenseResponse,
	DeviceCodeResponse,
	DeviceTokenResponse,
	FeedbackFormDetails,
	OneTimeCodeResponse,
	RMFileTree,
	ScrybbleApi,
	ScrybblePersistentStorage,
	ScrybbleSettings,
	ScrybbleUser,
	SyncDelta,
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
			await leaf?.setViewState({type: SCRYBBLE_VIEW, active: true});
		}

		// "Reveal" the leaf in case it is in a collapsed sidebar
		if (leaf instanceof WorkspaceLeaf) {
			await workspace.revealLeaf(leaf);
		}
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

		console.log(latestSyncState)
		console.log(settings)
		for (const {filename, id, download_url} of latestSyncState) {
			// there is an update to a file iff
			// 1. it is not in the sync state OR
			// 2. the id remote is higher than the id locally
			const file_not_synced_locally = !(filename in settings.sync_state);
			const file_has_update = settings.sync_state[filename] < id;
			if (file_not_synced_locally || file_has_update) {
				console.log(`File ${filename}#${id} needs to be synced.`);
				console.log(`Do we have it locally? ${!file_not_synced_locally}`);
				if (file_has_update) {
					console.log(`The old file version was ${settings.sync_state[filename]}, and the new one is ${id}`);
				}

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

	private async checkAccountStatus() {
		await this.authentication.initializeAuth();
		if (this.authentication.isAuthenticated()) {
			await this.sync();
		}
	}
}

