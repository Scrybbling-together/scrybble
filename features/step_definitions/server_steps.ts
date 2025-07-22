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
Then("The PDF link for {string} is greyed out", function (this: ObsidianWorld, name: string) {
	const files = Array.from(this.container!.querySelectorAll("rm-file"));
	const requestedFile = files.filter(node => ((node.querySelector(".filename") as unknown) as HTMLElement).innerText === name)[0];

	const pdfButton: HTMLSpanElement = (requestedFile.querySelector(".pdf") as unknown) as HTMLSpanElement;
	expect(Array.from(pdfButton.classList)).to.contain("unavailable");
});
Then("The MD link for {string} is greyed out", function (this: ObsidianWorld, name: string) {
	const files = Array.from(this.container!.querySelectorAll("rm-file"));
	const requestedFile = files.filter(node => ((node.querySelector(".filename") as unknown) as HTMLElement).innerText === name)[0];

	const mdButton: HTMLSpanElement = (requestedFile.querySelector("span.md") as unknown) as HTMLSpanElement;
	expect(Array.from(mdButton.classList)).to.contain("unavailable");
});

let id = 0;
Given("The file {string} in the folder {string} has been downloaded {string}", function (this: ObsidianWorld, name, path, when) {
	const file = `${path}${name}`;
	this.scrybble.settings.sync_state[file] = id;
	this.api.add_synced_file(file, when);
	id += 1
});
