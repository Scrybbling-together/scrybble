import {Before, IWorldOptions, World} from "@cucumber/cucumber";
import {ScrybbleCommon} from "../../@types/scrybble";
import {MockScrybbleApi} from "./MockScrybbleApi";
import sinon, {SinonSpy} from "sinon";
import {MockFileNavigator} from "./MockFileNavigator";
import {Authentication} from "../../src/Authentication";
import {SettingsImpl} from "../../src/SettingsImpl";

export class ObsidianWorld extends World {
	public container: HTMLDivElement | null;
	public api: MockScrybbleApi;
	public authentication: Authentication;

	public spies: {
		initiateDeviceFlow: SinonSpy;
		refreshAccessToken: SinonSpy;
		fetchGetUser: SinonSpy;
		pollForDeviceToken: SinonSpy;
		windowOpen: SinonSpy;
	};

	public readonly scrybble: ScrybbleCommon;

	constructor(options: IWorldOptions) {
		super(options);
		this.container = null;

		const settings = new SettingsImpl({
			sync_folder: "scrybble",
			sync_state: {},
			custom_host: {
				client_secret: "",
				endpoint: ""
			},
			self_hosted: false
		}, () => {
			return Promise.resolve();
		});

		this.api = new MockScrybbleApi(settings);

		this.authentication = new Authentication(settings, this.api);
		this.scrybble = {
			api: this.api,
			sync: {
				requestSync(filename: string) {
				}
			},
			settings,
			authentication: this.authentication,
			fileNavigator: new MockFileNavigator(),
			meta: {
				scrybbleVersion: "dev",
				obsidianVersion: "unknown",
				platformInfo: "development"
			}
		};

		this.spies = {
			initiateDeviceFlow: sinon.spy(this.authentication, 'initiateDeviceFlow'),
			pollForDeviceToken: sinon.spy(this.api, 'fetchPollForDeviceToken'),
			fetchGetUser: sinon.spy(this.api, 'fetchGetUser'),
			refreshAccessToken: sinon.spy(this.api, 'fetchRefreshOAuthAccessToken'),
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

	[key: string]: any;
}
