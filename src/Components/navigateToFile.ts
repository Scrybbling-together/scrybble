import {LitElement} from "lit-element";
import {property} from "lit-element/decorators.js";
import {html} from "lit-html";
import {getIcon, Menu} from "obsidian";
import Scrybble from "../../main";
import {sanitizeFilename} from "../support";


export class NavigateToFile extends LitElement {
	@property({type: String})
	name: string;

	@property({type: String})
	status: 'completed' | 'error';

	@property({type: Scrybble})
	plugin: Scrybble;

	constructor(plugin: Scrybble, name: string, status: 'completed' | 'error') {
		super();
		this.name = name;
		this.status = status;
		this.plugin = plugin;
	}

	navigateToFile(e) {
		const {pdf, md} = this.findFile();
		const menu = new Menu();
		const app = this.plugin.app;

		// Add section for Markdown file

		menu
			.addItem(item => item.setTitle(`Markdown file${md == null ? " - doesn't exist" : ""}`).setIcon("file-text").setDisabled(true)).addSeparator()
			.addItem(item =>
				item.setTitle("Open Markdown in current tab")
					.setIcon("file-text")
					.onClick(() => app.workspace.getLeaf().openFile(md!))
					.setDisabled(md == null)
			)
			.addItem(item =>
				item.setTitle("Open Markdown in new tab")
					.setIcon("file-plus")
					.onClick(() => app.workspace.getLeaf(true).openFile(md!))
					.setDisabled(md == null)
			)
			.addItem(item =>
				item.setTitle("Open Markdown in split view")
					.setIcon("separator-vertical")
					.onClick(() => app.workspace.getLeaf("split", "vertical").openFile(md!))
					.setDisabled(md == null)
			).addSeparator()
			.addItem(item => item.setTitle(`PDF file${pdf == null ? " - doesn't exist" : ""}`).setIcon("file-text").setDisabled(true)).addSeparator()
			.addItem(item =>
				item.setTitle("Open PDF in current tab")
					.setIcon("file")
					.onClick(() => app.workspace.getLeaf().openFile(pdf!))
					.setDisabled(pdf == null)
			)
			.addItem(item =>
				item.setTitle("Open PDF in new tab")
					.setIcon("file-plus")
					.onClick(() => app.workspace.getLeaf(true).openFile(pdf!))
					.setDisabled(pdf == null)
			)
			.addItem(item =>
				item.setTitle("Open PDF in split view")
					.setIcon("separator-vertical")
					.onClick(() => app.workspace.getLeaf("split", "vertical").openFile(pdf!))
					.setDisabled(pdf == null)
			).addSeparator().showAtMouseEvent(e);
	}

	render() {
		const {pdf, md} = this.findFile()
		const none = pdf == null && md == null

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
		return this
	}

	private findFile() {
		// The path to the file is constructed from:
		// 1. The configured root folder from settings
		// 2. The sanitized filename
		// 3. Adding .pdf extension
		const app = this.plugin.app;
		const sanitizedName = sanitizeFilename(this.name.substring(1, this.name.length), true);
		const rootFolder = this.plugin.settings.sync_folder || ""; // Default to empty string if undefined
		const pdfFilePath = rootFolder ? `${rootFolder}/${sanitizedName}.pdf` : `${sanitizedName}.pdf`
		const mdFilePath = rootFolder ? `${rootFolder}/${sanitizedName}.md` : `${sanitizedName}.md`

		// Use the proper API to find the file
		const pdf = app.vault.getFileByPath(pdfFilePath);
		const md = app.vault.getFileByPath(mdFilePath);
		return {pdf, md};
	}
}
