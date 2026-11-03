export type MessageParams = Readonly<Record<string, unknown>>;

export type MessageFn = (params: MessageParams) => string;

export type MessageCatalog = Readonly<Record<string, MessageFn>>;
