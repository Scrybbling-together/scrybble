Feature: UI Navigation

	Scenario: Refresh button on error refreshes as expected
		Given The user has logged in locally
		*     The user's access token is valid on the server
		*     The server responds to the "fetchOnboardingState" request with a 401 status code

		When The plugin initializes
		*    The user opens the Scrybble interface
		Then The interface should say "Something went wrong"

		But  The server responds to the "fetchOnboardingState" as usual
		And  The user clicks on the "Refresh" button
		Then The interface should say "reMarkable file tree"

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

