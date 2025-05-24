import { GlobalRegistrator } from "@happy-dom/global-registrator";

GlobalRegistrator.register();


// AfterAll(async function () {
// 	window.close()
// })

// import { JSDOM } from 'jsdom';
//
// // Set up jsdom immediately when module loads
// const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
// 	url: 'http://localhost',
// 	pretendToBeVisual: true,
// 	resources: 'usable'
// });
//
// global.window = dom.window as any;
// global.document = dom.window.document;
//
// // Keep the AfterAll for cleanup
// import { AfterAll } from '@cucumber/cucumber';
//
// AfterAll(async function() {
// 	if (dom) {
// 		dom.window.close();
// 	}
// });
