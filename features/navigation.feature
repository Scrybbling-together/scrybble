Feature: UI Navigation

	Scenario: Refresh button on error refreshes as expected
		Given The user has logged in locally
		And   The user's access token is valid on the server
		When The server responds to the "fetchOnboardingState" request with a 401 status code
		And  The user opens the Scrybble interface
		Then The interface should tell me "Something went wrong"
		But  The server responds to the "fetchOnboardingState" as usual
		And  The user clicks on the "Refresh" button
		Then The interface should tell me "reMarkable file tree"

	Scenario: You can navigate to the support page when the server is unreachable
		Given The user is not logged in
		When The user opens the Scrybble interface
		But The server is unreachable
		When The user clicks on the "Support" button
		Then The interface should tell me "Scrybble Support"

	Scenario: Logging in
		Given The user is not logged in
		When The user opens the Scrybble interface
		Then The interface should tell me "Connect to Scrybble"

	Scenario: Opening Scrybble
		Given The user has logged in locally
		And   The user's access token is valid on the server
		When The user opens the Scrybble interface
		Then The interface should tell me "reMarkable file tree"
		And The interface should tell me "Current directory is /"

