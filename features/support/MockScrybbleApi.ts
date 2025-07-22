import {
	AuthenticateWithGumroadLicenseResponse,
	DeviceCodeResponse,
	DeviceFlowError,
	DeviceTokenResponse,
	FeedbackFormDetails,
	OneTimeCodeResponse,
	RMFileTree,
	RMTreeItem,
	ScrybbleApi,
	ScrybbleSettings,
	ScrybbleUser,
	SyncDelta,
	SyncFile
} from "../../@types/scrybble";

export class MockScrybbleApi implements ScrybbleApi {
	private loggedIn: boolean = false;
	private accessTokenExpired: boolean = false;

	private errors: Record<string, number> = {};
	private serverReachable: boolean = true;

	private pollingState: DeviceFlowError | "authenticated" = "authorization_pending";

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
				user: {
					name: "Test user",
					email: "test@scrybble.local",
					id: 1,
					created_at: "2025-05-05"
				},
				onboarding_state: "ready",
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

	fetchRefreshOAuthAccessToken(): Promise<{ access_token: string; refresh_token: string }> {
		this.throwIfErrorIsConfigured("fetchRefreshOAuthAccessToken");
		this.settings.access_token = "new_test_access_token";
		this.settings.refresh_token = "new_test_refresh_token";
		this.accessTokenExpired = false;
		this.loggedIn = true;
		return Promise.resolve({access_token: "new_test_access_token", refresh_token: "new_test_refresh_token"});
	}

	async fetchDeviceCode(): Promise<DeviceCodeResponse> {
		this.throwIfErrorIsConfigured("fetchDeviceCode");
		return {
			device_code: "test_device_code",
			user_code: "test_user_code",
			expires_in: 60 * 10,
			interval: 1,
			verification_uri: "test_verification_uri"
		}
	}

	async fetchPollForDeviceToken(deviceCode: string): Promise<DeviceTokenResponse> {
		this.throwIfErrorIsConfigured("fetchPollForDeviceToken");
		if (this.pollingState !== "authenticated") {
			return {
				error: this.pollingState,
				error_description: this.pollingState
			};
		} else {
			return {
				access_token: "test_access_token",
				refresh_token: "test_refresh_token",
				expires_in: 1000,
				token_type: "bearer"
			};
		}
	}

	authorizeDeviceToken() {
		this.pollingState = "authenticated";
	}

	async sendGumroadLicense(license: string): Promise<AuthenticateWithGumroadLicenseResponse> {
		return {
			newState: "ready"
		};
	}

	async sendOneTimeCode(code: string): Promise<OneTimeCodeResponse> {
		return {
			newState: "ready"
		};
	}

	fetchGiveFeedback(details: FeedbackFormDetails): Promise<void> {
		return Promise.resolve();
	}
}
