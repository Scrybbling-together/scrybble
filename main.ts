import {App, Notice, Plugin, requestUrl, TFile, WorkspaceLeaf} from 'obsidian';
import {Host, PaginatedResponse, RMFileTree, ScrybbleSettings, SyncDelta, SyncItem} from "./@types/scrybble";
import {DEFAULT_SETTINGS, Settings} from "./src/settings";
import {SCRYBBLE_VIEW, ScrybbleView} from "./src/ScrybbleView";
import loadLitComponents from "./src/Components/loadComponents";
import {Events, States, SyncJob} from "./src/SyncJob";
import {ResponseError} from "./src/errorHandling/Errors";
import {basename, dirPath, sanitizeFilename} from "./src/support";
import * as jszip from "jszip";

// only needs to happen once, ever.
loadLitComponents()

class SyncQueue {
	private syncJobs: SyncJob[] = [];

	private readonly busyStates = [States.downloading, States.awaiting_processing];

	constructor(
		private plugin: Scrybble,
		private onStartDownloadFile: (job: SyncJob) => void,
		private onFinishedDownloadFile: (job: SyncJob, success: boolean, error?: Error | ResponseError) => void,
	) {
		setInterval(async () => {
			const maxActiveJobs = 3
			let busy = this.countBusyJobs();
			if (busy < maxActiveJobs) {

			}
			for (let job of this.syncJobs) {
				if (job.getState() === States.downloading || job.getState() === States.awaiting_processing) {
					busy += 1;
				}

				if (busy < 3) {
					if (job.getState() === States.init) {
						await this.requestFileToBeSynced(job)
						busy += 1
					} else if (job.getState() === States.ready_to_download) {
						await this.download(job)
						busy += 1
					} else if (job.getState() === States.processing) {
						await this.checkProcessingState(job)
						busy += 1
					}
				}
			}
		}, 2000)
	}

	async downloadProcessedFile(filename: string, download_url: string, sync_id: number) {
		const syncJob = new SyncJob(0, States.init, filename);
		await syncJob.readyToDownload(download_url, sync_id)
		this.syncJobs.push(syncJob)
	}

	requestSync(filename: string) {
		const job = new SyncJob(0, States.init, filename)
		this.syncJobs.push(job)
	}

	private countBusyJobs(): number {
		return this.syncJobs.filter((job: SyncJob) => this.busyStates.contains(job.getState())).length
	}

	private async download(job: SyncJob) {
		const vault = this.plugin.app.vault

		let relativePath = dirPath(job.filename)
		let nameOfFile = sanitizeFilename(basename(job.filename))
		const folderPath = await this.ensureFolderExists(vault, relativePath, this.plugin.settings.sync_folder)

		this.onStartDownloadFile(job)
		await job.dispatch(Events.downloadRequestSent)
		const response = await requestUrl({
			method: "GET",
			url: job.download_url
		})

		try {
			const zip = await jszip.loadAsync(response.arrayBuffer)
			await this.zippedFileToVault(vault, zip, /_remarks(-only)?.pdf/, `${folderPath}${nameOfFile}.pdf`)
			await this.zippedFileToVault(vault, zip, /_obsidian.md/, `${folderPath}${nameOfFile}.md`, false)
			await job.downloaded()
			this.onFinishedDownloadFile(job, true)
		} catch (e) {
			this.onFinishedDownloadFile(job, false, e)
		}
	}

	private async writeToFile(vault: App["vault"], filePath: string, data: ArrayBuffer) {
		const file = vault.getAbstractFileByPath(filePath)
		if (file === null) {
			try {
				await vault.createBinary(filePath, data)
			} catch {
				throw new Error(`Scrybble: Was unable to write file ${filePath}, reference = 104`)
			}
		} else if (file instanceof TFile) {
			try {
				await vault.modifyBinary(file, data)
			} catch {
				throw new Error(`Scrybble: Was unable to modify file ${filePath}, reference = 105`)
			}
		} else {
			throw new Error("Scrybble: Unknown error reference = 103")
		}
	}

	private async ensureFolderExists(vault: App["vault"], relativePath: string, sync_folder: string) {
		let folderPath = relativePath.startsWith("/") ? `${sync_folder}${relativePath}` : `${sync_folder}/${relativePath}`
		folderPath = folderPath.split("/").map((folderName) => sanitizeFilename(folderName)).join("/")
		try {
			await vault.createFolder(folderPath)
		} catch (e) {
			if (e instanceof Error && !e.message.includes("already exists")) {
				new Notice(`Scrybble: failed to create Scrybble highlights folder at ${relativePath}. Error reference = 102`)
			}
		}

		return folderPath
	}

	private async zippedFileToVault(vault: App["vault"], zip: jszip, nameMatch: RegExp, vaultFileName: string, required = true) {
		try {
			const data = await zip.file(nameMatch)[0].async("arraybuffer")
			await this.writeToFile(vault, vaultFileName, data)
		} catch (e) {
			if (required) {
				throw new Error("Scrybble: Missing file in downloaded sync zip, reference = 106")
			} else {
				return;
			}
		}
	}


