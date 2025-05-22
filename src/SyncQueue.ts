import {Events, States, SyncJob} from "./SyncJob";
import {ResponseError} from "./errorHandling/Errors";
import {basename, dirPath, sanitizeFilename} from "./support";
import {App, Notice, requestUrl, TFile} from "obsidian";
import * as jszip from "jszip";
import Scrybble from "../main";

export class SyncQueue {
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
