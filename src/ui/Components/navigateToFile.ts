import {LitElement} from "lit-element";
import {property} from "lit-element/decorators.js";
import {html} from "lit-html";
import {getIcon} from "obsidian";
import {sanitizeFilename} from "../../support";
import {ScrybbleCommon, ContextMenuItem} from "../../../@types/scrybble";
import {consume} from "@lit/context";
import {scrybbleContext} from "../scrybbleContext";

export class NavigateToFile extends LitElement {
	@consume({context: scrybbleContext})
	@property({type: Object, attribute: false})
	scrybble!: ScrybbleCommon;

	@property({type: String})
	name: string;

	@property({type: String})
	status: 'completed' | 'error';

	constructor(name: string, status: 'completed' | 'error') {
		super();
		this.name = name;
		this.status = status;
	}

	navigateToFile(e: MouseEvent) {
		const {pdfPath, mdPath, pdf, md} = this.findFile();
		const fileNavigator = this.scrybble.fileNavigator;

		const menuItems: ContextMenuItem[] = [
			{
				title: `Markdown file${md == null ? " - doesn't exist" : ""}`,
				icon: "file-text",
				disabled: true
			},
			{ isSeparator: true },
			{
				title: "Open Markdown in new tab",
				icon: "file-plus",
				disabled: md == null,
				onClick: () => fileNavigator.openInNewTab(mdPath)
			},
			{
				title: "Open Markdown in vertical split view",
				icon: "separator-vertical",
				disabled: md == null,
				onClick: () => fileNavigator.openInVerticalSplit(mdPath)
			},
			{
				title: "Open Markdown in horizontal split view",
				icon: "separator-horizontal",
				disabled: md == null,
				onClick: () => fileNavigator.openInHorizontalSplit(mdPath)
			},
			{ isSeparator: true },
			{
				title: `PDF file${pdf == null ? " - doesn't exist" : ""}`,
				icon: "file-text",
				disabled: true
			},
			{ isSeparator: true },

		];

		fileNavigator.showContextMenu(e, menuItems);
	}

	render() {
		const {pdf, md} = this.findFile();
		const none = pdf == null && md == null;

		return html`
			<div class="scrybble-navigate-btn ${this.status}"
				 title="Open file"
				 @click="${this.navigateToFile.bind(this)}"
			>
				<span>${getIcon('arrow-up-right')}</span>
			</div>
		`;
	}

	protected createRenderRoot(): HTMLElement | DocumentFragment {
		return this;
	}


}
