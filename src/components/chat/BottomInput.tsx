import { TbSend } from 'solid-icons/tb';
import { Component } from 'solid-js';

type Props = {
	onInput?: (value: string) => void;
};

const BottomInput: Component<Props> = (props) => {
	let taRef: HTMLTextAreaElement;

	const send = () => {
		const v = taRef!.value.trim();
		if (v === '') {
			// Do nothing for empty string
			return;
		}
		taRef!.value = '';
		props.onInput?.(v);
		autosizeTextarea();
	};

	const handleKeyDown = (e: KeyboardEvent) => {
		if (e.isComposing) return;
		if (e.key === 'Enter' && (e.shiftKey || e.ctrlKey || e.metaKey)) {
			e.preventDefault();
			send();
		}
	};

	const handleButtonClick = () => {
		send();
	};

	const autosizeTextarea = () => {
		if (taRef!) {
			taRef.style.height = '1px';
			taRef.style.height = `${taRef.scrollHeight + 2}px`;
		}
	};

	return (
		<div class="field is-grouped is-align-content-stretch">
			<p class="control is-expanded">
				<textarea
					ref={taRef!}
					class="textarea inline"
					onInput={autosizeTextarea}
					onChange={autosizeTextarea}
					onKeyDown={handleKeyDown}
					placeholder="Type your message here..."
				/>
			</p>
			<button
				class="control button is-primary"
				onClick={handleButtonClick}
			>
				<TbSend />
			</button>
		</div>
	);
};

export default BottomInput;
