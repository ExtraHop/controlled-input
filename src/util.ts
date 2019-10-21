/**
 * Check that a value is not `null` or `undefined` and narrow the type to
 * exclude all void-like types.
 * 
 * @internal
 */
export const isNonVoid = <T>(
    value: T,
): value is Exclude<T, null | undefined | void> =>
    value !== null && value !== undefined;
