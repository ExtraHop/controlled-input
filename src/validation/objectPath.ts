import toPath from 'lodash-es/toPath';
import trimEnd from 'lodash-es/trimEnd';

/**
 * A sequence of property names and indices that locate a value in an object.
 * This should be treated as an opaque type by all consuming code.
 */
export type ObjectPath = string & { __BRAND__: 'objectPath' & void };

const EMPTY: ObjectPath = '' as ObjectPath;

const DELIMITER = '.';

const ACCEPTABLE_SUFFIXES = [undefined, '.', '['];

const createPart = (part: string | number): ObjectPath => {
    if (part === '') {
        return EMPTY;
    }

    if (typeof part === 'number' || /^\d+$/.test(part)) {
        return `[${part}]` as ObjectPath;
    }

    return `${part}.` as ObjectPath;
};

/**
 * Create a new `ObjectPath` for an array of properties
 *
 * @param parts A JSON object path consisting of strings and/or numbers
 */
const fromArray = (parts: (string | number)[]): ObjectPath => create(...parts);

/**
 * Create a new object path for one or more properties.
 */
const create = (...parts: (string | number)[]): ObjectPath =>
    // XXX TS isn't smart enough to understand that the initial value
    // in the second argument narrows the type of the `previousValue`
    // callback parameter. We have to do some casting to make it accept
    // that we know what we're doing.
    // tslint:disable-next-line:no-any
    parts.reduce((s, v: any) => extend(s, v), EMPTY as any);

const prefix = (path: ObjectPath, prefixVal: string | number): ObjectPath =>
    concat(createPart(prefixVal), path);

/**
 * Creates a new object path by creating a new value which concatenates the
 * initial value and the provided suffix. This will also add a trailing
 * delimiter which is used for faster prefix matching.
 *
 * @param path The base path to be extended
 * @param and The suffix to append
 */
const extend = (path: ObjectPath, and: string | number): ObjectPath =>
    concat(path, createPart(and));

/**
 * Concatenate two object paths to produce one deeper object path.
 */
const concat = (left: ObjectPath, right: ObjectPath): ObjectPath => {
    if (!left) {
        return right;
    }

    if (!right) {
        return left;
    }

    const endsOnDelimiter = left.endsWith(DELIMITER);
    const needsLeadingDelimiter = !right.startsWith('[');

    if (endsOnDelimiter && !needsLeadingDelimiter) {
        return (left.substring(0, left.length - 1) + right) as ObjectPath;
    }

    if (needsLeadingDelimiter && !endsOnDelimiter) {
        return (left + DELIMITER + right) as ObjectPath;
    }

    return (left + right) as ObjectPath;
};

/**
 * Returns true if `path` starts with `prefix`
 *
 * @param path The haystack
 * @param prefixVal The needle
 */
const startsWith = (path: ObjectPath, prefixVal: ObjectPath): boolean => {
    // Empty prefix matches any diagnostic
    if (prefixVal === EMPTY) {
        return true;
    }

    // prefix of 'fields.' should match 'fields[1]', so ugly
    // hacks are required here.
    if (prefixVal.endsWith(DELIMITER)) {
        const trimmedPath = trimEnd(prefixVal, DELIMITER);
        if (!path.startsWith(trimmedPath)) {
            return false;
        }

        // Now we make sure that we don't match something like "fieldsHere"
        // by checking that the next character isn't part of the current
        // path segment.
        const charAfter = path.charAt(trimmedPath.length);

        return ACCEPTABLE_SUFFIXES.indexOf(charAfter) !== -1;
    }
    return path.startsWith(prefixVal);
};

/**
 * Convert an `ObjectPath` to a human-friendly string. This format is _not_
 * compatible with `ObjectPath.create`; use `ObjectPath.toArray` to create
 * a transparent representation that can be converted back to a path in
 * future.
 */
export const toString = (path: ObjectPath): string => trimEnd(path, DELIMITER);

export const toArray = (path: ObjectPath): (string | number)[] =>
    toPath(toString(path));

export const ObjectPath = {
    EMPTY,
    fromArray,
    create,
    prefix,
    extend,
    concat,
    startsWith,
    toString,
    toArray,
};
