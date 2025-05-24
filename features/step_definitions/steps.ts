import {LitElement} from "lit-element";

const mockObsidian = {
	getIcon: (name: string) => `[${name}]`
};

// Mock the module
const Module = require('module');
const originalRequire = Module.prototype.require;
Module.prototype.require = function (...args: any) {
	if (args[0] === 'obsidian') {
		return mockObsidian;
	}
	return originalRequire.apply(this, args);
};

import {Given, Then, When} from "@cucumber/cucumber";
import {html, render} from "lit-html";
import {expect} from "chai";
import {
	ContextMenuItem,
	FileNavigator,
	PaginatedResponse,
	RMFileTree,
	ScrybbleApi,
	ScrybbleCommon,
	SyncDelta,
	SyncItem
} from "../../@types/scrybble";
import loadLitComponents from "../../src/ui/Components/loadComponents";
import {ScrybbleUI} from "../../src/ui/Components/ScrybbleUI";
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

const api: ScrybbleApi = {
	async fetchFileTree(path: string): Promise<RMFileTree> {
		const tree: RMFileTree = {
			items: [],
			cwd: "/"
		}
		return Promise.resolve(tree);
	},
	fetchOAuthToken(username: string, password: string): Promise<{ access_token: string }> {
		return Promise.resolve({access_token: ""});
	},
	fetchOnboardingState(): Promise<"unauthenticated" | "setup-gumroad" | "setup-one-time-code" | "setup-one-time-code-again" | "ready"> {
		return Promise.resolve("unauthenticated");
	},
	fetchPaginatedSyncHistory(page: number): Promise<PaginatedResponse<SyncItem>> {
		const t: PaginatedResponse<SyncItem> = {
			data: [],
			current_page: 0,
			last_page: 0,
			per_page: 0,
			total: 0
		}
		return Promise.resolve(t);
	},
	fetchRequestFileToBeSynced(filePath: string): Promise<{ sync_id: number; filename: string }> {
		return Promise.resolve({filename: "", sync_id: 0});
	},
	fetchSyncDelta(): Promise<ReadonlyArray<SyncDelta>> {
		return Promise.resolve([]);
	},
	fetchSyncState(sync_id: number): Promise<any> {
		return Promise.resolve(undefined);
	}
}

Given(/^The user is not logged in$/, function () {
	this.storage = {
		access_token: null
	}
});

When(/^I open the Scrybble interface$/, async function () {
	loadLitComponents();
	const scrybble: ScrybbleCommon = {
		api,
		storage: this.storage,
		sync: {
			requestSync(filename: string) {
			}
		},
		settings: {
			sync_folder: "scrybble",
			sync_state: {},
			last_successful_sync_id: 0,
			custom_host: {
				client_secret: "",
				endpoint: ""
			},
			self_hosted: false
		},
		fileNavigator: new MockFileNavigator()
	};

	this.container = document.createElement('div');
	document.body.appendChild(this.container);

	render(html`<scrybble-ui
		.scrybble="${scrybble}"
		.onViewSwitch="${() => {}}"
		.onErrorRefresh="${() => {}}"
	></scrybble-ui>`, this.container)
});

Then("The interface should tell me {string}", function (text) {
	console.log("The container contains the following text", this.container.textContent)
	expect(this.container.innerText).to.include(text);
});
