export interface Host {
	endpoint: string;
	client_secret: string;
}

export interface ScrybbleSettings {
	last_successful_sync_id: number;
	sync_folder: string;

	self_hosted: boolean;

	custom_host: Host;
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
