const dateTime = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
const time = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' });

/** 1001 -> "#1001" */
export const orderNumber = (number: number) => `#${number}`;

export const formatDateTime = (iso: string) => dateTime.format(new Date(iso));

export const formatTime = (iso: string) => time.format(new Date(iso));
