import {StateMachine, t} from "typescript-fsm";
import {SyncProgressNotice} from "./ui/Components/SyncNotice";

export enum SyncJobStates {
	// initial state
	init = "INIT",

	sync_requested = "SYNC_REQUESTED",

	// we know the file has been sent, and it is processing in the cloud
	processing = "PROCESSING",
	// A request has been sent to check the sync status
	awaiting_processing = "AWAITING_PROCESSING",
	// the server confirmed the file failed to be processed
	failed_to_process = "FAILED_TO_PROCESS",

	// the server confirmed the file is ready to download
	ready_to_download = "READY_TO_DOWNLOAD",

	// a download request is in-flight
	downloading = "DOWNLOADING",
	// the file has been downloaded
	downloaded = "DOWNLOADED"
}

export enum SyncJobEvents {
	syncRequestConfirmed = "SYNC_REQUEST_CONFIRMED",
	syncRequestSent = "SYNC_REQUEST_SENT",
	sentProcessingCheckRequest = "CHECKING_PROCESSING_STATE",
	stillProcessing = "STILL_PROCESSING",
	ready = "READY",
	downloadRequestSent = "DOWNLOAD_REQUEST_SENT",
	failedToProcess = "FAILED_TO_PROCESS",
	downloaded = "DOWNLOADED",
	errorReceived = "ERROR_RECEIVED"
}

export class SyncJob extends StateMachine<SyncJobStates, SyncJobEvents> {
	public download_url?: string;
	public sync_id?: number;

	constructor(
		key: number = 0,
		init: SyncJobStates.init = SyncJobStates.init,
		private onStateChange: (filename: string, newState: SyncJobStates, job: SyncJob) => void,
		public filename: string
	) {
		super(init, [], console);

		const notice = new SyncProgressNotice(filename);
		this.onStateChange(this.filename, SyncJobStates.init, this);
		notice.updateState(init);

		const transitions = [
			t(SyncJobStates.init, SyncJobEvents.syncRequestSent, SyncJobStates.sync_requested, () => {
				this.onStateChange(this.filename, SyncJobStates.sync_requested, this);
				notice.updateState(SyncJobStates.sync_requested);
			}),
			t(SyncJobStates.init, SyncJobEvents.ready, SyncJobStates.ready_to_download, () => {
				this.onStateChange(this.filename, SyncJobStates.ready_to_download, this);
				notice.updateState(SyncJobStates.ready_to_download);
			}),

			t(SyncJobStates.sync_requested, SyncJobEvents.syncRequestConfirmed, SyncJobStates.processing, () => {
				this.onStateChange(this.filename, SyncJobStates.processing, this);
				notice.updateState(SyncJobStates.processing);
			}),

			t(SyncJobStates.processing, SyncJobEvents.sentProcessingCheckRequest, SyncJobStates.awaiting_processing, () => {
				this.onStateChange(this.filename, SyncJobStates.awaiting_processing, this);
				notice.updateState(SyncJobStates.awaiting_processing);
			}),
			t(SyncJobStates.awaiting_processing, SyncJobEvents.ready, SyncJobStates.ready_to_download, () => {
				this.onStateChange(this.filename, SyncJobStates.ready_to_download, this);
				notice.updateState(SyncJobStates.ready_to_download);
			}),
			t(SyncJobStates.awaiting_processing, SyncJobEvents.stillProcessing, SyncJobStates.processing, () => {
				this.onStateChange(this.filename, SyncJobStates.processing, this);
				notice.updateState(SyncJobStates.processing);
			}),
			t(SyncJobStates.awaiting_processing, SyncJobEvents.failedToProcess, SyncJobStates.failed_to_process, () => {
				this.onStateChange(this.filename, SyncJobStates.failed_to_process, this);
				notice.updateState(SyncJobStates.failed_to_process);
			}),

			t(SyncJobStates.processing, SyncJobEvents.ready, SyncJobStates.ready_to_download, () => {
				this.onStateChange(this.filename, SyncJobStates.ready_to_download, this);
				notice.updateState(SyncJobStates.ready_to_download);
			}),
			t(SyncJobStates.processing, SyncJobEvents.failedToProcess, SyncJobStates.failed_to_process, () => {
				this.onStateChange(this.filename, SyncJobStates.failed_to_process, this);
				notice.updateState(SyncJobStates.failed_to_process);
			}),

			t(SyncJobStates.ready_to_download, SyncJobEvents.downloadRequestSent, SyncJobStates.downloading, () => {
				this.onStateChange(this.filename, SyncJobStates.downloading, this);
				notice.updateState(SyncJobStates.downloading);
			}),
			t(SyncJobStates.downloading, SyncJobEvents.downloaded, SyncJobStates.downloaded, () => {
				this.onStateChange(this.filename, SyncJobStates.downloaded, this);
				notice.updateState(SyncJobStates.downloaded);
			}),
		];
		this.addTransitions(transitions)
	}

	async readyToDownload(download_url: string, sync_id: number) {
		this.download_url = download_url;
		this.sync_id = sync_id;
		await this.dispatch(SyncJobEvents.ready)
	}

	async downloaded() {
		await this.dispatch(SyncJobEvents.downloaded)
	}

	async syncRequestConfirmed(sync_id: number) {
		await this.dispatch(SyncJobEvents.syncRequestConfirmed);
		this.sync_id = sync_id;
	}

	async sentProcessingRequest() {
		await this.dispatch(SyncJobEvents.sentProcessingCheckRequest);
	}

	async fileStillProcessing() {
		await this.dispatch(SyncJobEvents.stillProcessing);
	}

	async syncRequestSent() {
		await this.dispatch(SyncJobEvents.syncRequestSent);
	}

	async startDownload() {
		await this.dispatch(SyncJobEvents.downloadRequestSent)
	}

	async processingFailed() {
		await this.dispatch(SyncJobEvents.failedToProcess);
	}
}
