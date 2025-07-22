Feature: File Link Visibility in the reMarkable file tree

	Scenario: Markdown link is greyed out if there is no corresponding Markdown file
		Given The user has logged in locally
		*     The reMarkable has a file called "Diary" in the "/" folder
		*     The file "Diary" in the folder "/" has been downloaded "2 weeks ago"
		*     The user's access token is valid on the server
		*     The plugin initializes

		And   The user opens the Scrybble interface
		Then  The interface should say "reMarkable file tree"
		*     The interface should say "Diary"
		*     The PDF link for "Diary" is greyed out


