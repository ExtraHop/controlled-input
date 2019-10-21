import { ObjectPath } from './objectPath';
import { Validator } from './validator';
import { Diagnostic } from './diagnostic';

/**
 * Props for a component that is capable of showing errors and warnings.
 */
export interface ShowsDiagnostics {
    /**
     * An unordered list of diagnostic messages to show the user. `undefined`
     * means the component will _never_ be asked to show diagnostics, while
     * an empty array means that the component does not _currently_ have
     * diagnostics to display.
     */
    diagnostics?: Diagnostic[];
    /**
     * The location in the model which this component is responsible for.
     * Compound inputs will likely consume this property indirectly, through
     * the `useDiagnosticsGetter` hook.
     *
     * Scalar inputs such as `IntegerInput` are not required to consume this,
     * as they expect diagnostic filtering to be done by the calling component.
     */
    modelPath?: ObjectPath;
}

/**
 * Find all diagnostics in the given list whose `path` property starts
 * with the given prefix.
 */
export const diagnosticsFor = (
    msgs: Diagnostic[],
    pathPrefix: ObjectPath,
): Diagnostic[] => {
    if (pathPrefix === ObjectPath.EMPTY) {
        return msgs;
    }

    return msgs.filter(d => Diagnostic.isFor(d, pathPrefix));
};

/**
 * HOF that returns a function to get errors for a named field from a
 * component's props. This is exposed as `useDiagnosticsGetter` for function
 * components, and `diagnosticsGetterFor` for class components.
 *
 */
// This is distinct from `useDiagnosticsGetter` because the linter gets
// upset if we call a hook function from a non-hook function. We may later
// choose to have the hook version memoize, in which case this should stay
// distinct.
const diagnosticGetterImplementation = (
    props: ShowsDiagnostics,
): Validator<string> => prop => {
    const { diagnostics, modelPath } = props;
    if (!(diagnostics && diagnostics.length)) {
        return [];
    }

    return diagnosticsFor(
        diagnostics,
        ObjectPath.extend(modelPath || ObjectPath.EMPTY, prop),
    );
};

/**
 * Hook that returns a function to get errors for a named field from a
 * component's props. This is equivalent to `diagnosticsGetterFor` for class
 * components.
 */
export const useDiagnosticsGetter = diagnosticGetterImplementation;

/**
 * HOF that returns a function to get errors for a named field from a
 * component's props for class components. For function components, use the
 * equivalent `useDiagnosticsGetter`.
 *
 * @param c
 *      The component whose props should be used to fetch diagnostics.
 *      This will typically be `this`.
 */
export const diagnosticsGetterFor = (
    c: React.Component<ShowsDiagnostics>,
): Validator<string> => fieldName =>
    diagnosticGetterImplementation(c.props)(fieldName);
