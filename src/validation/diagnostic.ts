import sortBy from 'lodash-es/sortBy';

import { ObjectPath } from './objectPath';
import { Severity } from './severity';

export interface DiagnosticData {
    /** The human-facing message for a validation error or warning. */
    message: string;
    /**
     * The kind of the validation, such as `required` or `maxLength`.
     * A single field may only have one validation per type at a time.
     */
    type: string;
    /**
     * The level of the diagnostic. Non-errors MUST NOT block form submission.
     */
    severity: Severity;
    /**
     * Nested diagnostic information.
     */
    next?: DiagnosticData;
}

/**
 * A validation message about some user-provided input.
 */
export interface Diagnostic extends DiagnosticData {
    /**
     * The location - relative to some root - where the diagnostic applies.
     * This is an object path, so an error in a custom device criterion might
     * have a path which serializes to `criteria[1].src_port_max`.
     */
    path: ObjectPath;
}

export const Diagnostic = {
    /**
     * Returns `true` if this diagnostic is under the specified property path.
     * @param diagnostic The diagnostic whose path is to be assessed
     * @param pathPrefix The scope to be evaluated
     */
    isFor: ({ path }: Diagnostic, pathPrefix: ObjectPath): boolean =>
        ObjectPath.startsWith(path, pathPrefix),
    flattenMessages: (diagnostic: DiagnosticData): string[] => {
        if (!diagnostic.next) return [diagnostic.message];
        return [
            diagnostic.message,
            ...Diagnostic.flattenMessages(diagnostic.next),
        ];
    },
};

export type DiagnosticKey = string;

export const DiagnosticKey = {
    /**
     * Generates a key for the diagnostic that is expected to be
     * persistent and unique.
     */
    of: ({ path, type }: Diagnostic): DiagnosticKey =>
        [ObjectPath.toString(path), type].join('--'),
};

/**
 * Find the highest diagnostic severity in a collection of diagnostic messages.
 *
 * @param diagnostics The collection of diagnostics to search
 */
export const maxSeverity = (
    diagnostics: Diagnostic[] | undefined,
): Severity | null => {
    if (!(diagnostics && diagnostics.length)) {
        return null;
    }

    return sortBy(diagnostics, d => d.severity)[0].severity;
};