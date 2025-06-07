import {FeedbackFormDetails, SyncFile} from "../../../@types/scrybble";
import {App, ButtonComponent, Modal, Notice, Setting, ToggleComponent} from "obsidian";

export class FileSyncFeedbackModal extends Modal {
	private devAccess: boolean = false;
	private openAccess: boolean = false;
	private comment: string = '';

	// toggles
	// @ts-expect-error TS2564
	private openAccessSetting: ToggleComponent;
	// @ts-expect-error TS2564
	private commentSetting: Setting;

	// @ts-expect-error TS2564
	private whatWillBeShared: Setting;
	// @ts-expect-error TS2564
	private whoWillBeSharedWith: Setting;
	// @ts-expect-error TS2564
	private shareButton: ButtonComponent;

	constructor(
		app: App,
		private syncFile: SyncFile,
		private readonly onSubmit: (details: FeedbackFormDetails) => Promise<void>
	) {
		super(app);
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();

		if (this.syncFile.sync?.error) {
			this.setTitle("Your reMarkable document isn't syncing well. Need help?");
		} else {
			this.setTitle("Got feedback about this document? Let us know!")
		}

		new Setting(contentEl)
			.setHeading()
			.setName('Your privacy matters')
			.setDesc('The Scrybble developers cannot just access your documents.');

		new Setting(contentEl)
			.setName('Allow the developer to access this reMarkable file')
			.addToggle(toggle => toggle
				.setValue(this.devAccess)
				.onChange(value => {
					this.devAccess = value;
					if (!value) {
						this.openAccess = false;
						this.openAccessSetting.setValue(false);
					}
					this.updateVisibility();
					this.updateShareInfo();
					this.updateButtonState();
				}));

		new Setting(contentEl)
			.setName('Share with the wider reMarkable development community')
			.setDesc('Sharing your document with everyone may feel strange, but Scrybble and the reMarkable development community is built on open principles. When you share with the wider community, any developer can use it to make sure their application works well for you. Want a thriving community of tools for the reMarkable? You can contribute!')
			.addToggle(toggle => {
				this.openAccessSetting = toggle;
				return toggle
					.setValue(this.openAccess)
					.onChange(value => {
						this.openAccess = value;
						this.updateShareInfo();
					});
			});

		this.commentSetting = new Setting(contentEl)
			.setName("What's up with this document?")
			.addTextArea(text => text
				.setPlaceholder('I expected [...] but [...] happened instead')
				.onChange(value => {
					this.comment = value;
					this.updateButtonState();
				}));

		this.whatWillBeShared = new Setting(contentEl)
			.setName('What will be shared?');

		this.whoWillBeSharedWith = new Setting(contentEl)
			.setName('Who will it be shared with?');

		new Setting(contentEl)
			.addButton(btn => {
				this.shareButton = btn;
				return btn
					.setButtonText('Share this document')
					.setCta()
					.setDisabled(true)
					.onClick(this.handleShare.bind(this));
			})
			.addButton(btn => btn
				.setButtonText("Don't share")
				.onClick(this.close.bind(this)));

		this.updateVisibility();
		this.updateShareInfo();
	}

	private updateVisibility() {
		this.openAccessSetting.toggleEl.style.display = this.devAccess ? '' : 'none';
		this.commentSetting.settingEl.style.display = this.devAccess ? '' : 'none';
	}

	private updateShareInfo() {
		let whatDesc: string;
		if (this.devAccess) {
			const items = [];
			if (this.syncFile.sync?.error) {
				items.push('The errors associated with this reMarkable document, PDF or quick sheets');
			}
			items.push(`Your reMarkable document: ${this.syncFile.name}`);
			whatDesc = items.join('\n• ');
			whatDesc = '• ' + whatDesc;
		} else {
			whatDesc = "Nothing. You haven't given permission to share.";
		}
		this.whatWillBeShared.setDesc(whatDesc);

		let whoDesc: string;
		if (this.devAccess && this.openAccess) {
			whoDesc = 'This document will be shared with anyone.';
		} else if (this.devAccess && !this.openAccess) {
			whoDesc = 'This document will be shared with the developer(s) of Scrybble.';
		} else {
			whoDesc = "Nobody. You haven't given permission to share.";
		}
		this.whoWillBeSharedWith.setDesc(whoDesc);
	}

	private updateButtonState() {
		this.shareButton.setDisabled(!this.devAccess || this.comment.length === 0)
	}

	private async handleShare() {
		const details: FeedbackFormDetails = {
			developer_access_consent_granted: this.devAccess,
			open_access_consent_granted: this.openAccess,
			sync_id: this.syncFile.sync!.id
		};

		if (this.comment.trim()) {
			details.feedback = this.comment.trim();
		}

		try {
			await this.onSubmit(details);
			new Notice('Shared reMarkable document.');
			this.close();
		} catch (error) {
			new Notice('Was unable to share the reMarkable document. Contact developer.');
			console.error('Share error:', error);
		}
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}
