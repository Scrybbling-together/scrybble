import {ContextMenuItem, FileNavigator} from "../../@types/scrybble";
import path from "path";

export class MockFileNavigator implements FileNavigator {
	public openedFiles: Array<{ path: string, method: string }> = [];
	public lastContextMenu: ContextMenuItem[] | null = null;
	private files: Map<string, any> = new Map();

	setMockFile(path: string, file: any): void {
		if (path.startsWith("/")) {
			path = path.replace(/^\//, "");
		}

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

	getFileByPath(requestedPath: string): any | null {
		const dirname = path.dirname(requestedPath);
		// Obsidian always returns null for absolute paths
		if (path.isAbsolute(dirname)) {
			return null;
		}
		for (let existingPath of this.files.keys()) {
			if (path.relative(requestedPath, existingPath) === "") {
				return this.files.get(requestedPath);
			}
		}
	}

	showContextMenu(event: MouseEvent, items: ContextMenuItem[]): void {
		this.lastContextMenu = items;
		// In tests, you could trigger the onClick handlers manually
	}
}
