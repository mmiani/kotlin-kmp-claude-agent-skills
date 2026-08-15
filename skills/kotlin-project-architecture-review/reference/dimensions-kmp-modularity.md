# KMP source sets, modularity, and entry surface

Review dimensions 11-15: source-set correctness, shared vs platform boundary quality, module boundaries, navigation and intent entry, and manifest/exported surface.

Reference material for the `kotlin-project-architecture-review` skill. Read this file when the work touches these concerns.

---

## 11. Source-set correctness in KMP

Check whether code in `commonMain` is truly valid for all declared targets.

Review:
- whether `commonMain` references platform APIs
- whether target-specific behavior is isolated
- whether source-set placement follows compilation reality rather than convenience
- whether the design would still work if more targets were added
- whether the proposal is over-sharing code that is only common accidentally

Flag as a concern when:
- platform-specific APIs appear in shared code
- shared code assumes one platform’s lifecycle, resources, filesystem, or navigation model
- platform-only dependencies leak into common code
- code is pushed into `commonMain` only to reduce duplication, despite bad abstraction fit

## 12. Shared vs platform-specific boundary quality

Check whether:
- the proposal shares the right things
- native concerns stay at the edges
- expect/actual is justified and small
- abstraction boundaries are minimal and clear
- platform differences remain understandable rather than hidden behind vague interfaces

Flag as a concern when:
- platform-specific code leaks into business logic
- large expect/actual surfaces own feature logic
- native or vendor types spread through shared modules
- abstractions hide meaningful behavioral differences in a confusing way
- the proposal creates portability costs without meaningful reuse benefit

## 13. Module boundaries and modularization quality

Check whether:
- each module has a clear purpose
- dependencies are intentional and minimal
- public APIs are narrow
- shared modules are truly shared and not dumping grounds
- feature ownership remains cohesive
- modules align with actual ownership, not only packaging aesthetics

Flag as a concern when:
- unrelated features depend on each other directly
- common/shared/core modules accumulate unrelated code
- visibility is broad for convenience
- granularity is either too coarse or too fragmented
- modules exist only to satisfy theory while increasing coupling or indirection

## 14. Navigation and Android component interaction

Check whether:
- navigation ownership is clear
- route definitions are coherent
- start-destination behavior is understandable
- back behavior is realistic
- intent-driven entry points fit the navigation model
- Activities launched via explicit or implicit intents still delegate into the same architecture instead of bypassing it
- deep-link entry and in-app navigation converge cleanly

Flag as a concern when:
- deep links or intent entries create architecture bypasses
- routes are brittle and stringly typed without structure
- navigation behavior depends on hidden assumptions
- a feature’s real entry points differ depending on how the user arrived there
- navigation ownership is split across too many layers

## 15. Manifest and exported-surface review

Android components must be visible to the system through the manifest, and manifest declarations define part of the app’s architectural surface.

Check whether:
- Activities, Services, and ContentProviders that should run are declared appropriately
- BroadcastReceivers are declared or dynamically registered intentionally
- intent filters are added only where they represent real external entry points
- manifest exposure matches the intended architecture surface
- privileged or admin-like flows are not overexposed
- exported components are justified and bounded

Flag as a concern when:
- components rely on accidental manifest exposure
- architectural entry points are unclear from declarations
- too many components are externally reachable without a clear reason
- manifest declarations and actual ownership boundaries drift apart
- exported surface is broader than the product actually needs
