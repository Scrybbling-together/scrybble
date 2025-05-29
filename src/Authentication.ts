import {ScrybbleApi, ScrybbleSettings, ScrybbleUser} from "../@types/scrybble";
import {pino} from "./errorHandling/logging";
import {ResponseError} from "./errorHandling/Errors";
import {StateMachine, t} from "typescript-fsm";

export enum AuthStates {
	INIT = "INIT",

	FETCHING_USER = "FETCHING_USER",

	WAITING_FOR_OAUTH_CALLBACK = "WAITING_FOR_OAUTH_CALLBACK",
	REFRESHING_TOKEN = "REFRESHING_TOKEN",

	AUTHENTICATED = "AUTHENTICATED",
	UNAUTHENTICATED = "UNAUTHENTICATED"
}

export enum AuthEvents {
	ACCESS_TOKEN_RECEIVED = "ACCESS_TOKEN_RECEIVED",

	TOKEN_FOUND_ON_STARTUP = "TOKEN_FOUND_ON_STARTUP",
	NO_TOKEN_FOUND_ON_STARTUP = "NO_TOKEN_FOUND_ON_STARTUP",

	ACCESS_TOKEN_EXPIRED = "ACCESS_TOKEN_EXPIRED",

	REFRESH_SUCCESS = "REFRESH_SUCCESS",
	REFRESH_FAILURE = "REFRESH_FAILURE",

	USER_FETCHED = "USER_FETCHED",
	USER_FETCH_FAILED = "USER_FETCH_FAILED",

	LOGIN_REQUESTED = "LOGIN_REQUESTED",
	LOGOUT_REQUESTED = "LOGOUT_REQUESTED",
}

export class Authentication extends StateMachine<AuthStates, AuthEvents> {
	public user: ScrybbleUser = {loaded: false};

	private listeners: ((new_state: AuthStates) => void)[] = [];

	broadcastStateChange() {
		for (const listener of this.listeners) {
			listener(this.getState());
		}
	}

	addStateChangeListener(listener: (new_state: AuthStates) => void) {
		this.listeners.push(listener);
	}

	constructor(private settings: ScrybbleSettings, private api: ScrybbleApi) {
		super(AuthStates.INIT, []);

		// Define all state transitions
		const transitions = [
			// From INIT
			t(AuthStates.INIT, AuthEvents.LOGIN_REQUESTED, AuthStates.WAITING_FOR_OAUTH_CALLBACK, this.broadcastStateChange.bind(this)),
			t(AuthStates.INIT, AuthEvents.TOKEN_FOUND_ON_STARTUP, AuthStates.FETCHING_USER, this.broadcastStateChange.bind(this)),
			t(AuthStates.INIT, AuthEvents.NO_TOKEN_FOUND_ON_STARTUP, AuthStates.UNAUTHENTICATED, this.broadcastStateChange.bind(this)),

			// From WAITING_FOR_OAUTH_CALLBACK
			t(AuthStates.WAITING_FOR_OAUTH_CALLBACK, AuthEvents.ACCESS_TOKEN_RECEIVED, AuthStates.FETCHING_USER, this.broadcastStateChange.bind(this)),

			// From FETCHING_USER
			t(AuthStates.FETCHING_USER, AuthEvents.USER_FETCHED, AuthStates.AUTHENTICATED, this.broadcastStateChange.bind(this)),
			t(AuthStates.FETCHING_USER, AuthEvents.USER_FETCH_FAILED, AuthStates.UNAUTHENTICATED, this.broadcastStateChange.bind(this)),

			// From AUTHENTICATED
			t(AuthStates.AUTHENTICATED, AuthEvents.LOGOUT_REQUESTED, AuthStates.UNAUTHENTICATED, this.broadcastStateChange.bind(this)),

			// From REFRESHING_TOKEN
			t(AuthStates.REFRESHING_TOKEN, AuthEvents.REFRESH_SUCCESS, AuthStates.FETCHING_USER, this.broadcastStateChange.bind(this)),
			t(AuthStates.REFRESHING_TOKEN, AuthEvents.REFRESH_FAILURE, AuthStates.UNAUTHENTICATED, this.broadcastStateChange.bind(this)),

			// From UNAUTHENTICATED
			t(AuthStates.UNAUTHENTICATED, AuthEvents.LOGIN_REQUESTED, AuthStates.WAITING_FOR_OAUTH_CALLBACK, this.broadcastStateChange.bind(this)),
			t(AuthStates.UNAUTHENTICATED, AuthEvents.ACCESS_TOKEN_EXPIRED, AuthStates.REFRESHING_TOKEN, this.broadcastStateChange.bind(this))
		];

		this.addTransitions(transitions);
	}

	public async initializeAuth(): Promise<void> {
		if (this.settings.access_token) {
			await this.dispatch(AuthEvents.TOKEN_FOUND_ON_STARTUP);
			await this.fetchAndSetUser();
		} else {
			await this.dispatch(AuthEvents.NO_TOKEN_FOUND_ON_STARTUP);
		}
	}

