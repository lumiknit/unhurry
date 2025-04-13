const shortDateTimeFormat = new Intl.DateTimeFormat(undefined, {
	dateStyle: 'short',
});

const shortRelativeTimeFormat = new Intl.RelativeTimeFormat(undefined, {
	style: 'short',
	numeric: 'auto',
});

/**
 * Formats a given date into a short relative time string (e.g., "5 minutes ago").
 * If the date is more than 24 hours away from the current time, it falls back to a short date-time format.
 *
 * @param date - The date to be formatted.
 * @returns A string representing the relative time difference if within 24 hours,
 *          otherwise a formatted date-time string.
 */
export const shortRelativeDateFormat = (date: Date): string => {
	let unit: Intl.RelativeTimeFormatUnit;
	const now = new Date();
	let diff = Math.floor((date.getTime() - now.getTime()) / 1000);
	const adiff = Math.abs(diff);
	if (adiff < 60) {
		unit = 'second';
	} else if (adiff < 60 * 60) {
		diff = Math.floor(diff / 60);
		unit = 'minute';
	} else if (adiff < 24 * 60 * 60) {
		diff = Math.floor(diff / (60 * 60));
		unit = 'hour';
	} else {
		return shortDateTimeFormat.format(date);
	}
	return shortRelativeTimeFormat.format(diff, unit);
};

/**
 * Converts a duration in milliseconds to a colon-separated time format.
 *
 * The format varies depending on the duration:
 * - For durations less than 1 hour: `MM:SS`
 * - For durations less than 24 hours: `HH:MM:SS`
 * - For durations of 24 hours or more: `D:HH:MM:SS`
 *
 * @param millis - The duration in milliseconds to be converted.
 * @returns A string representing the duration in a colon-separated time format.
 */
export const millisToColonFormat = (millis: number): string => {
	let seconds = Math.floor(millis / 1000);
	let minutes = Math.floor(seconds / 60);
	seconds = seconds % 60;
	if (minutes < 60) {
		return `${minutes}:${seconds.toString().padStart(2, '0')}`;
	} else {
		let hours = Math.floor(minutes / 60);
		minutes = minutes % 60;
		if (hours < 24) {
			return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
		} else {
			const days = Math.floor(hours / 24);
			hours = hours % 24;
			return `${days}:${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
		}
	}
};
