export const dateFormat = new Intl.DateTimeFormat('cs-CZ', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'Europe/Prague',
});
export const timeFormat = new Intl.DateTimeFormat('cs-CZ', {
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Europe/Prague',
});
export const durationLabel = (start: string, end: string) => {
  const minutes = Math.round((Date.parse(end) - Date.parse(start)) / 60000);
  if (!Number.isFinite(minutes) || minutes <= 0)
    throw new Error('Workshop end must be after its start.');
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return [
    hours
      ? `${hours} ${hours === 1 ? 'hodina' : hours < 5 ? 'hodiny' : 'hodin'}`
      : '',
    remainder ? `${remainder} min` : '',
  ]
    .filter(Boolean)
    .join(' ');
};
export const monthFormat = new Intl.DateTimeFormat('cs-CZ', {
  month: 'short',
  timeZone: 'Europe/Prague',
});
export const dayFormat = new Intl.DateTimeFormat('cs-CZ', {
  day: 'numeric',
  timeZone: 'Europe/Prague',
});
export const yearFormat = new Intl.DateTimeFormat('cs-CZ', {
  year: 'numeric',
  timeZone: 'Europe/Prague',
});
