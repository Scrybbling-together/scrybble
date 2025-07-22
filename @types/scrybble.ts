import {ISyncQueue} from "../src/SyncQueue";
import {Authentication} from "../src/Authentication";

export interface Host {
	endpoint: string;
	client_secret: string;
	client_id: string;
}

export interface ScrybbleSettings {
	sync_folder: string;

	self_hosted: boolean;

	custom_host: Host;
	sync_state: Record<string, number>;

	access_token?: string;
	refresh_token?: string;

	get client_id(): string;
	get client_secret(): string;
	get endpoint(): string;

	save(): Promise<void>;
}

export type SyncDelta = { id: number, download_url: string, filename: string };

export interface RMTreeItem {
	type: 'f' | 'd'
	name: string
	path: string
}

export interface File extends RMTreeItem {
	type: 'f'
}

export interface Directory extends RMTreeItem {
	type: 'd'
}

export type RMFileTree = { items: ReadonlyArray<RMTreeItem>, cwd: string };

export interface SyncInfo {
	id: number;
	completed: boolean;
	error: boolean;
	created_at: string;
}

export interface SyncFile {
	name: string;
	path: string;
	sync: null | SyncInfo;
	type: "f" | "d";
}

export interface PaginatedResponse<T> {
	data: T[];
	current_page: number;
	last_page: number;
	per_page: number;
	total: number;
}

export type OnboardingState = "unauthenticated"
	| "setup-gumroad"
	| "setup-one-time-code"
	| "setup-one-time-code-again"
	| "ready";

export type AuthenticateWithGumroadLicenseResponse =
	| { newState: OnboardingState }
	| { error: string };

export type OneTimeCodeResponse =
	| { newState: OnboardingState }
	| { error: string };


export interface FeedbackFormDetails {
	developer_access_consent_granted: boolean;
	open_access_consent_granted: boolean;
	sync_id: number;
	feedback?: string;
}

type SyncStateSuccess  = {
	error: false;
	completed: true;
	download_url: string;
}

type SyncStateError = {
	error: true;
	completed: false;
}

export type SyncStateResponse = {
	id: number;
	filename: string;
} & (SyncStateSuccess | SyncStateError);

export interface ScrybbleApi {
	fetchSyncDelta(): Promise<ReadonlyArray<SyncDelta>>;

	fetchFileTree(path: string): Promise<RMFileTree>;

	fetchSyncState(sync_id: number): Promise<SyncStateResponse>;

	fetchRequestFileToBeSynced(filePath: string): Promise<{ sync_id: number; filename: string; }>;

	fetchOnboardingState(): Promise<OnboardingState>;

	fetchGetUser(): Promise<ScrybbleUser>;

	fetchRefreshOAuthAccessToken(): Promise<{ access_token: string, refresh_token: string }>;

	fetchPollForDeviceToken(deviceCode: string): Promise<DeviceTokenResponse>;

	fetchDeviceCode(): Promise<DeviceCodeResponse>;

	sendGumroadLicense(license: string): Promise<AuthenticateWithGumroadLicenseResponse>;
	sendOneTimeCode(code: string): Promise<OneTimeCodeResponse>;

	fetchGiveFeedback(details: FeedbackFormDetails): Promise<void>;
}

export interface ScrybblePersistentStorage {
	access_token: string | null;
}

export type ContextMenuItem =
	| {
	title: string;
	icon: string;
	disabled?: boolean;
	onClick?: () => void | Promise<void>;
	isSeparator?: false;
}
	| {
	isSeparator: true;
};

export interface FileNavigator {
	openInNewTab(file: string): Promise<void>;

	openInVerticalSplit(file: string): Promise<void>;

	openInHorizontalSplit(file: string): Promise<void>;

	getFileByPath(path: string): File | null;

	showContextMenu(event: MouseEvent, items: ContextMenuItem[]): void;
}

export type ScrybbleCommon = {
	api: ScrybbleApi;
	sync: ISyncQueue;
	settings: ScrybbleSettings;
	fileNavigator: FileNavigator;
	authentication: Authentication;
	meta: {
		scrybbleVersion: string;
		obsidianVersion: string;
		platformInfo: string;
	};
	openFeedbackDialog: (syncFile: SyncFile, onSubmit: (details: FeedbackFormDetails) => Promise<void>) => void;
}

export interface LicenseInformation {
	uses: number;
	order_number: string;
	sale_id: string;
	subscription_id: string;
	active: boolean;
}

export interface GumroadLicenseResponse {
	license: string;
	exists: boolean;
	lifetime: boolean;

	// only present when 'exists' is true
	licenseInformation?: LicenseInformation;
}


export type ScrybbleUser = {
	user: {
		created_at: string;
		email: string;
		name: string;
		id: number;
	},
	onboarding_state: OnboardingState;
	subscription_status: GumroadLicenseResponse | null;
	total_syncs: number;
}

export interface DeviceCodeResponse {
	device_code: string;
	user_code: string;
	verification_uri: string;
	expires_in: number;
	interval: number;
}

export type DeviceFlowError =
	| 'authorization_pending'
	| 'slow_down'
	| 'access_denied'
	| 'expired_token';

export interface DeviceTokenErrorResponse {
	error: DeviceFlowError;
	error_description: string;
}

export type DeviceTokenSuccessResponse = {
	access_token: string;
	refresh_token: string;
	token_type: string;
	expires_in: number;
};
export type DeviceTokenResponse = DeviceTokenSuccessResponse  | DeviceTokenErrorResponse;
