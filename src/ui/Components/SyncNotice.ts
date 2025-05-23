import {html, LitElement} from 'lit-element';
import { property} from 'lit-element/decorators.js';
import {States} from "../../SyncJob";
import {Notice} from "obsidian";
import {render} from "lit-html";

export class SyncProgressIndicator extends LitElement {
	@property({type: String})
	state = States.init;

	@property({type: String})
	filename = '';

	render() {
		return html`<div class="sync-progress">
			<div class="title">Syncing <b>${this.filename}</b></div>
			<div class="progress">
				<div class="progress-line"></div>

				<div class="stage ${this.getStageClass('sync')}">
					<div class="stage-indicator">${this.getStageIcon('sync')}</div>
					<div class="stage-label">${this.getStageLabel('sync')}</div>
				</div>

				<div class="stage ${this.getStageClass('process')}">
					<div class="stage-indicator">${this.getStageIcon('process')}</div>
					<div class="stage-label">${this.getStageLabel('process')}</div>
				</div>

				<div class="stage ${this.getStageClass('download')}">
					<div class="stage-indicator">${this.getStageIcon('download')}</div>
					<div class="stage-label">${this.getStageLabel('download')}</div>
				</div>
			</div>
		</div>`;
	}

	isRequestSyncCompleted() {
		return this.getStageClass('sync') === 'stage-completed';
	}

	getStageLabel(stage: 'sync' | 'process' | 'download'): string {
		switch (stage) {
			case 'sync':
				if (this.state === States.init) return 'Request Sync';
				if (this.state === States.sync_requested) return 'Requesting Sync';
				if (this.state === States.failed_to_process && this.getStageClass('sync') === 'stage-error')
					return 'Failed to Request Sync';
				if (this.getStageClass('sync') === 'stage-completed') return 'Requested Sync';
				return 'Request Sync';

			case 'process':
				if (this.state === States.init || this.state === States.sync_requested)
					return 'Process File';
				if (this.state === States.processing || this.state === States.awaiting_processing)
					return 'Processing File';
				if (this.state === States.failed_to_process)
					return 'Failed to Process File';
				if (this.getStageClass('process') === 'stage-completed')
					return 'Processed File';
				return 'Process File';

			case 'download':
				if (this.state === States.init ||
					this.state === States.sync_requested ||
					this.state === States.processing ||
					this.state === States.awaiting_processing)
					return 'Download';
				if (this.state === States.ready_to_download)
					return 'Ready to Download';
				if (this.state === States.downloading)
					return 'Downloading';
				if (this.state === States.downloaded)
					return 'Downloaded';
				// if (this.state === States.failed_to_download)
				// 	return 'Failed to Download';
				return 'Download';
		}
	}

	getStageClass(stage: 'sync' | 'process' | 'download'): string {
		switch (stage) {
			case 'sync':
				if (this.state === States.sync_requested) return 'stage-waiting';
				if (this.state === States.failed_to_process) return 'stage-error';
				if (this.state === States.processing ||
					this.state === States.awaiting_processing ||
					this.state === States.ready_to_download ||
					this.state === States.downloading ||
					this.state === States.downloaded) return 'stage-completed';
				return '';

			case 'process':
				if (this.state === States.processing ||
					this.state === States.awaiting_processing) return 'stage-waiting';
				if (this.state === States.failed_to_process) return 'stage-error';
				if (this.state === States.ready_to_download ||
					this.state === States.downloading ||
					this.state === States.downloaded) return 'stage-completed';
				return '';

			case 'download':
				if (this.state === States.downloading) return 'stage-waiting';
				// if (this.state === States.failed_to_download) return 'stage-error';
				if (this.state === States.downloaded) return 'stage-completed';
				return '';
		}
	}

	getStageIcon(stage: 'sync' | 'process' | 'download'): string {
		const stageClass = this.getStageClass(stage);

		if (stageClass === 'stage-completed') return '✓';
		if (stageClass === 'stage-error') return '!';
		return '';
	}

	protected createRenderRoot(): HTMLElement | DocumentFragment {
		return this
	}
}
export class SyncProgressNotice {
	private notice: Notice;
	private readonly indicator: SyncProgressIndicator; // The SyncProgressIndicator instance

	constructor(filename: string) {
		this.notice = new Notice("", 0);

		this.indicator = new SyncProgressIndicator();
		this.indicator.filename = filename;
		this.indicator.state = States.init;

		this.notice.containerEl.style.whiteSpace = "normal";
		this.notice.containerEl.style.maxWidth = "calc(var(--size-4-18) * 5 + 2 * var(--size-4-3))";

		render(this.indicator, this.notice.containerEl)
	}

	updateState(newState: States): void {
		// Update the component's state
		this.indicator.state = newState;

		// If we've reached the end state, dismiss the notice after a short delay
		if (newState === States.downloaded) {
			setTimeout(() => {
				this.notice.hide();
			}, 2000);
		}

		// If there's an error, keep the notice longer so the user can see it
		if (newState === States.failed_to_process) {
			setTimeout(() => {
				this.notice.hide();
			}, 5000);
		}
	}
}
