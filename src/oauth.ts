import {ScrybbleApi, ScrybbleSettings} from "../@types/scrybble";

export class PKCEUtils {
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

	public static async initiateOAuthFlow(settings: ScrybbleSettings) {
		const codeVerifier = PKCEUtils.generateCodeVerifier();
		const codeChallenge = await PKCEUtils.generateCodeChallenge(codeVerifier);
		const state = PKCEUtils.generateState();

		const params = new URLSearchParams({
			client_id: '2',
			redirect_uri: "obsidian://scrybble-oauth",
			response_type: 'code',
			scope: '',
			state,
			code_challenge: codeChallenge,
			code_challenge_method: 'S256'
		});

		localStorage.setItem('scrybble_code_verifier', codeVerifier);
		localStorage.setItem('scrybble_oauth_state', state);

		const authUrl = `${settings.custom_host.endpoint}/oauth/authorize?${params.toString()}`;

		// Open the authorization URL in the default browser
		window.open(authUrl, '_blank');
	}

	public static async onOAuthCallbackReceived(api: ScrybbleApi, data: { code: string; state: string; }) {
		const {code, state} = data
		// Verify state parameter
		const storedState = localStorage.getItem('scrybble_oauth_state');
		if (!storedState || storedState !== state) {
			throw new Error('Invalid state parameter');
		}

		// Get stored code verifier
		const codeVerifier = localStorage.getItem('scrybble_code_verifier');
		if (!codeVerifier) {
			throw new Error('Missing code verifier');
		}

		try {
			// Exchange authorization code for tokens
			const tokenData = await api.fetchOAuthAccessToken(code, codeVerifier);

			// Clean up stored PKCE parameters
			localStorage.removeItem('scrybble_code_verifier');
			localStorage.removeItem('scrybble_oauth_state');

			return {
				access_token: tokenData.access_token,
				refresh_token: tokenData.refresh_token
			};
		} catch (error) {
			// Clean up on error
			localStorage.removeItem('scrybble_code_verifier');
			localStorage.removeItem('scrybble_oauth_state');
			throw error;
		}
	}

	private static generateRandomString(length: number): string {
		const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
		const values = crypto.getRandomValues(new Uint8Array(length));
		return values.reduce((acc, x) => acc + charset[x % charset.length], '');
	}
}

