import {apiVersion, ItemView, Platform, WorkspaceLeaf} from "obsidian";
import Scrybble from "../main";
import {html, render} from "lit-html";
import {ScrybbleViewType} from "./ui/Components/ScrybbleUI";
import {ObsidianFileNavigator} from "./FileNavigator";
import {ScrybbleCommon} from "../@types/scrybble";
import {Authentication} from "./Authentication";

export const SCRYBBLE_VIEW = "SCRYBBLE_VIEW";

export class ScrybbleView extends ItemView {
	navigation = true;
	private readonly plugin: Scrybble;

	constructor(leaf: WorkspaceLeaf, plugin: Scrybble) {
		super(leaf);
		this.plugin = plugin;
	}

	async onload(): Promise<void> {
		this.setupContainerStyles();
		await this.renderView();
	}

	getDisplayText(): string {
		return "Scrybble";
	}

	getViewType(): string {
		return SCRYBBLE_VIEW;
	}

	getIcon(): string {
		return "pencil-line";
	}

	private setupContainerStyles(): void {
		this.contentEl.style.display = "flex";
		this.contentEl.style.flexDirection = "column";
	}

	private async handleViewSwitch(view: ScrybbleViewType): Promise<void> {
		await this.renderView();
	}

	private async handleErrorRefresh(): Promise<void> {
		await this.renderView();
	}

	private async renderView(): Promise<void> {
		const self = this;
		const scrybble: ScrybbleCommon = {
			api: this.plugin,
			get sync() {return self.plugin.syncQueue},
			get settings() {return self.plugin.settings},
			fileNavigator: new ObsidianFileNavigator(this.plugin.app),
			get authentication() {return self.plugin.authentication},
			meta: {
				scrybbleVersion: this.plugin.manifest.version,
				obsidianVersion: apiVersion,
				platformInfo: this.getPlatformInfo()
			}
		}

		render(html`
			<scrybble-ui .scrybble="${scrybble}"
						 .onViewSwitch="${this.handleViewSwitch.bind(this)}"
						 .onErrorRefresh="${this.handleErrorRefresh.bind(this)}"
			/>`, this.contentEl);
	}

	private getPlatformInfo(): string {
		const p = Platform;

		// App type
		const appType = p.isDesktopApp ? 'Desktop' : 'Mobile';

		// Operating system
		let os = 'Unknown';
		if (p.isMacOS) os = 'macOS';
		else if (p.isWin) os = 'Windows';
		else if (p.isLinux) os = 'Linux';
		else if (p.isIosApp) os = 'iOS';
		else if (p.isAndroidApp) os = 'Android';

		// Form factor (only relevant for mobile)
		const formFactor = p.isMobile ? (p.isPhone ? ' (Phone)' : p.isTablet ? ' (Tablet)' : '') : '';

		return `${appType} - ${os}${formFactor}`;
	}
}
