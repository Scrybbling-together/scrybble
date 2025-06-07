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

	public constructor(s: Omit<ScrybbleSettings, "endpoint" | "save" | "client_id" | "client_secret"> | null, saveSettings: () => Promise<void>) {
		this.sync_folder = s?.sync_folder ?? "scrybble";
		this.sync_state = s?.sync_state ?? {};
		this.self_hosted = s?.self_hosted ?? false;
		if (s?.custom_host) {
			this.custom_host = s.custom_host;
		}
		if (s?.refresh_token) {
			this.refresh_token = s.refresh_token;
		}
		if (s?.access_token) {
			this.access_token = s.access_token;
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
		return "01974ab1-1afe-700a-a69b-22fe0e3334c1";
	}

	get client_secret(): string {
		if (this.self_hosted){
			return this.custom_host.client_secret;
		}
		return "7OVMeOZbXJaMH2I1mKr67H6VPrW2S7PlwAneuSFQ";
	}

}
