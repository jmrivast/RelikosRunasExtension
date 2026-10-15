export type Run = (action: () => Promise<void>, success?: string) => Promise<boolean>;
