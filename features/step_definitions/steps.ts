import "../support/MockObsidian"
import {MockFileNavigator} from "../support/MockFileNavigator";
import {Given, IWorldOptions, setWorldConstructor, Then, When, World} from "@cucumber/cucumber";
import {html, render} from "lit-html";
import {expect} from "chai";
import {ScrybbleCommon, ScrybblePersistentStorage} from "../../@types/scrybble";
import loadLitComponents from "../../src/ui/Components/loadComponents";
import {MockScrybbleApi} from "../support/MockScrybbleApi";

loadLitComponents();

class ObsidianWorld extends World {
	public container: HTMLDivElement | null;
	public storage: ScrybblePersistentStorage;
	public api: MockScrybbleApi;

	constructor(options: IWorldOptions) {
		super(options);
		this.container = null;
		this.storage = {
			access_token: null
		};
		this.api = new MockScrybbleApi();
	}

	[key: string]: any;
}

setWorldConstructor(ObsidianWorld);

Given(/^The user is not logged in$/, function (this: ObsidianWorld) {
	this.storage = {
		access_token: null
	}
});

Given(/^The user is logged in$/, function (this: ObsidianWorld) {
	this.storage = {
		access_token: "aslkdjfa"
	}
});

When(/^The user opens the Scrybble interface$/, async function (this: ObsidianWorld) {
	const scrybble: ScrybbleCommon = {
		api: this.api,
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
		fileNavigator: new MockFileNavigator(),
		meta: {
			scrybbleVersion: "dev",
			obsidianVersion: "unknown",
			platformInfo: "development"
		},
		setOnOAuthCompletedCallback: (callback: () => void) => {},
		user: null
	};

	this.container = document.createElement('div');
	document.body.appendChild(this.container as Node);

	render(html`<scrybble-ui
		.scrybble="${scrybble}"
		.onViewSwitch="${() => {}}"
		.onErrorRefresh="${() => {}}"
	></scrybble-ui>`, this.container)
});

When("The user clicks on the {string} button", function (this: ObsidianWorld, text) {
	const elements = Array.from((this.container as HTMLDivElement).querySelectorAll(`button`));
	const element = elements.find(el => el.innerText.includes(text));

	expect(element).to.not.be.null;

	if (element) {
		(element as HTMLButtonElement).click();
	}
});

Then("The interface should tell me {string}", function (text) {
	expect(this.container.innerText, this.container.innerText).to.include(text);
});

When("The server is unreachable", function (this: ObsidianWorld) {
	this.api.serverIsUnreachable();
});
When("The server is reachable", function (this: ObsidianWorld) {
	this.api.serverIsReachable();
});

When("The server responds to the {string} request with a {int} status code", function (this: ObsidianWorld, text, statusCode) {
	this.api.requestWillFailWithStatusCode(text, statusCode);
});
When("The server responds to the {string} as usual", function (this: ObsidianWorld, text) {
	this.api.requestGoesAsNormal(text);
});
