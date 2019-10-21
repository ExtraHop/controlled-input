/**
 * Type definition for `ControlledInput#onChange`.
 *
 * * The first argument must always be a complete new value
 * * The second argument must always be the `name` of the field in the
 *   parent that should be updated.
 */
export type ChangeHandler<T> = (newVal: T, name?: string) => void;

/**
 * A change handler for any field of a specific type.
 */
export type FieldChangeHandler<T> = ChangeHandler<T[keyof T]>;

/**
 * Props for an externally-controlled user input component.
 * The component should accept a value of `T` and then report changes to
 * that value via the `onChange` function.
 *
 * It is **required** that `ControlledInput` components support the disabled state;
 * a `ControlledInput` component must be visibly not accepting user input when the
 * prop is `true`.
 *
 * See `practices/inputs.md` in depot-ui for the full guide of how to use
 * `ControlledInput`, including an example of composition of controlled inputs.
 */
export interface ControlledInput<T> {
    /**
     * The name of the controlled component. If specified, this must be passed
     * as the second argument to the `onChange` handler.
     */
    name?: string;
    /**
     * Callback invoked when user input may have altered the value of
     * the component. For non-primitive types, it is required that the
     * instance of `T` be a new object so that deep comparison is not
     * needed to trigger component rendering updates.
     *
     * In some cases, the user may have to take multiple actions for a new
     * value to be emitted; for example, filtering in a dropdown may have
     * multiple keystrokes before the user selection is changed.
     */
    onChange?: ChangeHandler<T>;
    /**
     * The current value of the controlled component.
     *
     * In general, this should not be `undefined`; that typically identifies
     * uncontrolled components. When an absence of a value is supported by
     * the component, `null` is a better signifier as it cannot be mistaken
     * for the absence of a key in an object.
     */
    value: T;
    /**
     * When `true`, the component must not emit `onChange` events and must
     * present as readonly to the user.
     */
    disabled?: boolean;
}

