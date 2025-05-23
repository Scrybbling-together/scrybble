Feature: UI Navigation

	Scenario: Opening Obsidian
		Given The user is not logged in
		When I open the Scrybble interface
		Then The interface should tell me "Not logged in"

