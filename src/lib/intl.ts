const shortDateTimeFormat = new Intl.DateTimeFormat(undefined, {
	dateStyle: 'short',
});

const shortRelativeTimeFormat = new Intl.RelativeTimeFormat(undefined, {
	style: 'short',
	numeric: 'auto',
});

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
