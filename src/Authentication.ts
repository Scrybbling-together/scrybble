import {
	DeviceFlowError,
	DeviceTokenErrorResponse,
	DeviceTokenResponse,
	DeviceTokenSuccessResponse,
	ScrybbleApi,
	ScrybbleSettings,
	ScrybbleUser
} from "../@types/scrybble";
import {logger} from "./errorHandling/logging";
import {ResponseError} from "./errorHandling/Errors";
import {StateMachine, t} from "typescript-fsm";


export function isDeviceFlowError(response: any): response is DeviceTokenErrorResponse {
	return response && typeof response === 'object' && "error" in response;
}


export function getDeviceTokenErrorResponseType(response: DeviceTokenResponse): DeviceFlowError | null {
	if (isDeviceFlowError(response)) {
		return response.error;
	}
	return null;
}

export enum AuthStates {
	INIT = "INIT",

	FETCHING_USER = "FETCHING_USER",

	REQUESTING_DEVICE_CODE = "REQUESTING_DEVICE_CODE",
	WAITING_FOR_USER_AUTHORIZATION = "WAITING_FOR_USER_AUTHORIZATION",
	POLLING_FOR_TOKEN = "POLLING_FOR_TOKEN",
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

	DEVICE_CODE_RECEIVED = "DEVICE_CODE_RECEIVED",
	DEVICE_CODE_REQUEST_FAILED = "DEVICE_CODE_REQUEST_FAILED",
	POLLING_STARTED = "POLLING_STARTED",
	AUTHORIZATION_EXPIRED = "AUTHORIZATION_EXPIRED",
	AUTHORIZATION_DENIED = "AUTHORIZATION_DENIED",
	DEVICE_FLOW_CANCELED = "DEVICE_FLOW_CANCELED",
}

export interface DeviceAuthorizationData {
	device_code: string;
	user_code: string;
	verification_uri: string;
	expires_in: number;
	interval: number;
}

function isSuccessResponse(deviceTokenResponse: DeviceTokenResponse): deviceTokenResponse is DeviceTokenSuccessResponse {
	return "access_token" in deviceTokenResponse;
}

export class Authentication extends StateMachine<AuthStates, AuthEvents> {
	public user: ScrybbleUser | null = null;
	public deviceAuth: DeviceAuthorizationData | null = null;

	private listeners: ((new_state: AuthStates) => void)[] = [];
	private pollingTimer: number | null = null;

