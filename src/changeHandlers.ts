import { Component } from 'react';

import {
    ChangeHandler,
    ControlledInput,
    FieldChangeHandler,
} from './interface';

/**
 * Create a function to propagate a completely new value on change.
 *
 * The function does nothing if the component is disabled.
 *
 * @param props
 *      The `props` from which the `ControlledInput` properties should be taken.
 */
const replaceChangeHandlerImplementation = <T>(
    props: ControlledInput<T>,
): ChangeHandler<T> => (val: T) => {
    const { disabled, name, onChange } = props;

    if (disabled || !onChange) return;

    onChange(val, name);
};

/**
 * Create a function to propagate a completely new value on change.
 *
 * The function does nothing if the component is disabled.
 *
 * @param props
 *      The `props` from which the `ControlledInput` properties should be taken.
 * 
 * @public
 */
// This is a renaming of the function so that it presents as a hook to React.
// It currently doesn't use any of React's built-in hooks, but it should be used
// like a hook (unconditionally declared in the component) and we may use a hook
// for performance improvements in the future.
export const useReplaceChangeHandler = replaceChangeHandlerImplementation;

/**
 * Create a function to propagate a completely new value on change.
 *
 * The function does nothing if the component is disabled.
 *
 * @param component
 *      The component instance from which props should be taken.
 *      This will most typically be `this`.
 */
export const makeReplaceChangeHandler = <T>(
    component: Component<ControlledInput<T>>,
): ChangeHandler<T> => value =>
    replaceChangeHandlerImplementation(component.props)(value);

/**
 * Error thrown when a `ControlledInput` without a `name` property value
 * invokes a field-change handler. While the interface allows the omission
 * of the property, field-change handlers need it to propagate the change
 * to their parent components.
 */
export class MissingFieldError extends Error {
    constructor() {
        super('Change handler requires a field name');
    }
}

/**
 * Create a function to propagate a single field update on an object value.
 *
 * The function does nothing if the component is disabled.
 *
 * @param props
 *      The `props` from which the `ControlledInput` properties should be taken.
 */
// tslint:disable-next-line: no-any
const fieldChangeHandlerImplementation = <T extends { [k: string]: any }>(
    props: ControlledInput<T>,
): FieldChangeHandler<T> => (val, fieldName): void => {
    const { disabled, name, value, onChange } = props;
    if (disabled || !onChange) return;

    if (typeof fieldName !== 'string') throw new MissingFieldError();

    onChange(
        {
            ...value,
            [fieldName]: val,
        },
        name,
    );
};

/**
 * Create a function to propagate a single field update on an object value.
 *
 * The function does nothing if the component is disabled.
 *
 * @param props
 *      The `props` from which the `ControlledInput` properties should be taken.
 * 
 * @public
 */
// This is a renaming of the function so that it presents as a hook to React.
// It currently doesn't use any of React's built-in hooks, but it should be used
// like a hook (unconditionally declared in the component) and we may use a hook
// for performance improvements in the future.
export const useFieldChangeHandler = fieldChangeHandlerImplementation;

/**
 * Create a function to propagate a single field update on an object value from
 * a class whose props extend `ControlledInput`. For function components, see
 * `useFieldChangeHandler`.
 *
 * The function does nothing if the component is disabled.
 *
 * @param component
 *      The component instance from which props should be taken.
 *      This will most typically be `this`.
 */
// tslint:disable-next-line:no-any
export const makeFieldChangeHandler = <T extends { [k: string]: any }>(
    component: Component<ControlledInput<T>>,
): FieldChangeHandler<T> => (value, name) =>
    fieldChangeHandlerImplementation(component.props)(value, name);
