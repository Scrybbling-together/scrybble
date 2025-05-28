import {Plugin, requestUrl, WorkspaceLeaf} from 'obsidian';
import {
	Host,
	PaginatedResponse,
	RMFileTree,
	ScrybbleApi, ScrybbleCommon, ScrybblePersistentStorage,
	ScrybbleSettings, ScrybbleUser,
	SyncDelta,
	SyncItem
} from "./@types/scrybble";
import {DEFAULT_SETTINGS, Settings} from "./src/settings";
import {SCRYBBLE_VIEW, ScrybbleView} from "./src/ScrybbleView";
import loadLitComponents from "./src/ui/Components/loadComponents";
import {SyncQueue} from "./src/SyncQueue";
import {pino} from "./src/errorHandling/logging";
import {PKCEUtils} from "./src/oauth";

class NotAuthenticatedError extends Error{}

// only needs to happen once, ever.
loadLitComponents()

export default class Scrybble extends Plugin  implements ScrybbleApi, ScrybblePersistentStorage  {
	// @ts-ignore -- onload acts as a constructor.
	public settings: ScrybbleSettings;
	public syncQueue: SyncQueue;
	public user: ScrybbleCommon['user'] = {loaded: false};
	private onOAuthCompleted: () => Promise<void>;
	private onAuthenticated: (success: boolean) => Promise<void> = async (success: boolean) => {};

	get access_token(): string | null {
		return this.settings.access_token ?? null;
	}

	get refresh_token(): string | null {
		return this.settings.refresh_token ?? null;
	}

	get base_url(): string {
		return this.getHost().endpoint;
	}

	setOnOAuthCompletedCallback(callback: () => Promise<void>) {
		this.onOAuthCompleted = callback;
	}

	setOnAuthenticatedCallback(callback: () => Promise<void>) {
		this.onAuthenticated = callback;
	}

