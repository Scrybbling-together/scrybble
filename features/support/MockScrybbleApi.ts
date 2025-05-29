import {
	PaginatedResponse,
	RMFileTree,
	ScrybbleApi,
	ScrybbleSettings,
	ScrybbleUser,
	SyncDelta,
	SyncItem
} from "../../@types/scrybble";

export class MockScrybbleApi implements ScrybbleApi {
	private loggedIn: boolean = false;
	private accessTokenExpired: boolean = false;

	private errors: Record<string, number> = {};
	private serverReachable: boolean = true;

	constructor(private settings: ScrybbleSettings) {
	}

	public accessTokenIsExpired() {
		this.accessTokenExpired = true;
	}

	public accessTokenIsValid() {
		this.accessTokenExpired = false;
	}

	public isNotLoggedIn() {
		this.loggedIn = false;
	}

	public isLoggedIn() {
		this.loggedIn = true;
	}

	public requestWillFailWithStatusCode(requestName: string, statusCode: number) {
		this.errors[requestName] = statusCode;
	}

	public serverIsUnreachable() {
		this.serverReachable = false;
	}

	serverIsReachable() {
		this.serverReachable = true;
	}

	public requestGoesAsNormal(requestName: string) {
		delete this.errors[requestName];
	}

	async fetchFileTree(path: string): Promise<RMFileTree> {
		this.throwIfErrorIsConfigured("fetchFileTree");
		const tree: RMFileTree = {
			items: [],
			cwd: "/"
		}
		return Promise.resolve(tree);
	}

	fetchOnboardingState(): Promise<"unauthenticated" | "setup-gumroad" | "setup-one-time-code" | "setup-one-time-code-again" | "ready"> {
		this.throwIfErrorIsConfigured("fetchOnboardingState");
		return Promise.resolve("ready");
	}

	fetchPaginatedSyncHistory(page: number): Promise<PaginatedResponse<SyncItem>> {
		this.throwIfErrorIsConfigured("fetchPaginatedSyncHistory");
		const t: PaginatedResponse<SyncItem> = {
			data: [],
			current_page: 0,
			last_page: 0,
			per_page: 0,
			total: 0
		}
		return Promise.resolve(t);
	}

	fetchRequestFileToBeSynced(filePath: string): Promise<{ sync_id: number; filename: string }> {
		this.throwIfErrorIsConfigured("fetchRequestFileToBeSynced");
		return Promise.resolve({filename: "", sync_id: 0});
	}

	fetchSyncDelta(): Promise<ReadonlyArray<SyncDelta>> {
		this.throwIfErrorIsConfigured("fetchSyncDelta");
		return Promise.resolve([]);
	}

	fetchSyncState(sync_id: number): Promise<any> {
		this.throwIfErrorIsConfigured("fetchSyncState");
		return Promise.resolve(undefined);
	}

	fetchGetUser(): Promise<ScrybbleUser> {
		this.throwIfErrorIsConfigured("fetchGetUser");
		if (this.accessTokenExpired) {
			const err = new Error("Token expired");
			// @ts-ignore
			err.status = 401;
			return Promise.reject(err);
		}
		if (!this.loggedIn) {
			const err = new Error("Not authenticated");
			// @ts-ignore
			err.status = 401;
			return Promise.reject(err);
		}
		return Promise.resolve(
			{
				loaded: true,
				user: {
					name: "Test user",
					email: "test@scrybble.local",
					id: 1,
					created_at: "2025-05-05"
				},
				subscription_status: {
					exists: true,
					licenseInformation: {
						subscription_id: "8yFSEPV-yKKLQwC2jJQ68w==",
						active: true,
						order_number: "abc",
						sale_id: "def",
						uses: 0
					},
					lifetime: true,
					license: "liceeeense"
				},
				total_syncs: 32
			}
		);
	}

	private throwIfErrorIsConfigured(requestName: string) {
		if (!this.serverReachable) {
			throw new Error("ERR_CONNECTION_REFUSED");
		}
		if (requestName in this.errors) {
			throw new Error(`Request failed, status ${this.errors[requestName]}`);
		}
	}

	fetchOAuthAccessToken(code: string, codeVerifier: string): Promise<{
		access_token: string;
		refresh_token: string
	}> {
		this.throwIfErrorIsConfigured("fetchOAuthAccessToken");
		this.settings.access_token = "test_access_token";
		this.settings.refresh_token = "test_refresh_token";
		this.accessTokenExpired = false;
		return Promise.resolve({access_token: "test_access_token", refresh_token: "test_refresh_token"});
	}

	fetchRefreshOAuthAccessToken(): Promise<{ access_token: string; refresh_token: string }> {
		this.throwIfErrorIsConfigured("fetchRefreshOAuthAccessToken");
		this.settings.access_token = "new_test_access_token";
		this.settings.refresh_token = "new_test_refresh_token";
		this.accessTokenExpired = false;
		this.loggedIn = true;
		return Promise.resolve({access_token: "new_test_access_token", refresh_token: "new_test_refresh_token"});
	}
}
