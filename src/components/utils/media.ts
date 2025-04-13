import { createMediaQuery } from '@solid-primitives/media';

/**
 * Creates a media query for mobile devices.
 */
export const createIsMobile = () => createMediaQuery('(max-width: 768px)');
