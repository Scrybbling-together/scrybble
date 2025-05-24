Feature: UI Navigation

	Scenario: Refresh button on error refreshes as expected
		Given The user is logged in
		When The server responds to the "fetchOnboardingState" request with a 401 status code
		And  The user opens the Scrybble interface
		Then The interface should tell me "Something went wrong"
		But  The server responds to the "fetchOnboardingState" as usual
		And  The user clicks on the "Refresh" button
		Then The interface should tell me "reMarkable file tree"

	Scenario: Logging in
		Given The user is not logged in
		When The user opens the Scrybble interface
		Then The interface should tell me "Not logged in"

	Scenario: Logging in
		Given The user is not logged in
		When The user opens the Scrybble interface
		And  The user clicks on the "Refresh" button
		Then The interface should tell me "Not logged in"

	Scenario: Opening Scrybble
		Given The user is logged in
		When The user opens the Scrybble interface
		Then The interface should tell me "reMarkable file tree"
		And The interface should tell me "Current directory is /"
			
