import {After, IWorldOptions, World} from "@cucumber/cucumber";
import {ScrybbleCommon, ScrybblePersistentStorage} from "../../@types/scrybble";
import {MockScrybbleApi} from "./MockScrybbleApi";
import sinon, {SinonSpy} from "sinon";
import {MockFileNavigator} from "./MockFileNavigator";
import {expect} from "chai";
import {PKCEUtils} from "../../src/oauth";
import {SettingsImpl} from "../../src/SettingsImpl";

export class ObsidianWorld extends World {
	public container: HTMLDivElement | null;
	public api: MockScrybbleApi;

	public spies: {
		initiateOAuthFlow: SinonSpy;
		fetchGetUser: SinonSpy;
		windowOpen: SinonSpy;
	};

	private oauthCallbacks: Array<(data: any) =>void> = [];

	public readonly scrybble: ScrybbleCommon;

	constructor(options: IWorldOptions) {
		super(options);
		this.container = null;
		this.api = new MockScrybbleApi();

		const self = this;
		this.scrybble = {
			api: this.api,
			sync: {
				requestSync(filename: string) {
				}
			},
			settings: new SettingsImpl({
				sync_folder: "scrybble",
				sync_state: {},
				custom_host: {
					client_secret: "",
					endpoint: ""
				},
				self_hosted: false
			}),
			fileNavigator: new MockFileNavigator(),
			meta: {
				scrybbleVersion: "dev",
				obsidianVersion: "unknown",
				platformInfo: "development"
			},
			initiateOAuthFlow: async () => {
				await PKCEUtils.initiateOAuthFlow(self.scrybble.settings)
			},
			setOnOAuthCompletedCallback: (callback: () => void) => {
				this.oauthCallbacks.push(callback);
			},
			setOnAuthenticatedCallback: (callback: (successCallback: boolean) => void) => {
			},
			user: {loaded: false}
		};

		this.spies = {
			initiateOAuthFlow: sinon.spy(this.scrybble, 'initiateOAuthFlow'),
			fetchGetUser: sinon.spy(this.api, 'fetchGetUser'),
			windowOpen: sinon.spy(window, 'open')
		};
	}

	cleanup() {
		// Restore all spies after tests
		Object.values(this.spies).forEach(spy => {
			if (spy && spy.restore) {
				spy.restore();
			}
		});
	}

	hasLoggedInLocally() {
		this.scrybble.settings.access_token = "access-abcdefg";
		this.scrybble.settings.refresh_token = "refresh-abcdefg";
	}

	isLoggedIn() {
		this.api.isLoggedIn();
	}

	isNotLoggedIn() {
		this.scrybble.settings.access_token = undefined;
		this.scrybble.settings.refresh_token = undefined;
		this.api.isNotLoggedIn();
	}

	async simulateOAuthCallback(data: { code: string; state: string }) {
		// Simulate the OAuth callback being received
		for (const callback of this.oauthCallbacks) {
			await callback(data);
		}
	}

	onOAuthCallback(callback: (data: any) => Promise<void>) {
	}


	[key: string]: any;
}

