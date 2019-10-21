import { useEffect, useMemo, useRef, useState } from 'react';

import { Entity } from './entity';
import { isNonVoid } from './util';
import { Validator } from './validation';

const noValidations: Validator<unknown> = () => [];

interface EntityUpdater<T> {
    /**
     * Update the draft value and recompute diagnostics. It is safe to call this
     * without using `bind`, so it can be passed directly to `onChange` in a
     * React component.
     * @param value The new work-in-progress value
     */
    update(value: T): void;
    /**
     * Update the saved value.
     *
     * @param value The latest value from the server
     */
    updateSaved(value: T): void;
    /**
     * Mark whether or not the `Entity` is being saved to the server. Inputs
     * that consume entities use this information to block user input while
     * saving.
     */
    setSaving(isSaving: boolean): void;
    /**
     * Handle local state updates associated with saving an entity. The caller
     * is responsible for creating the `Promise` that represents the task; this
     * function will then hook into that and take care of:
     *
     * 1. Setting `isSaving` on the entity to prevent in-flight edits.
     * 2. Clearing `draft` on save completion so the user sees the latest server
     *    value.
     * 3. Running local validators on the just-saved value so that warnings are
     *    not lost on save.
     *
     * @param savePromise The async operation that is sending the local copy
     * of the entity to the backend. If this returns a value, that will be
     * used as the new `saved` value. Otherwise, the `draft` value when the save
     * started will be used.
     *
     * @returns A promise that completes when the save operation and associated
     * state changes are complete. If the save promise rejects, the rejection
     * will contain the error from the passed-in `savePromise`.
     */
    save(savePromise: Promise<T | undefined | void>): Promise<void>;
}

/**
 * Create a free-standing `Entity` with an updater. This is commonly used to
 * keep state at the "root" of a particular form.
 *
 * @param initialValue The initial value for the entity
 * @param isSaved Whether `initialValue` is already known to the backend
 * @param validator The validation function to apply on updates. Changing this
 * function will cause validation to rerun - be sure to memoize if it's
 * declared within the component. By default, no validations are run.
 *
 * @returns An `Entity<T>` with the latest value, and an object with functions
 * to update the entity.
 */
export const useEntity = <T>(
    initialValue: T,
    isSaved: boolean,
    validator: Validator<T> = noValidations,
): [Entity<T>, EntityUpdater<T>] => {
    const [inner, setInner] = useState<Entity<T>>(() => ({
        ...(isSaved
            ? Entity.createSaved(initialValue)
            : Entity.createUnsaved(initialValue)),
        diagnostics: validator(initialValue),
    }));

    /**
     * If `true`, the parent component has been unmounted and we should be dead,
     * but if we're reading this and it's true we've been kept alive because
     * we were waiting a promise to settle. No `setState` calls should be made.
     */
    const isUnmounted = useRef(false);
    useEffect(
        () => () => {
            isUnmounted.current = true;
        },
        [],
    );

    const liveValidator = useRef(validator);

    // Validators can close over external state which may impact validation, so
    // if the function is not referentially-equal to the last one we got, we
    // should revalidate the whole entity and show the results.
    //
    // XXX This can result in an infinite render loop if someone creates an
    // unmemoized lambda in their component/hook, but there's no way to stop
    // that short of removing the _ability_ to change the validator after first
    // first calling the hook, and that seems heavy-handed.
    if (validator !== liveValidator.current) {
        liveValidator.current = validator;
        setInner({
            ...inner,
            diagnostics: validator(Entity.latestValue(inner)),
        });
    }

    /**
     * A reference to the state value which we can read from our updater
     * methods.
     */
    const liveEntity = useRef(inner);
    liveEntity.current = inner;

    /**
     * Memoized updater methods are used so that downstream code doesn't have
     * to declare these functions as dependencies in their memoizations or
     * callbacks.
     */
    const updateMethods = useMemo<EntityUpdater<T>>(
        () => ({
            update(newValue) {
                setInner({
                    ...liveEntity.current,
                    draft: newValue,
                    diagnostics: liveValidator.current(newValue),
                });
            },
            updateSaved(value) {
                setInner({
                    ...liveEntity.current,
                    saved: value,
                });
            },
            setSaving(isSaving) {
                setInner({
                    ...liveEntity.current,
                    isSaving,
                });
            },
            async save(savePromise) {
                const valueAtSaveTime = Entity.latestValue(liveEntity.current);
                setInner({
                    ...liveEntity.current,
                    isSaving: true,
                });

                // An error here will cause the function to return a rejected
                // promise. The caller is responsible for deciding how to handle
                // save failure.
                try {
                    const fromPromise = await savePromise;

                    // If we were unmounted while the promise was pending,
                    // we should do nothing.
                    if (isUnmounted.current) return;
                    const current = liveEntity.current;
                    const saved = isNonVoid(fromPromise)
                        ? fromPromise
                        : valueAtSaveTime;

                    setInner({
                        ...current,
                        isSaving: false,
                        draft: null,
                        saved,
                        diagnostics: liveValidator.current(saved),
                    });
                } catch (e) {
                    if (!isUnmounted.current) {
                        setInner({
                            ...liveEntity.current,
                            isSaving: false,
                        });
                    }

                    throw e;
                }
            },
        }),
        [],
    );

    return [inner, updateMethods];
};
