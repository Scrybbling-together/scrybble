import {ObsidianWorld} from "../support/ObsidianWorld";
import path from "node:path";

const {Given} = require("@cucumber/cucumber");
Given("The Scrybble folder is configured to be {string}", function (this: ObsidianWorld, config_value: string) {
	this.scrybble.settings.sync_folder = config_value;
});
Given("There is a file called {string} in the {string} folder", function (this: ObsidianWorld, filename: string, folder: string) {
	const filename1 = path.join(folder, filename);
	this.addObsidianFile(filename1, "a file");
});
