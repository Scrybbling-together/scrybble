import {ErrorMessage} from "../errorHandling/Errors";
import {LitElement} from "lit-element";
import {property} from "lit-element/decorators.js";
import {html, nothing, TemplateResult} from "lit-html";

export class ErrorComponent extends LitElement {
	@property({type: Object})
	private error: ErrorMessage

	@property({type: Array})
	public actions: TemplateResult[] = [];

	public render() {
		const errorActions = this.actions.length ? html`<div class="error-actions">${this.actions}</div>` : nothing
		return html`
			<div class="error-container">
				<div class="error-content">
					<h2 class="error-title">${this.error.title}</h2>
					<p class="error-message">${this.error.message}</p>
					<p class="error-help-action">${this.error.helpAction}</p>
				</div>
				${errorActions}
			</div>
		`
	}

	protected createRenderRoot(): HTMLElement | DocumentFragment {
		return this
	}
}
