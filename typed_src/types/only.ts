export type OnlyKeys<T, B> = Only<T,B>[keyof T];

export type Only<T, B> = {
    [P in keyof T]: T[P] extends B ? P : never;
};

