Feature: OAuth Authentication

	Scenario: Setting up OAuth for the first time
		When The plugin initializes
		*    The user opens the Scrybble interface
		Then The interface should say "Connect to Scrybble"

		And  The user clicks on the "Sign in with Scrybble" button
		Then The OAuth flow should be initiated
		*    The browser should open with the authorization URL
		*    The server creates access tokens for the user
		*    The plugin receives a callback from the browser
		When The OAuth callback is received with valid credentials
		Then The user should be logged in

		And The interface should say "Welcome back Test user"
		*   The interface should say "You're connected to Scrybble"

	Scenario: The access token has expired, and will be refreshed
		Given The user has logged in locally
		*     The user's access token has expired on the server

		When The plugin initializes
		*    The user opens the Scrybble interface

		Then The client requests a new access token using the refresh token

		And The user clicks on the "Account" button
		*   The interface should say "Welcome back Test user"
		*   The interface should say "You're connected to Scrybble"