	async onload() {
		pino.info("Loading Scrybble plugin")
		this.settings = await this.loadSettings()

		this.registerObsidianProtocolHandler(`scrybble-oauth`, async (data) => {
			const {code, state} = data
			const {refresh_token, access_token} = await this.exchangeCodeForTokens(code, state);
			localStorage.setItem('scrybble_access_token', access_token);
			localStorage.setItem('scrybble_refresh_token', refresh_token);
			await this.onOAuthCompleted();
		})

		this.syncQueue = new SyncQueue(
			this.settings,
			this.app.vault,
			this,
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

		this.app.workspace.onLayoutReady(this.checkAccountStatus.bind(this));
	}

	private async checkAccountStatus() {
		try {
			this.user = await this.fetchGetUser();
			await this.onAuthenticated(true)
			await this.sync()
		} catch (e) {
			this.user = {loaded: false};
			await this.onAuthenticated(false)
		}
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
		let response;

		if (!this.access_token) {
			throw new NotAuthenticatedError("No access token found");
		}

		try {
			pino.debug(`Requesting ${url}`);
			response = await requestUrl({
				...options,
				url,
				headers: {
					...options.headers,
					"Authorization": `Bearer ${this.access_token}`
				}
			});
		} catch (error) {
			pino.warn(`Got an error when requesting ${url}`);
			// If we get a 401, try to refresh the token
			if (error.status === 401 && this.refresh_token) {
				pino.warn("Got a 401, refreshing")
				try {
					await this.refreshAccessToken();
					// Retry the request with new token
					pino.info("Retrying original request after refreshing the access token successfully");
					response = await requestUrl({
						...options,
						url,
						headers: {
							...options.headers,
							"Authorization": `Bearer ${this.access_token}`
						}
					});
				} catch (refreshError) {
					// If refresh fails, throw the original error
					throw error;
				}
			} else {
				pino.error(error, "You were unexpectedly logged out, please try to log back in again.");
				this.settings.refresh_token = undefined;
				this.settings.access_token = undefined;
				this.user = {loaded: false};
				await this.saveSettings();
				await this.onAuthenticated(false);

				throw error;
			}
		}

		return response;
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


	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
		return this.settings as ScrybbleSettings;
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	async fetchSyncDelta(): Promise<ReadonlyArray<SyncDelta>> {
		const response = await this.authenticatedRequest(`${this.base_url}/api/sync/delta`, {
			method: "GET",
			headers: {
				"Accept": "application/json",
			}
		})
		return response.json
	}

	async fetchPaginatedSyncHistory(page: number = 1): Promise<PaginatedResponse<SyncItem>> {
		const response = await this.authenticatedRequest(`${this.base_url}/api/sync/inspect-sync?paginated=true&page=${page}`, {
			method: "GET",
			headers: {
				"Content-Type": "application/json"
			}
		});

		return response.json;
	}

	async fetchFileTree(path: string = "/"): Promise<RMFileTree> {
		const response = await this.authenticatedRequest(`${this.base_url}/api/sync/RMFileTree`, {
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
		const response = await this.authenticatedRequest(`${this.base_url}/api/sync/status`, {
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
		const response = await this.authenticatedRequest(`${this.base_url}/api/sync/file`, {
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
		const response = await this.authenticatedRequest(`${this.base_url}/api/sync/onboardingState`, {
			method: "GET",
			headers: {
				"accept": "application/json",
				"Authorization": `Bearer ${this.access_token}`
			}
		});

		return response.json
	}

	async fetchGetUser(): Promise<ScrybbleUser> {
		const response = await this.authenticatedRequest(`${this.base_url}/api/sync/user`, {
			method: "GET",
			headers: {
				"accept": "application/json",
			}
		});

		return {...response.json, loaded: true};
	}

	public async exchangeCodeForTokens(code: string, state: string): Promise<{access_token: string, refresh_token: string}> {
		// Verify state parameter
		const storedState = localStorage.getItem('scrybble_oauth_state');
		if (!storedState || storedState !== state) {
			throw new Error('Invalid state parameter');
		}

		// Get stored code verifier
		const codeVerifier = localStorage.getItem('scrybble_code_verifier');
		if (!codeVerifier) {
			throw new Error('Missing code verifier');
		}

		try {
			// Exchange authorization code for tokens
			const tokenData = await this.fetchOAuthAccessToken(code, codeVerifier);

			this.settings.access_token = tokenData.access_token;
			this.settings.refresh_token = tokenData.refresh_token;
			await this.saveSettings();

			// Clean up stored PKCE parameters
			localStorage.removeItem('scrybble_code_verifier');
			localStorage.removeItem('scrybble_oauth_state');

			return {
				access_token: tokenData.access_token,
				refresh_token: tokenData.refresh_token
			};
		} catch (error) {
			// Clean up on error
			localStorage.removeItem('scrybble_code_verifier');
			localStorage.removeItem('scrybble_oauth_state');
			throw error;
		}
	}

	private async fetchOAuthAccessToken(code: string, codeVerifier: string) {
		const response = await requestUrl({
			url: `${this.base_url}/oauth/token`,
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

	async fetchInitiateOAuthPKCE() {
		const codeVerifier = PKCEUtils.generateCodeVerifier();
		const codeChallenge = await PKCEUtils.generateCodeChallenge(codeVerifier);
		const state = PKCEUtils.generateState();

		const params = new URLSearchParams({
			client_id: 2,
			redirect_uri: "obsidian://scrybble-oauth",
			response_type: 'code',
			scope: '',
			state,
			code_challenge: codeChallenge,
			code_challenge_method: 'S256'
		});

		localStorage.setItem('scrybble_code_verifier', codeVerifier);
		localStorage.setItem('scrybble_oauth_state', state);

		const authUrl = `${this.base_url}/oauth/authorize?${params.toString()}`;

		// Open the authorization URL in the default browser
		window.open(authUrl, '_blank');
	}

	async refreshAccessToken(): Promise<{access_token: string, refresh_token: string}> {
		if (!this.refresh_token) {
			throw new Error("No refresh token available");
		}

		try {
			const response = await this.fetchRefreshOAuthAccessToken();

			this.settings.access_token = response.access_token;
			this.settings.refresh_token = response.refresh_token;
			pino.info("Successfully refreshed OAuth token");
			await this.saveSettings();
			this.user = await this.fetchGetUser();
			await this.onAuthenticated(true)
		} catch (e) {
			this.settings.access_token = undefined;
			this.settings.refresh_token = undefined;
			await this.saveSettings();
			this.user = {loaded: false};
			await this.onAuthenticated(false)
			throw e;
		}
	}

	private async fetchRefreshOAuthAccessToken(): Promise<{access_token: string, refresh_token: string}>{
		pino.info(`Sending request for a refresh token with ${this.refresh_token}`);
		const formData = new URLSearchParams({
			grant_type: 'refresh_token',
			client_id: '2',
			refresh_token: this.refresh_token,
			scope: ''
		});
		const response = await requestUrl({
			url: `${this.base_url}/oauth/token`,
			method: "POST",
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
				'Accept': 'application/json'
			},
			body: formData.toString()
		})
		console.log(response.status, response.json);

		return response.json;
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

