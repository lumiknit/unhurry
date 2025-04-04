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
