import { GlobalRegistrator } from "@happy-dom/global-registrator";
import {After, setWorldConstructor} from "@cucumber/cucumber";
import {ObsidianWorld} from "../support/ObsidianWorld";
import sinonChai from "sinon-chai";
import chai from "chai";

// set-up happy-dom
GlobalRegistrator.register();

// configure the world for cucumber shared state
setWorldConstructor(ObsidianWorld);
After(function (this: ObsidianWorld) {
	this.cleanup();
});

chai.use(sinonChai);
