import { requestUrl } from 'obsidian';

export class PKCEUtils {
	private static generateRandomString(length: number): string {
		const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
		const values = crypto.getRandomValues(new Uint8Array(length));
		return values.reduce((acc, x) => acc + charset[x % charset.length], '');
	}

	public static generateCodeVerifier(): string {
		return this.generateRandomString(128);
	}

	public static async generateCodeChallenge(codeVerifier: string): Promise<string> {
		const data = new TextEncoder().encode(codeVerifier);
		const digest = await crypto.subtle.digest('SHA-256', data);
		return btoa(String.fromCharCode(...new Uint8Array(digest)))
			.replace(/\+/g, '-')
			.replace(/\//g, '_')
			.replace(/=+$/, '');
	}

	public static generateState(): string {
		return this.generateRandomString(40);
	}
}
