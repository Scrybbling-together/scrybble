import {Given, Then, When} from "@cucumber/cucumber";
import {ObsidianWorld} from "../support/ObsidianWorld";
import {expect} from "chai";

Given("The user has logged in locally", function (this: ObsidianWorld) {
	this.hasLoggedInLocally();
});

function loggedIn(this: ObsidianWorld) {
	this.api.isLoggedIn();
}

Given("The user's access token is valid on the server", loggedIn);
Given("The server creates access tokens for the user", loggedIn);

Then("The OAuth flow should be initiated", function (this: ObsidianWorld) {
	expect(this.spies.initiateDeviceFlow).to.have.been.calledOnce;
});

Then("The browser should open with the authorization URL", function (this: ObsidianWorld) {
	expect(this.spies.windowOpen).to.have.been.calledOnce;
});

Then("The plugin receives a callback from the browser", function (this: ObsidianWorld) {
	this.scrybble.settings.access_token = "test_access_token";
	this.scrybble.settings.refresh_token = "test_refresh_token";
	this.isLoggedIn();
});

Then("The user should be logged in", async function (this: ObsidianWorld) {
	await new Promise(resolve => setTimeout(resolve, 2500));
	expect(this.scrybble.settings.access_token).to.equal("test_access_token");
});
Given("The user's access token has expired on the server", function (this: ObsidianWorld) {
	this.api.accessTokenIsExpired();
});
Then("The client requests a new access token using the refresh token", async function (this: ObsidianWorld) {
	expect(this.spies.refreshAccessToken).to.have.been.calledOnce;
});
Then("The plugin should be polling the website for successful authentication", async function (this: ObsidianWorld) {
	await new Promise(resolve => setTimeout(resolve, 2500));
	expect(this.spies.pollForDeviceToken).to.have.been.calledOnce;
});
When("The user authorizes the login on the server", async function (this: ObsidianWorld) {
	this.api.authorizeDeviceToken();
});
