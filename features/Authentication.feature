Feature: OAuth Authentication

	Scenario: Logging in using device flow
		When The plugin initializes
		*    The user opens the Scrybble interface
		Then The interface should say "Connect to Scrybble"

		When The user clicks on the "Files" button

		And  The user clicks on the "Sign in with Scrybble" button
		Then The OAuth flow should be initiated
		*    The interface should say "Complete Authorization"
		*    The plugin should be polling the website for successful authentication

		When The user clicks on the "Open Authorization Page" button
		Then The browser should open with the authorization URL

		When The user authorizes the login on the server
		And  The server creates access tokens for the user
		*    The user should be logged in

		Then The interface should say "Welcome back Test user"
		*    The interface should say "You're connected to Scrybble"

	Scenario: Accessing file tree and sync history is only possible when logged in
		When The plugin initializes
		*    The user opens the Scrybble interface
		Then The interface should say "Connect to Scrybble"

		# Navigation to the files page is disabled
		When The user clicks on the "Files" button
		Then The interface should say "Connect to Scrybble"

		When The user clicks on the "Sign in with Scrybble" button
		*    The user authorizes the login on the server
		*    The server creates access tokens for the user
		*    The user should be logged in

		When The user clicks on the "Files" button
		Then The interface should say "reMarkable file tree"

	Scenario: Canceling OAuth authentication flow
		When The plugin initializes
			* The user opens the Scrybble interface
		Then The interface should say "Connect to Scrybble"

		And  The user clicks on the "Sign in with Scrybble" button
		Then The interface should say "Complete Authorization"

		When The user clicks on the "Cancel" button
		Then The interface should say "Connect to Scrybble"

	Scenario: The access token has expired, and will be refreshed
		Given The user has logged in locally
		*     The user's access token has expired on the server

		When The plugin initializes
		*    The user opens the Scrybble interface

		Then The client requests a new access token using the refresh token

		And The user clicks on the "Account" button
		*   The interface should say "Welcome back Test user"
		*   The interface should say "You're connected to Scrybble"
