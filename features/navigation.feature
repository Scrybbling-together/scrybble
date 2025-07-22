Feature: UI Navigation
	Scenario: You can navigate to the support page when the server is unreachable
		Given The plugin initializes
		When The user opens the Scrybble interface

		But The server is unreachable
		When The user clicks on the "Support" button
		Then The interface should say "Scrybble Support"

	Scenario: Logging in
		Given The plugin initializes
		When The user opens the Scrybble interface
		Then The interface should say "Connect to Scrybble"

	Scenario: Opening Scrybble
		Given The user has logged in locally
		*     The user's access token is valid on the server

		When The plugin initializes
		*    The user opens the Scrybble interface
		Then The interface should say "reMarkable file tree"
		And The interface should say "Current directory is /"

