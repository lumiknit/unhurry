import { Component } from 'solid-js';
import { toast } from 'solid-toast';

import NumConfig from './form/NumConfig';
import SelectConfig from './form/SelectConfig';
import SwitchConfig from './form/SwitchConfig';

const GeneralSettings: Component = () => {
	const forceRemoveServiceWorker = () => {
		if ('serviceWorker' in navigator) {
			navigator.serviceWorker.getRegistrations().then((registrations) => {
				registrations.forEach((r) => r.unregister());
			});
			toast.success('ServiceWorker removed');
		} else {
			toast.error('ServiceWorker not supported');
		}
	};

	return (
		<>
			<h4 class="title is-4">Chatting Options</h4>

			<NumConfig
				key="autoSendMillis"
				label="Auto Send After (ms)"
				desc="When send the typed text to the server automatically"
			/>

			<SwitchConfig
				key="enterKeyToSend"
				label="Enter Key to Send"
				desc="When enabled, 'Enter' to send and 'Shift-Enter' to newline. If false, 'Enter' to newline, 'Shift-Enter' to send"
			/>

			<SwitchConfig
				key="blurOnSendButton"
				label="Blur on Send Button"
				desc="Hide keyboard when send button is clicked"
			/>

			<SwitchConfig
				key="enableTools"
				label="Allow tools"
				desc="Enable LLM call tools"
			/>

			<SwitchConfig
				key="enableLLMFallback"
				label="Enable LLM Fallback"
				desc="When LLM failed (e.g. 429 Too Many Requests), use the next model"
			/>

			<h4 class="title is-4">UI</h4>

			<SwitchConfig
				key="enableVibration"
				label="Enable device vibration"
				desc="Enable vibration feedback for buttons. Only works on Android."
			/>

			<SelectConfig
				key="fontFamily"
				label="Font Family"
				desc="Font family of the chat messages"
				options={[
					{ value: 'sans-serif', label: 'Sans-serif' },
					{ value: 'serif', label: 'Serif' },
				]}
			/>

			<h4 class="title is-4">Others</h4>
			<p>If your webpage does not work properly, clear service workers</p>
			<button class="button is-danger" onClick={forceRemoveServiceWorker}>
				Remove Service Workers
			</button>
		</>
	);
};

export default GeneralSettings;
