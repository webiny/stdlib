---
"@webiny/stdlib": patch
---

Depend on `@webiny/di` 2.0. stdlib's abstractions and implementations now target `@webiny/di` 2.x containers, so projects that register stdlib features must use `@webiny/di` 2.x as well; 1.x containers no longer type-check against them. See the `@webiny/di` 2.0.0 changelog for the container changes (singletons built from the registering container, new `inContainerScope()`).
