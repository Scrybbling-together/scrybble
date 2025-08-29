import {ContextMenuItem, FileNavigator} from "../@types/scrybble";
import {App, Menu} from "obsidian";

export class ObsidianFileNavigator implements FileNavigator {
	constructor(private app: App) {
	}

	async openInNewTab(filePath: string): Promise<void> {
		const file = this.app.vault.getFileByPath(filePath);
		if (file) await this.app.workspace.getLeaf(true).openFile(file);
	}

	async openInVerticalSplit(filePath: string): Promise<void> {
		const file = this.app.vault.getFileByPath(filePath);
		if (file) {
			await this.app.workspace.getLeaf("split", "vertical").openFile(file);
		}
	}

	async openInHorizontalSplit(filePath: string): Promise<void> {
		const file = this.app.vault.getFileByPath(filePath);
		if (file) {
			await this.app.workspace.getLeaf("split", "horizontal").openFile(file);
		}
	}

	getFileByPath(path: string): any | null {
		return this.app.vault.getFileByPath(path);
	}

	showContextMenu(event: MouseEvent, items: ContextMenuItem[]): void {
		const menu = new Menu();

		items.forEach(item => {
			if (item.isSeparator) {
				menu.addSeparator();
			} else {
				menu.addItem(menuItem => {
					menuItem
						.setTitle(item.title)
						.setIcon(item.icon)
						.setDisabled(item.disabled || false);

					if (item.onClick) {
						menuItem.onClick(item.onClick);
					}
				});
			}
		});

		menu.showAtMouseEvent(event);
	}
}

