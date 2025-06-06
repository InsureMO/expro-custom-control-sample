# Shadow DOM Integration Patch for Angular v19 and PrimeNG

Working with Shadow DOM introduces specific challenges that must be addressed to ensure the application behaves consistently with traditional DOM-based apps. This document outlines key issues encountered and the corresponding patching strategies applied to Angular v19 and PrimeNG for seamless Shadow DOM integration.

## Common Issues When Using Shadow DOM

The following limitations and behaviors are typically encountered when working with Shadow DOM:

- **CSS Scope Isolation**:  
  CSS rules using the `:root` selector are ineffective within Shadow DOM. Instead, the `:host` selector must be used to correctly apply styles scoped to the Shadow Host element, preventing style leakage to or from the global DOM.

- **Overlay Styling Limitations**:  
  Components that create overlays (e.g., modals, dropdowns) often append elements directly to `document.body`. These appended elements fall outside the Shadow DOM scope and consequently do not inherit shadow-specific styles. To resolve this, overlays must be programmatically redirected to be appended inside the `shadowHost.shadowRoot`.

- **Document Body Access Restrictions**:  
  JavaScript executing inside a Shadow DOM cannot directly access `document.body`. Therefore, any usage of `document.body` in external component libraries must be refactored to utilize the respective `shadowRoot` instead.  
  > _Example_: A custom `drawer` module has been reimplemented in this patch to adhere to this restriction.

- **Service Lifecycle Leakage**:  
  Angular services declared with `providedIn: 'root'` may continue to persist in memory even after a Shadow DOM component is destroyed. This may lead to stale state or memory leaks. It is crucial to manually destroy or reinitialize such services when the component lifecycle ends.

- **Ongoing Compatibility Challenges**:  
  Developers may encounter additional unforeseen behaviors due to the encapsulated nature of Shadow DOM. Despite this, the modularity and style encapsulation benefits justify the additional complexity. Patience and thorough testing are key.

---

## Patch Implementation Overview

The following steps were taken to patch Angular v19 and PrimeNG for Shadow DOM compatibility:

### 1. CSS Patch via `PatchService`

The `PatchService` constructor overrides PrimeNG’s internal `useStyle` logic:

- The `use` method in PrimeNG’s dynamic style engine is intercepted.
- All CSS rules using `:root` are programmatically rewritten to use `:host`.
- Instead of appending `<style>` elements to `document.head`, styles are injected into the Shadow DOM using `shadowRoot.appendChild`.

### 2. Integration into Angular Application

- The `PatchService` is registered as a provider in `app.config.ts`.
- It is included **after** all Angular framework providers but **before** PrimeNG-specific providers to ensure the patch hooks into PrimeNG’s styling lifecycle effectively.

### 3. Lifecycle Management in App Component

- On `AppComponent` destruction:
  - PrimeNG’s theme-related providers are explicitly cleared to avoid leftover styles or service instances.
- On `AppComponent` initialization:
  - The theme system is reinitialized to apply styles cleanly within the Shadow DOM context.

---

By applying the above strategies, Shadow DOM support has been successfully integrated with Angular v19 and PrimeNG in this repository. 
