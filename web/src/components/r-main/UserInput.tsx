import { Component } from 'solid-js';

import CodeEdit, { FnContainer } from '../code/CodeEdit';

interface UserInputProps {
	value: () => string;
	onTextChange: (text: string) => void;
	onSubmit: () => void;
	fn: FnContainer;
	loading?: () => boolean;
}

const UserInput: Component<UserInputProps> = (props) => {
	return (
		<div class="user-input-container">
			<p class="user-input-label">Your message</p>

			<CodeEdit
				fn={props.fn}
				initText={props.value()}
				onTextChange={props.onTextChange}
				placeholderText={'Type your message here...'}
				hideLineNumbers={true}
				fontFamily="sans-serif"
				onKeyModEnter={props.onSubmit}
				class="code-edit-input"
			/>

			<div class="user-input-actions">
				<button
					class="button is-primary"
					onClick={props.onSubmit}
					disabled={props.loading?.() ?? false}
				>
					{props.loading?.() ? 'Sending...' : 'Send'}
				</button>
			</div>
		</div>
	);
};

export default UserInput;
