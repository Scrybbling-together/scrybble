import {Given, Then, When} from "@cucumber/cucumber";
import {ObsidianWorld} from "../support/ObsidianWorld";
import {expect} from "chai";

Given("The user is not logged in", function (this: ObsidianWorld) {
	this.isNotLoggedIn();
});

Given("The user has logged in locally", function (this: ObsidianWorld) {
	this.hasLoggedInLocally();
});

function loggedIn(this: ObsidianWorld) {
	this.api.isLoggedIn();
}

Given("The user's access token is valid on the server", loggedIn);
Given("The server creates access tokens for the user", loggedIn);

Then("The OAuth flow should be initiated", function (this: ObsidianWorld) {
	expect(this.spies.initiateOAuthFlow).to.have.been.calledOnce;
});

When("The OAuth callback is received with valid credentials", async function (this: ObsidianWorld) {
	// Simulate the OAuth callback
	const mockCode = "test_authorization_code";
	const mockState = localStorage.getItem('scrybble_oauth_state') || "test_state";

	// Simulate the OAuth protocol handler being called
	// This would normally happen through the obsidian:// URL scheme
	const oauthData = { code: mockCode, state: mockState };

	// Find the scrybble UI component and trigger the OAuth callback
	const scrybbleUI = this.container?.querySelector('scrybble-ui');
	if (scrybbleUI) {
		// Trigger the OAuth completed callback
		await this.simulateOAuthCallback(oauthData);
	}

	// Wait for the UI to update
	await new Promise(resolve => setTimeout(resolve, 100));
});

Then("The browser should open with the authorization URL", function (this: ObsidianWorld) {
	expect(localStorage.getItem('scrybble_code_verifier')).to.not.be.null;
	expect(localStorage.getItem('scrybble_oauth_state')).to.not.be.null;
	expect(this.spies.windowOpen).to.have.been.calledOnce;
});

Then("The plugin receives a callback from the browser", function (this: ObsidianWorld) {
	this.scrybble.settings.access_token = "test_access_token";
	this.scrybble.settings.refresh_token = "test_refresh_token";
	this.isLoggedIn();
});

Then("The user should be logged in", function (this: ObsidianWorld) {
	expect(this.scrybble.settings.access_token).to.equal("test_access_token");
});
