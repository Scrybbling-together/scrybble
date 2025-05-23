/**
 * Replaces a random percentage of characters in a string with asterisks
 * @param {string} str - The string to obfuscate
 * @param {number} percentage - Percentage of characters to replace (0-100)
 * @returns {string} The obfuscated string
 */
export function obfuscateString(str: string, percentage: number) {
	// Validate inputs
	if (typeof str !== 'string') return '';
	if (typeof percentage !== 'number' || percentage < 0 || percentage > 100) {
		throw new Error('Percentage must be a number between 0 and 100');
	}

	// Handle edge cases
	if (str.length === 0 || percentage === 0) return str;
	if (percentage === 100) return '_'.repeat(str.length);

	// Convert string to array for manipulation
	const chars = str.split('');

	// Calculate how many characters to replace
	const charsToReplace = Math.round((percentage / 100) * str.length);

	// Create array of indices and shuffle it
	const indices = Array.from({ length: str.length }, (_, i) => i);
	shuffleArray(indices);

	// Replace characters at the first charsToReplace indices
	for (let i = 0; i < charsToReplace; i++) {
		chars[indices[i]] = '_';
	}

	// Join back to string and return
	return chars.join('');
}

// Fisher-Yates shuffle algorithm for randomizing indices
function shuffleArray(array: any[]) {
	for (let i = array.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[array[i], array[j]] = [array[j], array[i]];
	}
}

/**
 * Dir paths always end with /
 * @param filePath
 */
export function dirPath(filePath: string): string {
	const atoms = filePath.split("/")
	const dirs = atoms.slice(0, atoms.length - 1)
	return dirs.filter((a) => Boolean(a)).join("/") + "/"
}

export function basename(filePath: string): string {
	const atoms = filePath.split("/")
	return atoms[atoms.length - 1]
}

export function sanitizeFilename(filePath: string, ignoreSlashes=false): string {
	const tokens = ['*', '"', "\\", "<", ">", ":", "|", "?"];
	if (!ignoreSlashes) {
		tokens.push("/");
	}

	tokens.forEach((token) => {
		const regex = new RegExp('\\' + token, 'g');
		filePath = filePath.replace(regex, "_");
	});

	return filePath;
}
