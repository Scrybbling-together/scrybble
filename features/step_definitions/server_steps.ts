import {Given, Then, When} from "@cucumber/cucumber";
import {ObsidianWorld} from "../support/ObsidianWorld";
import {expect} from "chai";
import {HTMLSpanElement} from "happy-dom";

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

Given("The reMarkable has a file called {string} in the {string} folder", function (this: ObsidianWorld, name: string, path: string) {
	this.api.addFile({
		type: "f",
		path,
		name
	})
});

let id = 0;
Given("The file {string} in the folder {string} has been downloaded {string}", function (this: ObsidianWorld, name, path, when) {
	const file = `${path}${name}`;
	this.scrybble.settings.sync_state[file] = id;
	this.api.add_synced_file(file, when);
	id += 1
});
