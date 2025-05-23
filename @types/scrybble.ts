import {ISyncQueue} from "../src/SyncQueue";

export interface Host {
	endpoint: string;
	client_secret: string;
}

export interface ScrybbleSettings {
	last_successful_sync_id: number;
	sync_folder: string;

	self_hosted: boolean;

	custom_host: Host;
	sync_state: Record<string, number>;
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

	fetchOAuthToken(username: string, password: string): Promise<{
		access_token: string
	}>;
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
	storage: ScrybblePersistentStorage;
	api: ScrybbleApi;
	sync: ISyncQueue;
	settings: ScrybbleSettings;
	fileNavigator: FileNavigator;
}
