const mockObsidian = {
	getIcon: (name: string) => `[${name}]`
};

// Mock the module
const Module = require('module');
const originalRequire = Module.prototype.require;
Module.prototype.require = function (...args: any) {
	if (args[0] === 'obsidian') {
		return mockObsidian;
	}
	return originalRequire.apply(this, args);
};
