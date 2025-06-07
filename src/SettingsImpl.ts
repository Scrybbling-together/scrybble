import {Host, ScrybbleSettings} from "../@types/scrybble";

export class SettingsImpl implements ScrybbleSettings {
	public readonly sync_folder: string = "scrybble";
	public readonly self_hosted: boolean = false;
	public readonly custom_host: Host = {
		endpoint: "",
		client_secret: "",
		client_id: ""
	}
	public readonly sync_state: Record<string, number>  = {}

	public readonly refresh_token?: string;
	public readonly access_token?: string;
	public readonly save: () => Promise<void>;

	public constructor(s: Omit<ScrybbleSettings, "endpoint" | "save" | "client_id" | "client_secret">, saveSettings: () => Promise<void>) {
		this.sync_folder = s.sync_folder ?? "scrybble";
		this.sync_state = s.sync_state ?? {};
		this.self_hosted = s.self_hosted ?? false;
		if (s.custom_host) {
			this.custom_host = s.custom_host;
		}
		if (s.refresh_token) {
			this.refresh_token = s.refresh_token;
		}
		if (s.access_token) {
			this.refresh_token = s.refresh_token;
		}

		this.save = saveSettings;
	}

	get endpoint(): string {
		if (this.self_hosted) {
			return this.custom_host.endpoint;
		} else {
			return "https://scrybble.ink"
		}
	}

	get client_id(): string {
		if (this.self_hosted) {
			return this.custom_host.client_id
		}
		return "01974a5d-3464-7196-8ce5-3cd60d33ce1a";
	}

	get client_secret(): string {
		if (this.self_hosted){
			return this.custom_host.client_secret;
		}
		return "NgEG2sIPyK3MD2UMuwsdS4urq7FyVZUQOBZ5XeQ4";
	}

}
