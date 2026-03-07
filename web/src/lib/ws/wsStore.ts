import { createSignal } from 'solid-js';

import { wsConn, type WsStatus } from './ws';

/** Reactive singleton for WS connection status, shared across components. */
export const [wsStatus, setWsStatus] = createSignal<WsStatus>('idle');
wsConn.onStatusChange = setWsStatus;
