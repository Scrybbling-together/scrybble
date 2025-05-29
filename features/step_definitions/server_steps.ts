import {When} from "@cucumber/cucumber";
import {ObsidianWorld} from "../support/ObsidianWorld";

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
