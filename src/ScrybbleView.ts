import {ItemView, WorkspaceLeaf} from "obsidian";
import Scrybble from "../main";
import {html, render} from "lit-html";
import {ScrybbleUIProps, ScrybbleViewType} from "./ui/Components/ScrybbleUI";
import {ObsidianFileNavigator} from "./FileNavigator";

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
		const scrybble = {
				api: this.plugin,
				storage: this.plugin,
				sync: this.plugin.syncQueue,
				settings: this.plugin.settings,
				fileNavigator: new ObsidianFileNavigator(this.plugin.app)
		}
		render(html`
			<scrybble-ui .scrybble="${scrybble}"
						 .onViewSwitch="${this.handleViewSwitch.bind(this)}"
						 .onErrorRefresh="${this.handleErrorRefresh.bind(this)}"	
			></scrybble-ui>`, this.contentEl);
	}
}
