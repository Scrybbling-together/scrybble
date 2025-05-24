import {ContextMenuItem, FileNavigator} from "../../@types/scrybble";

export class MockFileNavigator implements FileNavigator {
	public openedFiles: Array<{ path: string, method: string }> = [];
	public lastContextMenu: ContextMenuItem[] | null = null;
	private files: Map<string, any> = new Map();

	// Test helper to set up mock files
	setMockFile(path: string, file: any): void {
		this.files.set(path, file);
	}

	async openInNewTab(filePath: string): Promise<void> {
		this.openedFiles.push({path: filePath, method: 'newTab'});
	}

	async openInVerticalSplit(filePath: string): Promise<void> {
		this.openedFiles.push({path: filePath, method: 'verticalSplit'});
	}

	async openInHorizontalSplit(filePath: string): Promise<void> {
		this.openedFiles.push({path: filePath, method: 'horizontalSplit'});
	}

	getFileByPath(path: string): any | null {
		return this.files.get(path) || null;
	}

	showContextMenu(event: MouseEvent, items: ContextMenuItem[]): void {
		this.lastContextMenu = items;
		// In tests, you could trigger the onClick handlers manually
	}
}
