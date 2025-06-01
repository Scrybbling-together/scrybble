import {ISyncQueue} from "../src/SyncQueue";
import {Authentication} from "../src/Authentication";

export interface Host {
	endpoint: string;
	client_secret: string;
}

export interface ScrybbleSettings {
	sync_folder: string;

	self_hosted: boolean;

	custom_host: Host;
	sync_state: Record<string, number>;

	access_token?: string;
	refresh_token?: string;

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

export interface SyncItem {
	id: number;
	filename: string;
	created_at: string;
	completed: boolean;
	error: boolean;
}

export interface PaginatedResponse<T> {
	data: T[];
	current_page: number;
	last_page: number;
	per_page: number;
	total: number;
}

export interface ScrybbleApi {
	fetchSyncDelta(): Promise<ReadonlyArray<SyncDelta>>;

	fetchPaginatedSyncHistory(page: number): Promise<PaginatedResponse<SyncItem>>;

	fetchFileTree(path: string): Promise<RMFileTree>;

	fetchSyncState(sync_id: number): Promise<any>;

	fetchRequestFileToBeSynced(filePath: string): Promise<{ sync_id: number; filename: string; }>;

	fetchOnboardingState(): Promise<"unauthenticated" | "setup-gumroad" | "setup-one-time-code" | "setup-one-time-code-again" | "ready">;

	fetchGetUser(): Promise<ScrybbleUser>;

	fetchOAuthAccessToken(code: string, codeVerifier: string): Promise<{ access_token: string; refresh_token: string }>;

	fetchRefreshOAuthAccessToken(): Promise<{ access_token: string, refresh_token: string }>;

	fetchPollForDeviceToken(deviceCode: string): Promise<DeviceTokenResponse>;

	fetchDeviceCode(): Promise<DeviceCodeResponse>;
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
	loaded: false;
} | {
	loaded: true;
	user: {
		created_at: string;
		email: string;
		name: string;
		id: number;
	},
	subscription_status: GumroadLicenseResponse;
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
