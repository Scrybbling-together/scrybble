import {StateMachine, t} from "typescript-fsm";
import {SyncProgressNotice} from "./ui/Components/SyncNotice";

export enum States {
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

export enum Events {
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

export class SyncJob extends StateMachine<States, Events> {
	public download_url?: string;
	public sync_id?: number;

	constructor(
		key: number = 0,
		init: States.init = States.init,
		public filename: string
	) {
		super(init, [], console);

		const notice = new SyncProgressNotice(filename);
		notice.updateState(init); // Initialize notice with current state

		const transitions = [
			t(States.init, Events.syncRequestSent, States.sync_requested, () => {
				notice.updateState(States.sync_requested);
			}),
			t(States.init, Events.ready, States.ready_to_download, () => {
				notice.updateState(States.ready_to_download);
			}),

			t(States.sync_requested, Events.syncRequestConfirmed, States.processing, () => {
				notice.updateState(States.processing);
			}),

			t(States.processing, Events.sentProcessingCheckRequest, States.awaiting_processing, () => {
				notice.updateState(States.awaiting_processing);
			}),
			t(States.awaiting_processing, Events.ready, States.ready_to_download, () => {
				notice.updateState(States.ready_to_download);
			}),
			t(States.awaiting_processing, Events.stillProcessing, States.processing, () => {
				notice.updateState(States.processing);
			}),
			t(States.awaiting_processing, Events.failedToProcess, States.failed_to_process, () => {
				notice.updateState(States.failed_to_process);
			}),

			t(States.processing, Events.ready, States.ready_to_download, () => {
				notice.updateState(States.ready_to_download);
			}),
			t(States.processing, Events.failedToProcess, States.failed_to_process, () => {
				notice.updateState(States.failed_to_process);
			}),

			t(States.ready_to_download, Events.downloadRequestSent, States.downloading, () => {
				notice.updateState(States.downloading);
			}),
			t(States.downloading, Events.downloaded, States.downloaded, () => {
				notice.updateState(States.downloaded);
			}),
		];
		this.addTransitions(transitions)
	}

	async readyToDownload(download_url: string, sync_id: number) {
		this.download_url = download_url;
		this.sync_id = sync_id;
		await this.dispatch(Events.ready)
	}

	async downloaded() {
		await this.dispatch(Events.downloaded)
	}

	async syncRequestConfirmed(sync_id: number) {
		await this.dispatch(Events.syncRequestConfirmed);
		this.sync_id = sync_id;
	}

	async sentProcessingRequest() {
		await this.dispatch(Events.sentProcessingCheckRequest);
	}

	async fileStillProcessing() {
		await this.dispatch(Events.stillProcessing);
	}

	async syncRequestSent() {
		await this.dispatch(Events.syncRequestSent);
	}
}