	constructor(private settings: ScrybbleSettings, private api: ScrybbleApi) {
		super(AuthStates.INIT, []);

		/**
		 * ```mermaid
		 * stateDiagram-v2
		 * [*] --> INIT
		 * INIT --> REQUESTING_DEVICE_CODE: LOGIN_REQUEST
		 * INIT --> FETCHING_USER: TOKEN_FOUND_ON_START
		 * INIT --> UNAUTHENTICATED: NO_TOKEN_FOUND_ON_START
		 * REQUESTING_DEVICE_CODE --> WAITING_FOR_USER_AUTHORIZATION: DEVICE_CODE_RECEIVED
		 * REQUESTING_DEVICE_CODE --> UNAUTHENTICATED: DEVICE_CODE_REQUEST_FAILED
		 * WAITING_FOR_USER_AUTHORIZATION --> POLLING_FOR_TOKEN: POLLING_START
		 * WAITING_FOR_USER_AUTHORIZATION --> UNAUTHENTICATED: DEVICE_FLOW_CANCEL
		 * POLLING_FOR_TOKEN --> FETCHING_USER: ACCESS_TOKEN_RECEIVED
		 * POLLING_FOR_TOKEN --> UNAUTHENTICATED: AUTHORIZATION_EXPIRED
		 * POLLING_FOR_TOKEN --> UNAUTHENTICATED: AUTHORIZATION_DENIED
		 * POLLING_FOR_TOKEN --> UNAUTHENTICATED: DEVICE_FLOW_CANCEL
		 * FETCHING_USER --> AUTHENTICATED: USER_FETCH
		 * FETCHING_USER --> UNAUTHENTICATED: USER_FETCH_FAILED
		 * AUTHENTICATED --> UNAUTHENTICATED: LOGOUT_REQUEST
		 * REFRESHING_TOKEN --> FETCHING_USER: REFRESH_SUCCESS
		 * REFRESHING_TOKEN --> UNAUTHENTICATED: REFRESH_FAILURE
		 * UNAUTHENTICATED --> REQUESTING_DEVICE_CODE: LOGIN_REQUEST
		 * UNAUTHENTICATED --> REFRESHING_TOKEN: ACCESS_TOKEN_EXPIRED
		 * ```
		 */
		const transitions = [
			t(AuthStates.INIT, AuthEvents.LOGIN_REQUESTED, AuthStates.REQUESTING_DEVICE_CODE, this.broadcastStateChange.bind(this)),
			t(AuthStates.INIT, AuthEvents.TOKEN_FOUND_ON_STARTUP, AuthStates.FETCHING_USER, this.broadcastStateChange.bind(this)),
			t(AuthStates.INIT, AuthEvents.NO_TOKEN_FOUND_ON_STARTUP, AuthStates.UNAUTHENTICATED, this.broadcastStateChange.bind(this)),

			t(AuthStates.REQUESTING_DEVICE_CODE, AuthEvents.DEVICE_CODE_RECEIVED, AuthStates.WAITING_FOR_USER_AUTHORIZATION, this.broadcastStateChange.bind(this)),
			t(AuthStates.REQUESTING_DEVICE_CODE, AuthEvents.DEVICE_CODE_REQUEST_FAILED, AuthStates.UNAUTHENTICATED, this.broadcastStateChange.bind(this)),

			t(AuthStates.WAITING_FOR_USER_AUTHORIZATION, AuthEvents.POLLING_STARTED, AuthStates.POLLING_FOR_TOKEN, this.broadcastStateChange.bind(this)),
			t(AuthStates.WAITING_FOR_USER_AUTHORIZATION, AuthEvents.DEVICE_FLOW_CANCELED, AuthStates.UNAUTHENTICATED, this.broadcastStateChange.bind(this)),

			t(AuthStates.POLLING_FOR_TOKEN, AuthEvents.ACCESS_TOKEN_RECEIVED, AuthStates.FETCHING_USER, this.broadcastStateChange.bind(this)),
			t(AuthStates.POLLING_FOR_TOKEN, AuthEvents.AUTHORIZATION_EXPIRED, AuthStates.UNAUTHENTICATED, this.broadcastStateChange.bind(this)),
			t(AuthStates.POLLING_FOR_TOKEN, AuthEvents.AUTHORIZATION_DENIED, AuthStates.UNAUTHENTICATED, this.broadcastStateChange.bind(this)),
			t(AuthStates.POLLING_FOR_TOKEN, AuthEvents.DEVICE_FLOW_CANCELED, AuthStates.UNAUTHENTICATED, this.broadcastStateChange.bind(this)),

			t(AuthStates.FETCHING_USER, AuthEvents.USER_FETCHED, AuthStates.AUTHENTICATED, this.broadcastStateChange.bind(this)),
			t(AuthStates.FETCHING_USER, AuthEvents.USER_FETCH_FAILED, AuthStates.UNAUTHENTICATED, this.broadcastStateChange.bind(this)),

			t(AuthStates.AUTHENTICATED, AuthEvents.LOGOUT_REQUESTED, AuthStates.UNAUTHENTICATED, this.broadcastStateChange.bind(this)),

			t(AuthStates.REFRESHING_TOKEN, AuthEvents.REFRESH_SUCCESS, AuthStates.FETCHING_USER, this.broadcastStateChange.bind(this)),
			t(AuthStates.REFRESHING_TOKEN, AuthEvents.REFRESH_FAILURE, AuthStates.UNAUTHENTICATED, this.broadcastStateChange.bind(this)),

			t(AuthStates.UNAUTHENTICATED, AuthEvents.LOGIN_REQUESTED, AuthStates.REQUESTING_DEVICE_CODE, this.broadcastStateChange.bind(this)),
			t(AuthStates.UNAUTHENTICATED, AuthEvents.ACCESS_TOKEN_EXPIRED, AuthStates.REFRESHING_TOKEN, this.broadcastStateChange.bind(this))
		];

		this.addTransitions(transitions);
	}

	broadcastStateChange() {
		for (const listener of this.listeners) {
			listener(this.getState());
		}
	}

	addStateChangeListener(listener: (new_state: AuthStates) => void) {
		this.listeners.push(listener);
	}

	public async initializeAuth(): Promise<void> {
		if (this.settings.access_token) {
			await this.dispatch(AuthEvents.TOKEN_FOUND_ON_STARTUP);
			await this.fetchAndSetUser();
		} else {
			await this.dispatch(AuthEvents.NO_TOKEN_FOUND_ON_STARTUP);
		}
	}

	public async initiateDeviceFlow(): Promise<void> {
		await this.dispatch(AuthEvents.LOGIN_REQUESTED);

		try {
			this.deviceAuth = await this.api.fetchDeviceCode();
			await this.dispatch(AuthEvents.DEVICE_CODE_RECEIVED);

			// Start polling after a short delay to let UI update
			setTimeout(() => this.startPolling(), 1000);

		} catch (error) {
			logger.error(error, "Failed to request device code");
			await this.dispatch(AuthEvents.DEVICE_CODE_REQUEST_FAILED);
			throw error;
		}
	}

	public async cancelDeviceFlow(): Promise<void> {
		this.stopPolling();
		this.deviceAuth = null;
		await this.dispatch(AuthEvents.DEVICE_FLOW_CANCELED);
	}