	private async requestFileToBeSynced(job: SyncJob) {
		try {
			await job.syncRequestSent()
			const response = await this.plugin.fetchRequestFileToBeSynced(job.filename)
			await job.syncRequestConfirmed(response.sync_id)
		} catch (e) {
			// if it's a 400, assume the sync job is not posted.
			// if it's a timeout or connection error, we don't know what happened.
		}
	}

	private async checkProcessingState(job: SyncJob) {
		await job.sentProcessingRequest()
		const state = await this.plugin.fetchSyncState(job.sync_id)
		if (state.completed) {
			await job.readyToDownload(state.download_url, state.id)
		} else {
			await job.fileStillProcessing()
		}
	}
}

export default class Scrybble extends Plugin {
	// @ts-ignore -- onload acts as a constructor.
	public settings: ScrybbleSettings;
	private syncQueue: SyncQueue;

	get access_token(): string | null {
		return localStorage.getItem('scrybble_access_token');
	}

	get base_url(): string {
		return this.getHost().endpoint;
	}

	async onload() {
		this.settings = await this.loadSettings()


		this.syncQueue = new SyncQueue(this,
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

		this.app.workspace.onLayoutReady(this.sync.bind(this));
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

	async sync() {
		const latestSyncState = await this.fetchSyncDelta()
		const settings = this.settings

		for (const {filename, id, download_url} of latestSyncState) {
			// there is an update to a file iff
			// 1. it is not in the sync state OR
			// 2. the id remote is higher than the id locally
			if (!(filename in settings.sync_state) || settings.sync_state[filename] < id) {
				console.log(`downloading file ${filename} with id ${id}`)
				await this.syncQueue.downloadProcessedFile(filename, download_url, id)
			}
		}
	}

	async requestFileToBeSynced(filename: string) {
		this.syncQueue.requestSync(filename)
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
		return this.settings as ScrybbleSettings;
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	async fetchSyncDelta(): Promise<ReadonlyArray<SyncDelta>> {
		const response = await requestUrl({
			url: `${this.base_url}/api/sync/delta`,
			method: "GET",
			headers: {
				"Accept": "application/json",
				"Authorization": `Bearer ${this.access_token}`
			}
		})
		return response.json
	}

	async fetchPaginatedSyncHistory(page: number = 1): Promise<PaginatedResponse<SyncItem>> {
		const response = await requestUrl({
			url: `${this.base_url}/api/sync/inspect-sync?paginated=true&page=${page}`,
			method: "GET",
			headers: {
				"Authorization": `Bearer ${this.access_token}`,
				"Content-Type": "application/json"
			}
		});

		return response.json;
	}

	async fetchFileTree(path: string = "/"): Promise<RMFileTree> {
		const response = await requestUrl({
			url: `${this.base_url}/api/sync/RMFileTree`,
			method: "POST",
			headers: {
				"Accept": "application/json",
				"Authorization": `Bearer ${this.access_token}`,
				"Content-Type": "application/json"
			},
			body: JSON.stringify({path})
		})
		return response.json
	}

	async fetchSyncState(sync_id: number) {
		const response = await requestUrl({
			url: `${this.base_url}/api/sync/status`,
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"accept": "application/json",
				"Authorization": `Bearer ${this.access_token}`
			},
			body: JSON.stringify({ sync_id })
		});

		return response.json
	}

	async fetchRequestFileToBeSynced(filePath: string): Promise<{ sync_id: number; filename: string; }> {
		const response = await requestUrl({
			url: `${this.base_url}/api/sync/file`,
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"accept": "application/json",
				"Authorization": `Bearer ${this.access_token}`
			},
			body: JSON.stringify({
				file: filePath
			})
		});

		return response.json
	}

	async fetchOnboardingState(): Promise<"unauthenticated" | "setup-gumroad" | "setup-one-time-code" | "setup-one-time-code-again" | "ready"> {
		const response = await requestUrl({
			url: `${this.base_url}/api/sync/onboardingState`,
			method: "GET",
			headers: {
				"accept": "application/json",
				"Authorization": `Bearer ${this.access_token}`
			}
		});

		return response.json
	}

	async fetchOAuthToken(username: string, password: string): Promise<{
		access_token: string
	}> {
		const client_secret = this.getHost().client_secret;
		const response = await requestUrl({
			url: `${this.base_url}/oauth/token`,
			method: "POST",
			headers: {
				"Accept": "application/json, text/plain, */*",
				"Content-Type": "application/json"
			},
			body: JSON.stringify({
				"grant_type": "password",
				"client_id": "1",
				"client_secret": client_secret,
				"username": username,
				"password": password,
				"scope": ""
			})
		})
		return response.json
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

