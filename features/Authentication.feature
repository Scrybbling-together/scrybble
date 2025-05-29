Feature: OAuth Authentication

	Scenario: Setting up OAuth for the first time
		Given The user is not logged in
		And   The user's access token is valid on the server

		When The user opens the Scrybble interface
		Then The interface should tell me "Connect to Scrybble"
		And  The user clicks on the "Sign in with Scrybble" button
		Then The OAuth flow should be initiated
		*    The browser should open with the authorization URL
		*    The user's access token is valid on the server
		*    The plugin receives a callback from the browser
		When The OAuth callback is received with valid credentials
		Then The user should be logged in

		And The interface should tell me "Welcome back"
		* The interface should tell me "Welcome back Test user"
		* The interface should tell me "You're connected to Scrybble"
