import {Host, ScrybbleSettings} from "../@types/scrybble";

export class SettingsImpl implements ScrybbleSettings {
	public readonly sync_folder: string = "scrybble";
	public readonly self_hosted: boolean = false;
	public readonly custom_host: Host = {
		endpoint: "",
		client_secret: ""
	}
	public readonly sync_state: Record<string, number>  = {}

	public readonly refresh_token?: string;
	public readonly access_token?: string;
	public readonly save: () => Promise<void>;

	public constructor({sync_folder, sync_state, self_hosted, custom_host, refresh_token, access_token}: Omit<ScrybbleSettings, "endpoint" | "save">, saveSettings: () => Promise<void>) {
		this.sync_folder = sync_folder;
		this.sync_state = sync_state;
		this.self_hosted = self_hosted;
		this.custom_host = custom_host;
		this.refresh_token = refresh_token;
		this.access_token = access_token;

		this.save = saveSettings;
	}

	get endpoint(): string {
		if (this.self_hosted) {
			return this.custom_host.endpoint;
		} else {
			return "https://scrybble.ink"
		}
	}

}