	private async fetchAndSetUser(attemptRefreshOnFailure=true): Promise<void> {
		try {
			this.user = await this.api.fetchGetUser();
			await this.dispatch(AuthEvents.USER_FETCHED);
		} catch (error) {
			pino.error(error, "Failed to fetch user data");
			await this.dispatch(AuthEvents.USER_FETCH_FAILED);
			if (attemptRefreshOnFailure) {
				await this.refreshToken(error as Error);
			}
		}
	}

	private generateCodeVerifier(): string {
		return this.generateRandomString(128);
	}

	private async generateCodeChallenge(codeVerifier: string): Promise<string> {
		const data = new TextEncoder().encode(codeVerifier);
		const digest = await crypto.subtle.digest('SHA-256', data);
		return btoa(String.fromCharCode(...new Uint8Array(digest)))
			.replace(/\+/g, '-')
			.replace(/\//g, '_')
			.replace(/=+$/, '');
	}

	private generateState(): string {
		return this.generateRandomString(40);
	}

	public async initiateOAuthFlow(settings: ScrybbleSettings) {
		const codeVerifier = this.generateCodeVerifier();
		const codeChallenge = await this.generateCodeChallenge(codeVerifier);
		const state = this.generateState();

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

		await this.dispatch(AuthEvents.LOGIN_REQUESTED);

		// Open the authorization URL in the default browser
		window.open(authUrl, '_blank');
	}

	public async onOAuthCallbackReceived(data: { code: string; state: string; }) {
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
			const tokenData = await this.api.fetchOAuthAccessToken(code, codeVerifier);

			// Clean up stored PKCE parameters
			localStorage.removeItem('scrybble_code_verifier');
			localStorage.removeItem('scrybble_oauth_state');

			this.settings.access_token = tokenData.access_token;
			this.settings.refresh_token = tokenData.refresh_token;
			await this.settings.save();

			await this.dispatch(AuthEvents.ACCESS_TOKEN_RECEIVED);

			// Now fetch user data
			await this.fetchAndSetUser();

			return {
				access_token: tokenData.access_token,
				refresh_token: tokenData.refresh_token
			};
		} catch (error) {
			// Clean up on error
			localStorage.removeItem('scrybble_code_verifier');
			localStorage.removeItem('scrybble_oauth_state');

			// Transition to unauthenticated state on token exchange failure
			pino.error(error, "Failed to exchange OAuth code for access token");
			await this.dispatch(AuthEvents.LOGOUT_REQUESTED);

			throw error;
		}
	}

	private generateRandomString(length: number): string {
		const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
		const values = crypto.getRandomValues(new Uint8Array(length));
		return values.reduce((acc, x) => acc + charset[x % charset.length], '');
	}

	async refreshAccessToken(): Promise<{ access_token: string, refresh_token: string }> {
		await this.dispatch(AuthEvents.ACCESS_TOKEN_EXPIRED);
		if (!this.settings.refresh_token) {
			await this.dispatch(AuthEvents.REFRESH_FAILURE);
			throw new Error("No refresh token available");
		}

		try {
			const response = await this.api.fetchRefreshOAuthAccessToken();

			this.settings.access_token = response.access_token;
			this.settings.refresh_token = response.refresh_token;
			await this.settings.save();
			await this.dispatch(AuthEvents.REFRESH_SUCCESS);
			pino.info("Successfully refreshed OAuth token");

			return {access_token: response.access_token, refresh_token: response.refresh_token};
		} catch (e) {
			await this.dispatch(AuthEvents.REFRESH_FAILURE);
			this.settings.access_token = undefined;
			this.settings.refresh_token = undefined;
			await this.settings.save();
			throw e;
		}
	}

	async refreshToken(error: ResponseError | Error) {
		// If we get a 401, try to refresh the token
		if ("status" in error && error.status === 401 && this.settings.refresh_token) {
			pino.warn("Got a 401, refreshing");
			try {
				await this.refreshAccessToken();
				await this.fetchAndSetUser(false);
			} catch (refreshError) {
				console.log("refresh error", refreshError)
				throw error;
			}
		} else {
			pino.error(error, "You were unexpectedly logged out, please try to log back in again.");
			this.settings.refresh_token = undefined;
			this.settings.access_token = undefined;
			await this.settings.save();
			this.user = {loaded: false};
			await this.dispatch(AuthEvents.LOGOUT_REQUESTED);
			throw error;
		}
	}

	public async logout(): Promise<void> {
		this.settings.access_token = undefined;
		this.settings.refresh_token = undefined;
		this.user = {loaded: false};
		await this.settings.save();
		await this.dispatch(AuthEvents.LOGOUT_REQUESTED);
	}

	isAuthenticated() {
		return this.getState() === AuthStates.AUTHENTICATED;
	}
}
