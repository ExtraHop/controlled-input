import flatMap from 'lodash-es/flatMap';

import { ObjectPath } from './objectPath';
import { Diagnostic } from './diagnostic';

/**
 * A function that evaluates a value and returns a list of diagnostic messages
 * with relative property paths to where they occur in the input value.
 * 
 * @public
 */
export type Validator<T> = (value: T) => Diagnostic[];

export const Validator = {
    /**
     * Create a new validator which will be executed over each item in a list,
     * adding the item index to the paths of any emitted diagnostics.
     *
     * This can be used in conjunction with `validateProperty`.
     *
     * @param validator The validator function to apply to each item
     */
    forList: <T>(validator: Validator<T>): Validator<T[]> => items =>
        flatMap(items, (v, i) => validateProperty(i, validator, v)),
    /**
     * Create a new validator which runs all the provided validators and returns
     * the combined results.
     *
     * @param validators A set of independently-run validators
     */
    combine: <T>(...validators: readonly Validator<T>[]): Validator<T> => val =>
        flatMap(validators, fn => fn(val)),
};

/**
 * Run a validator against some value, then update the path of the diagnostics 
 * to reflect their location in some parent object.
 * 
 * @param propName The value to prepend to the path of any returned diagnostics
 * @param validator The validator to run
 * @param value The value to check
 * 
 * @beta
 */
// This is not stable because the API is kind of clunky at the moment.
export const validateProperty = <T>(
    propName: string | number,
    validator: Validator<T>,
    value: T,
): Diagnostic[] => {
    const diagnostics = validator(value);

    // Mutating diagnostics during the construction phase is fine, and this
    // avoids allocating new objects each time we move up the object hierarchy
    diagnostics.forEach(v => (v.path = ObjectPath.prefix(v.path, propName)));
    return diagnostics;
};
