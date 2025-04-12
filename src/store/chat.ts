import { Navigator } from '@solidjs/router';
import { toast } from 'solid-toast';

import { rootPath } from '@/env';

import { resetChatMessages } from './global_actions';

export const gotoNewChat = (navigator: Navigator) => {
	navigator(`${rootPath}/`);
	resetChatMessages();
	toast.success('New notebook created');
};
