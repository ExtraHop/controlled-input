import isEqual from 'lodash-es/isEqual';

import { Diagnostic, Severity } from 'validation';

interface BaseEntity {
    /**
     * The list of validation messages for the current value of the entity.
     *
     * Use caution if depending on this property for saved-and-unchanged
     * entities, as validation may not be run on initial data load.
     */
    diagnostics: Diagnostic[];
    /**
     * Whether the entity is currently being sent to the server.
     * It is recommended that updates are disallowed when this is `true`.
     */
    isSaving?: boolean;
    /**
     * Whether the entity is currently being deleted.
     * It is recommended that updates are disallowed when this is `true`.
     */
    isDeleting?: boolean;
}

/**
 * An entity that has not yet been sent to the server. Its ID is temporary,
 * and discarding unsaved changes must instead delete the entity.
 */
export interface NewEntity<T> extends BaseEntity {
    /**
     * The work-in-progress value, possibly containing changes that have not
     * been saved to the appliance. Note that this is lazily instantiated for
     * saved entities, so it should only be accessed with `Entity.latestValue`.
     *
     * This property is never null for new entities.
     */
    draft: T;
    saved: null;
}

/**
 * An entity that has already been created on the server. Its ID should not
 * change, and unsaved changes can be safely discarded to revert to server
 * state.
 */
export interface SavedEntity<T> extends BaseEntity {
    /**
     * The work-in-progress value, possibly containing changes that have not
     * been saved to the appliance. Note that this is lazily instantiated for
     * saved entities, so it should only be accessed with `Entity.latestValue`.
     *
     * This property is never null for new entities.
     */
    draft: T | null;
    /**
     * The on-server state of the resource.
     */
    saved: T;
}

/**
 * Container for an in-progress edit of a new or existing resource and its
 * validation messages. The entity is considered 'new' if `saved === null`.
 */
export type Entity<T> = NewEntity<T> | SavedEntity<T>;

export const Entity = {
    /**
     * Check if an entity has not yet been provisioned on the server.
     */
    isNew: <T>(entity: Entity<T>): entity is NewEntity<T> =>
        entity.saved === null,

    /**
     * Check if an entity has been provisioned on the server.
     */
    isSaved: <T>(entity: Entity<T>): entity is SavedEntity<T> =>
        entity.saved !== null,
    /**
     * Gets the in-progress value of an entity, falling back to the saved
     * one if the draft has not been instantiated.
     *
     * @returns A non-null `T`.
     */
    // The signature of the function has to exclude `null` from the returned
    // value so this function can be called after `Entity.isSaved` without the
    // return type implicitly broadening to include `| null` for the case of
    // an absent draft.
    latestValue: <T>(entity: Entity<T>): Exclude<T, null> =>
        (entity.draft || entity.saved) as Exclude<T, null>,

    /**
     * Checks if the entity has pending changes by comparing the draft value to
     * the saved value.
     */
    hasUnsavedChanges: <T>({ draft, saved }: Entity<T>): boolean =>
        draft !== null && !isEqual(draft, saved),

    /**
     * Checks if the entity has any error-level diagnostics. These will commonly
     * block saving.
     */
    hasErrors: <T>({ diagnostics }: Entity<T>): boolean =>
        diagnostics && diagnostics.some(d => d.severity === Severity.Error),

    /**
     * Create a new entity with no server resource or diagnostics.
     */
    createUnsaved: <T>(draft: T): Entity<T> => ({
        draft,
        diagnostics: [],
        saved: null,
    }),

    createSaved: <T>(saved: T): Entity<T> => ({
        draft: null,
        diagnostics: [],
        saved,
    }),
};
