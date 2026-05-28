import { mutate as globalMutate } from "swr";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MutateFn = (...args: any[]) => any;

// Starts as the global mutate (works without a custom cache provider).
// Once SWRProvider mounts, registerMutate replaces this with the scoped
// mutate that's bound to the custom localStorage cache provider.
let _mutate: MutateFn = globalMutate;

export function registerMutate(m: MutateFn) {
  _mutate = m;
}

export const mutate: MutateFn = (...args: unknown[]) => _mutate(...args);
