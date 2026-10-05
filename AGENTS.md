# Cosmix Mobile

- Read README.md before working. This is the separate React Native mobile project, not the web frontend.
- Current scope is folders and project architecture only. Do not add mock screens, placeholder dashboards, demo accounts, screenshots, artifacts or a test suite without an explicit request.
- Do not create employee/customer/client-specific application trees. Keep the generic shared structure. Roles control approved access, not duplicate source folders.
- App.tsx delegates to src/app/App.tsx, which intentionally renders null. Empty folders are intentional.
- Keep screens in src/screens, shared controls in src/components, navigation in src/navigation and integration adapters in src/services.
- Do not add state, navigation, API, storage, camera or location libraries until an approved feature requires them.
- .NET must enforce permissions, record scopes and business rules. Mobile route visibility is not security enforcement.
- Do not invent business fields, API contracts, approval chains, attendance calculations or device permissions.
- Never commit production data, tokens or signing secrets. No fake authentication, attendance or identity checks.
- React Native cannot treat .env values or application bundles as secret storage.
- Preserve the existing web, backend and reference mockup projects. No deployment, Git initialization or push without authorization.
- Run npm run verify for source changes. Report native builds and device behavior as unverified unless actually exercised.
