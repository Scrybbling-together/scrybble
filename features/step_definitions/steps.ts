import "../support/MockObsidian"
import {Then, When} from "@cucumber/cucumber";
import {html, render} from "lit-html";
import {expect} from "chai";
import loadLitComponents from "../../src/ui/loadComponents";
import {ObsidianWorld} from "../support/ObsidianWorld";
import {HTMLSpanElement} from "happy-dom";

loadLitComponents();

When("The user opens the Scrybble interface", async function (this: ObsidianWorld) {
	this.container = document.createElement('div');
	document.body.appendChild(this.container as Node);

	render(html`<sc-ui
		.scrybble="${this.scrybble}"
		.onViewSwitch="${() => {}}"
		.onErrorRefresh="${() => {}}"
	/>`, this.container)

	await new Promise(resolve => setTimeout(resolve, 250));
});

When("The user clicks on the {string} button", async function (this: ObsidianWorld, text) {
	const elements = Array.from((this.container as HTMLDivElement).querySelectorAll(`button`));
	const element = elements.find(el => el.innerText.includes(text));

	expect(element).to.not.be.null;

	if (element) {
		(element as HTMLButtonElement).click();
	}

	await new Promise(resolve => setTimeout(resolve, 250));
});

Then("The interface should say {string}", async function (text) {
	await new Promise(resolve => setTimeout(resolve, 100));
	expect(this.container.innerText).to.include(text);
});
When("The plugin initializes", async function (this: ObsidianWorld) {
	console.log("Initializing plugin");
	await this.authentication.initializeAuth();
});

function findFileByNameInReMarkableFiletree(world: ObsidianWorld, name: string) {
	const files = Array.from(world.container!.querySelectorAll("sc-rm-file"));
	const ts = files.filter(node => ((node.querySelector(".filename") as unknown) as HTMLElement).innerText === name);
	return ts[0];
}

Then("The {string} link for {string} is {string}", function (this: ObsidianWorld, pdfOrMD: string, filename: string, className: string) {
	if (!["pdf", "md"].includes(pdfOrMD)) {
		throw new Error("The first parameter to this Then should be `pdf` or `md` and nothing else");
	}
	if (!["available", "unavailable"].includes(className)) {
		throw new Error("The third parameter to this Then should be `available` or `unavailable` and nothing else");
	}
	const requestedFile = findFileByNameInReMarkableFiletree(this, filename);

	const button: HTMLSpanElement = (requestedFile.querySelector(`.${pdfOrMD}`) as unknown) as HTMLSpanElement;
	expect(Array.from(button.classList)).to.contain(className);
});
