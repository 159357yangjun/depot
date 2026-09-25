# Dependency lock policy

v1.2.3+ stops using floating direct npm ranges and changes the networked build pipeline to:

```text
resolve Cargo.lock / package-lock.json
→ cargo check --locked / cargo test --locked
→ npm ci
→ production build
→ upload the exact lock files used by the build
```

The current ChatGPT packaging environment cannot reach crates.io or npm registry, so it cannot honestly manufacture valid full lock files locally. The first successful GitHub Actions run will publish an artifact containing:

- `Cargo.lock`
- `apps/desktop/package-lock.json`
- `website/package-lock.json`

Commit those files back to the source repository. After that, the workflow should be tightened further to reject lock drift instead of regenerating it.
