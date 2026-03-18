import { BiRegularSend } from 'solid-icons/bi';
import { Component } from 'solid-js';

import CodeEdit, { defaultFnContainer } from '../code/CodeEdit';

interface UserInputProps {
	onSubmit: (text: string) => boolean;
	loading: () => boolean;
}

const UserInput: Component<UserInputProps> = (props) => {
	const fn = defaultFnContainer();

	const handleSubmit = () => {
		if (fn.initialized !== true) {
			console.error('CodeEdit fn is not available');
			return;
		}

		const text = fn.getContent().trim();

		if (props.onSubmit(text)) {
			// Clear input only if submission is successful
			fn.setContent('');
		}
	};

	return (
		<div class="user-input-container">
			<p class="user-input-label">Your message</p>

			<CodeEdit
				class="code-edit-input"
				fontFamily="sans-serif"
				language="jsdown"
				fn={fn}
				placeholderText={'Type your message here...'}
				hideLineNumbers={true}
				onKeyModEnter={handleSubmit}
			/>

			<div class="user-input-actions">
				<button
					class="button is-primary is-small is-rounded"
					onClick={handleSubmit}
					disabled={props.loading?.() ?? false}
				>
					<span class="icon">
						<BiRegularSend />
					</span>
					<span>{props.loading?.() ? 'Sending...' : 'Send'}</span>
				</button>
			</div>
		</div>
	);
};

export default UserInput;
