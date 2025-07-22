Feature: File Detection with Different Output Folder Configurations
	As a user of the Scrybble plugin
	I want the plugin to correctly detect PDF and Markdown files
	Regardless of where I configure the output path

	Background:
		Given The user has logged in locally
		*     The user's access token is valid on the server
		*     The reMarkable has a file called "Diary" in the "/" folder
		*     The file "Diary" in the folder "/" has been downloaded "2 weeks ago"

	Scenario Outline: File detection with configured output folder "<output_folder>" - no files present
		Given The Scrybble folder is configured to be "<output_folder>"

		When  The user opens the Scrybble interface
		Then  The interface should say "reMarkable file tree"
		*     The interface should say "Diary"
		And   The "pdf" link for "Diary" is "unavailable"
		*     The "md" link for "Diary" is "unavailable"

		Examples:
			| output_folder        | description                            |
			| /                    | Root folder configuration              |
			| /scrybble            | Absolute path with subfolder           |
			| /scrybble/           | Absolute path with trailing slash      |
			| scrybble             | Relative path without slashes          |
			| scrybble/            | Relative path with trailing slash      |
			| /external/reMarkable | Deep absolute path                     |
			| external/reMarkable  | Deep relative path                     |
			| external/reMarkable/ | Deep relative path with trailing slash |

	Scenario Outline: File detection with configured output folder "<output_folder>" - PDF file present
		Given The Scrybble folder is configured to be "<output_folder>"
		*     There is a file called "Diary.pdf" in the "<output_folder>" folder

		When  The user opens the Scrybble interface
		Then  The interface should say "reMarkable file tree"
		*     The interface should say "Diary"
		And   The "pdf" link for "Diary" is "available"
		*     The "md" link for "Diary" is "unavailable"

		Examples:
			| output_folder                   | description                                    |
			| /                               | Root folder configuration                      |
			| /scrybble                       | Absolute path with subfolder                   |
			| scrybble                        | Relative path without slashes                  |
			| /external/reMarkable            | Deep absolute path                             |
			| /external/reMarkable/           | Deep absolute path trailing slash              |
			| external/reMarkable/            | Deep absolute no start slash                   |
			| external/reMarkable/            | Deep absolute no supporting slashes altogether |
			| /02 Knowledgebase/00 remarkable | Real-world regression                          |

	Scenario Outline: File detection with configured output folder "<output_folder>" - MD file present
		Given The Scrybble folder is configured to be "<output_folder>"
		*     There is a file called "Diary.md" in the "<output_folder>" folder

		When  The user opens the Scrybble interface
		Then  The interface should say "reMarkable file tree"
		*     The interface should say "Diary"
		And   The "pdf" link for "Diary" is "unavailable"
		*     The "md" link for "Diary" is "available"

		Examples:
			| output_folder                   | description                                    |
			| /                               | Root folder configuration                      |
			| /scrybble                       | Absolute path with subfolder                   |
			| scrybble                        | Relative path without slashes                  |
			| /external/reMarkable            | Deep absolute path                             |
			| /external/reMarkable/           | Deep absolute path trailing slash              |
			| external/reMarkable/            | Deep absolute no start slash                   |
			| external/reMarkable/            | Deep absolute no supporting slashes altogether |
			| /02 Knowledgebase/00 remarkable | Real-world regression                          |

	Scenario Outline: File detection with configured output folder "<output_folder>" - both files present
		Given The Scrybble folder is configured to be "<output_folder>"
		*     There is a file called "Diary.pdf" in the "<output_folder>" folder
		*     There is a file called "Diary.md" in the "<output_folder>" folder

		When  The user opens the Scrybble interface
		Then  The interface should say "reMarkable file tree"
		*     The interface should say "Diary"
		And   The "pdf" link for "Diary" is "available"
		*     The "md" link for "Diary" is "available"

		Examples:
			| output_folder                   | description                                    |
			| /                               | Root folder configuration                      |
			| /scrybble                       | Absolute path with subfolder                   |
			| scrybble                        | Relative path without slashes                  |
			| /external/reMarkable            | Deep absolute path                             |
			| /external/reMarkable/           | Deep absolute path trailing slash              |
			| external/reMarkable/            | Deep absolute no start slash                   |
			| external/reMarkable/            | Deep absolute no supporting slashes altogether |
			| /02 Knowledgebase/00 remarkable | Real-world regression                          |
