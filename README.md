# controlled-input

There are lots of packages that try to tackle the problem of collecting user input in React.
This package does less than most of them, and as a result makes your life easier.

`controlled-input` is a lean, composable input library by [ExtraHop](https://extrahop.com).
We've been using it in production since 2017.

## Why

Early in ExtraHop's React adoption, we found ourselves struggling with forms.
Function components didn't exist then, so our first attempts were classes which had separate bound event handlers for every field in the form.
That didn't scale, and it didn't feel like the web anymore.
We were unhappy.

Stepping back, we realized that we liked React's way of controlling `input` components.
It made sense that we'd pass a value down and then get change events back up.
There were really only two things that were making us unhappy:

1. Our values were objects, not just primitives.
2. Making inputs for nested objects was too much boilerplate.

Based on those two observations, we created the `ControlledInput<T>` interface.

## What

At the core of the `controlled-input` package is the `ControlledInput<T>` interface.
It's very simple. In fact, without doc comments it's only:

```typescript
interface ControlledInput<T> {
    value: T;
    name?: string;
    disabled?: boolean;
    onChange?(newValue: T, name?: string): void;
}
```

You use it in the props type declaration for your component, like this:

```typescript
const SportsScoreInput: FC<ControlledInput<SportsScore>> = props => {
    // implementation elided
};
```

The first three properties exactly match the ones from HTML's own `input`, we've just made them generic over the value.
Our `onChange` is a bit different however.
We found that we didn't need most of the `Event` object, and it got in the way of composing inputs together.
We decided to ditch the object and just propagate the value and field name up.

One requirement of `controlled-input` is that all components actually implement the disabled state.
We initially omitted this from the interface, but found that it was too useful to leave out, and as long as every other input supported it, it wasn't that hard to add to your own component.

Once we started using `ControlledInput` in our code, we found that we have lots of inputs, but that most of those are compositions of other inputs.

## Input Validation

Once we started using `ControlledInput`, we found we were much happier, but validation was still difficult.
To solve this, we looked to TypeScript itself for inspiration.
`tsc` operates on a set of files and emits a list of **diagnostics**, which have severities, location information, a message for humans, and a message for machines.
It does much more powerful things than our client-side validation needs to, but that's a useful core concept.

From that, we can extract the `Diagnostic` interface:

```typescript
interface Diagnostic {
    message: string;
    severity: Severity;
    type: string;
    path: ObjectPath;
}
```

A validator is then something that accepts a value and produces a list of diagnostics.

```typescript
type Validator<T> = (value: T) => Diagnostic[];
```

These validators are themselves easy to compose, starting from simple checks like "string not empty" and moving up to much more complex, cross-field tests.
The key thing is that validation is expressed as a pure function that's easily unit-tested, and that our diagnostics don't need to create an object that matches the shape of our input in order to return deeply-nested diagnostics.

### Displaying Diagnostics

To indicate that your component is able to display errors and warnings, use the `ShowsDiagnostics` interface.
Many of our components are controlled inputs that also show diagnostics, so we see the following:

```typescript
const FootballRosterInput: FC<
    ControlledInput<FootballRoster> & ShowsDiagnostics
> = props => {
    /**
     * Create a getter function that takes a field name and
     * returns the matching child diagnostics
     */
    const diagnosticsFor = useDiagnosticsGetter(props);
    // implementation elided
};
```

### Validation on dirty/pristine fields

For most of our use-cases, we ended up not needing to behave differently for fields the user hadn't yet visited.
Also, pervasively tracking whether or not the user had "visited" an input required every component to define what "pristine" meant to it, and that was too much overhead when creating new components.
If you need to do this tracking, you can create your own `Pristine<T>` which adds a boolean for dirtiness adjacent to the value, and can then make your own validator which skips some checks while the field is pristine.

### Accessibility

Integration with assistive technologies is important.
In addition to being the right thing to do, thinking about accessibility makes your UI usable for more people, and lets the browser be more helpful to all users.

`controlled-input` does not provide anything for accessibility.

This is a good thing.
This package doesn't have opinions on how your inputs look visually, so it wouldn't make sense for it to have opinions on how it looks to people who need assistive technologies.
In the browser, you can use the `diagnostics` prop to drive ARIA attributes on your input elements - e.g. `aria-invalid`.

## Form State and `Entity`

With `ControlledInput` and `ShowsDiagnostics`, we have a way to pass values and diagnostics down the React tree and to pass changes back up again.
But where does it stop?
What is `controlled-input`'s version of a root `form` element?

You don't have to use any particular root - you can use your controlled inputs with any state management, from `useState` up to Redux.

That said, we found there was recurring boilerplate in our input state management.
Specifically, we found we needed:

-   A way to determine if there were unsaved changes.
-   A place to keep the diagnostic list
-   A place to store whether we're busy saving and therefore shouldn't be accepting changes from the user

We created a type for this too: `Entity<T>`.
This keeps the draft and saved values, the diagnostics for the draft value, and the `isSaving` boolean.
To work with redux, `Entity` is a plain object, so we expose utility functions for them as static functions off the `Entity` type, used as follows:

```typescript
// Here we use Entity as a type
const findQb = (v: Entity<FootballRoster>): Player => {
    // And here we call a utility function on Entity the value
    return Entity.latestValue(v).qb;
};
```

If you want to use an `Entity` for a simple form, we provide the `useEntity` hook.
Like `useState`, the hook returns two arguments, but the second is an object containing a set of different meaningful update operations you can perform on the `Entity`.
