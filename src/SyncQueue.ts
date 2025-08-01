import {SyncJob, SyncJobStates} from "./SyncJob";
import {Errors, ResponseError} from "./errorHandling/Errors";
import {basename, dirPath, sanitizeFilename} from "./support";
import {App, Notice, requestUrl, TFile, Vault} from "obsidian";
import * as jszip from "jszip";
import {ScrybbleApi, ScrybbleSettings} from "../@types/scrybble";
import path from "node:path";

export interface ISyncQueue {
	requestSync(filename: string): void;

	subscribeToSyncStateChangesForFile(path: string, callback: (newState: SyncJobStates, job: SyncJob) => void): void;

	unsubscribeToSyncStateChangesForFile(path: string): void;
}

export class SyncQueue implements ISyncQueue {
	private syncJobs: SyncJob[] = [];

	private readonly busyStates = [SyncJobStates.downloading, SyncJobStates.awaiting_processing];
	private syncJobStateChangeListeners: Map<string, ((newState: SyncJobStates, job: SyncJob) => void)[]> = new Map();


	constructor(
		private settings: ScrybbleSettings,
		private vault: Vault,
		private api: ScrybbleApi,
		private onStartDownloadFile: (job: SyncJob) => void,
		private onFinishedDownloadFile: (job: SyncJob, success: boolean, error?: Error | ResponseError) => void,
	) {
		setInterval(async () => {
			const maxActiveJobs = 3
			let busy = this.countBusyJobs();
			for (let job of this.syncJobs) {
				if (job.getState() === SyncJobStates.downloading || job.getState() === SyncJobStates.awaiting_processing) {
					busy += 1;
				}

				if (busy < maxActiveJobs) {
					if (job.getState() === SyncJobStates.init) {
						await this.requestFileToBeSynced(job)
						busy += 1
					} else if (job.getState() === SyncJobStates.ready_to_download) {
						await this.download(job)
						busy += 1
					} else if (job.getState() === SyncJobStates.processing) {
						await this.checkProcessingState(job)
						busy += 1
					}
				}
			}
		}, 2000)
	}

	syncjobStateChangeListener(path: string, newState: SyncJobStates, job: SyncJob) {
		if (this.syncJobStateChangeListeners.has(path)) {
			const listeners = this.syncJobStateChangeListeners.get(path) ?? [];
			for (let listener of listeners) {
				listener(newState, job);
			}
		}
	}

	subscribeToSyncStateChangesForFile(path: string, callback: (newState: SyncJobStates, job: SyncJob) => void): void {
		if (this.syncJobStateChangeListeners.has(path)) {
			this.syncJobStateChangeListeners.get(path)!.push(callback);
		} else {
			this.syncJobStateChangeListeners.set(path, [callback]);
		}
	}

	unsubscribeToSyncStateChangesForFile(path: string) {
		this.syncJobStateChangeListeners.delete(path);
	}

	async downloadProcessedFile(filename: string, download_url: string, sync_id: number) {
		const syncJob = new SyncJob(0, SyncJobStates.init, this.syncjobStateChangeListener.bind(this), filename);
		await syncJob.readyToDownload(download_url, sync_id)
		this.syncJobs.push(syncJob)
	}

	requestSync(filename: string) {
		const job = new SyncJob(0, SyncJobStates.init, this.syncjobStateChangeListener.bind(this), filename)
		this.syncJobs.push(job)
	}

	private countBusyJobs(): number {
		return this.syncJobs.filter((job: SyncJob) => this.busyStates.contains(job.getState())).length
	}

	private async download(job: SyncJob) {
		let relativePath = dirPath(job.filename)
		let nameOfFile = sanitizeFilename(basename(job.filename))
		const folderPath = await this.ensureFolderExists(this.vault, relativePath, this.settings.sync_folder)
		const out_path = path.join(folderPath, nameOfFile);

		try {
			this.onStartDownloadFile(job)
			await job.startDownload()
			const response = await requestUrl({
				method: "GET",
				url: job.download_url!
			})

			const zip = await jszip.loadAsync(response.arrayBuffer)
			// @ts-expect-error TS2345
			await this.zippedFileToVault(this.vault, zip, /_remarks(-only)?.pdf/, `${out_path}.pdf`)
			// @ts-expect-error TS2345
			await this.zippedFileToVault(this.vault, zip, /_obsidian.md/, `${out_path}.md`, false)
			await job.downloaded()
			this.onFinishedDownloadFile(job, true)
		} catch (e) {
			this.onFinishedDownloadFile(job, false, e as Error)
			Errors.handle("FILE_DOWNLOAD_ERROR", e as Error)
			await job.downloadingFailed()
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
		let data;
		try {
			data = await zip.file(nameMatch)[0].async("arraybuffer")
		} catch (e) {
			if (required) {
				throw new Error("Scrybble: Missing file in downloaded sync zip, reference = 106")
			}
			return
		}
		try {
			await this.writeToFile(vault, vaultFileName, data)
		} catch (e) {
			throw new Error(`Scrybble: Failed to place file "${vaultFileName}" in the right location, reference = 107`);
		}
	}

	private async requestFileToBeSynced(job: SyncJob) {
		try {
			await job.syncRequestSent()
			const response = await this.api.fetchRequestFileToBeSynced(job.filename)
			await job.syncRequestConfirmed(response.sync_id)
		} catch (e) {
			// if it's a 400, assume the sync job is not posted.
			// if it's a timeout or connection error, we don't know what happened.
		}
	}

	private async checkProcessingState(job: SyncJob) {
		await job.sentProcessingRequest()
		const state = await this.api.fetchSyncState(job.sync_id!)
		if (state.completed) {
			await job.readyToDownload(state.download_url, state.id)
		} else if (state.error) {
			await job.processingFailed()
		} else {
			await job.fileStillProcessing()
		}
	}
}