	public async copyUserCodeToClipboard(): Promise<boolean> {
		if (!this.deviceAuth?.user_code) {
			return false;
		}

		try {
			await navigator.clipboard.writeText(this.deviceAuth.user_code);
			return true;
		} catch (error) {
			logger.warn("Failed to copy to clipboard", error);
			return false;
		}
	}

	public openVerificationUrl(): void {
		if (!this.deviceAuth?.verification_uri) {
			logger.warn("No verification URI available");
			return;
		}

		window.open(this.deviceAuth.verification_uri, '_blank');
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
			logger.info("Successfully refreshed OAuth token");

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
			logger.warn("Got a 401, refreshing");
			try {
				await this.refreshAccessToken();
				await this.fetchAndSetUser(false);
			} catch (refreshError) {
				logger.error(error, "You were unexpectedly logged out, please try to log back in again.");
				this.settings.refresh_token = undefined;
				this.settings.access_token = undefined;
				await this.settings.save();
				this.user = null;
				await this.dispatch(AuthEvents.LOGOUT_REQUESTED);
				throw error;
			}
		} else {
			logger.error("Unexpected server error");
			throw error;
		}
	}

	public async logout(): Promise<void> {
		this.stopPolling();
		this.deviceAuth = null;
		this.settings.access_token = undefined;
		this.settings.refresh_token = undefined;
		this.user = null;
		await this.settings.save();
		await this.dispatch(AuthEvents.LOGOUT_REQUESTED);
	}

	isAuthenticated() {
		return this.getState() === AuthStates.AUTHENTICATED;
	}

	private async fetchAndSetUser(attemptRefreshOnFailure = true): Promise<void> {
		try {
			this.user = await this.api.fetchGetUser();
			await this.dispatch(AuthEvents.USER_FETCHED);
		} catch (error) {
			logger.error(error, "Failed to fetch user data");
			await this.dispatch(AuthEvents.USER_FETCH_FAILED);
			if (attemptRefreshOnFailure) {
				await this.refreshToken(error as Error);
			}
		}
	}

	private async startPolling(): Promise<void> {
		if (!this.deviceAuth) {
			logger.error("Cannot start polling: no device auth data");
			return;
		}

		await this.dispatch(AuthEvents.POLLING_STARTED);

		const startTime = Date.now();
		const expirationTime = startTime + (this.deviceAuth.expires_in * 1000);
		let currentInterval = this.deviceAuth.interval;

		const poll = async (): Promise<void> => {
			if (Date.now() >= expirationTime) {
				logger.warn("Device authorization expired");
				this.stopPolling();
				await this.dispatch(AuthEvents.AUTHORIZATION_EXPIRED);
				return;
			}

			if (this.getState() !== AuthStates.POLLING_FOR_TOKEN) {
				this.stopPolling();
				return;
			}

			try {
				const deviceTokenResponse = await this.api.fetchPollForDeviceToken(this.deviceAuth!.device_code);

				if (isSuccessResponse(deviceTokenResponse)) {
					this.stopPolling();
					this.deviceAuth = null;

					this.settings.access_token = deviceTokenResponse.access_token;
					this.settings.refresh_token = deviceTokenResponse.refresh_token;
					await this.settings.save();

					await this.dispatch(AuthEvents.ACCESS_TOKEN_RECEIVED);
					await this.fetchAndSetUser();
					return;
				}

				switch (getDeviceTokenErrorResponseType(deviceTokenResponse)) {
					case 'authorization_pending':
						// User hasn't authorized yet, continue polling
						this.scheduleNextPoll(currentInterval, poll);
						break;

					case 'slow_down':
						// Server requests slower polling
						currentInterval += 5;
						this.scheduleNextPoll(currentInterval, poll);
						break;

					case 'access_denied':
						// User denied the authorization
						logger.info("User denied device authorization");
						this.stopPolling();
						this.deviceAuth = null;
						await this.dispatch(AuthEvents.AUTHORIZATION_DENIED);
						break;

					case 'expired_token':
						// Device code expired
						logger.warn("Device code expired");
						this.stopPolling();
						this.deviceAuth = null;
						await this.dispatch(AuthEvents.AUTHORIZATION_EXPIRED);
						break;

					default:
						// Other error
						logger.error(deviceTokenResponse, "Unexpected error during device polling");
						this.stopPolling();
						this.deviceAuth = null;
						await this.dispatch(AuthEvents.AUTHORIZATION_DENIED);
						break;
				}
			} catch (error) {
				logger.error(error, "Failed to poll for device token");
			}
		};

		this.scheduleNextPoll(currentInterval, poll);
	}

	private scheduleNextPoll(interval: number, pollFunction: () => Promise<void>): void {
		this.pollingTimer = window.setTimeout(pollFunction, interval * 1000);
	}

	private stopPolling(): void {
		if (this.pollingTimer) {
			clearTimeout(this.pollingTimer);
			this.pollingTimer = null;
		}
	}
}
