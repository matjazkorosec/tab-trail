# Releasing

For the owner. The `gh` command line tool is not installed, so the setup is click steps on github.com and npmjs.com.

## First-time setup

### 1. Create the public repo

1. On github.com, click New repository.
2. Owner `matjazkorosec`, name `tab-trail`, Public. Leave "Add a README", ".gitignore" and "license" off, the repo has them.
3. Click Create repository.

### 2. Push

```sh
git remote add origin https://github.com/matjazkorosec/tab-trail.git
git push -u origin main
```

### 3. Protect `main`

1. Settings, Branches, Add branch ruleset (or Add rule), target `main`.
2. Tick "Require a pull request before merging" and "Require review from Code Owners".
3. Tick "Require status checks to pass", then add the `test` check (from the CI workflow) and `analyze` (CodeQL). They show up after their first run.
4. Let admins bypass it: in a ruleset, add Repository admin to the bypass list; in a classic rule, leave "Do not allow bypassing the above settings" off.
5. Save.

### 4. Security

1. Settings, Code security: turn on Private vulnerability reporting.
2. Same page: turn on Dependabot alerts and Dependabot security updates. Version updates already run from `.github/dependabot.yml`.
3. CodeQL already runs from `.github/workflows/codeql.yml`. Leave CodeQL "Default setup" off, or the 2 clash.

### 5. About box

1. On the repo home, click the gear next to About.
2. Website: `https://matjazkorosec.com/tools/tab-trail`.
3. Topics: `accessibility`, `a11y`, `wcag`, `keyboard`, `focus`, `tab-order`, `bookmarklet`, `playwright`.
4. Save.

### 6. Social preview

Settings, General, Social preview, Edit, Upload an image: `.github/assets/social.png`.

### 7. npm

1. Sign up or sign in on npmjs.com and turn on 2FA.
2. Avatar, Access Tokens, Generate New Token, Granular Access Token. Packages: read and write, all packages (`tab-trail` doesn't exist before the first publish). Tick bypass 2FA.
3. On GitHub: Settings, Secrets and variables, Actions, New repository secret. Name `NPM_TOKEN`, value the token.
4. The token expires (90 days at most). Before each release, check it and make a new one if it ran out.
5. Optional, after the first publish: on npmjs.com, set up trusted publishing for this repo and `release.yml`. The workflow already has `id-token: write`, so it can then publish without the token.

### 8. Off

Settings, General, Features: untick Discussions and Sponsorships.

### 9. The `no-changelog` label

Issues, Labels, New label. Name `no-changelog`, then Create label. CI lets a pull request that changes `src/` skip the Unreleased bullet only when it has this label.

## First release (1.0.0)

1. Do every first-time setup step above, including the `NPM_TOKEN` secret, in the same sitting as the first push.
2. `CHANGELOG.md` already has 1.0.0, so there is nothing to rename or bump. Tag and push:

   ```sh
   git tag -a v1.0.0 -m v1.0.0 && git push --follow-tags
   ```

3. Check the Release run under Actions, the package page on npmjs.com and the release under Releases on GitHub.

## Each release

1. In `CHANGELOG.md`, rename "Unreleased" to the new version and date, like `## 1.0.1 (2026-11-05)`, put 1 summary line under it, and add an empty `## Unreleased` above it.
2. Bump `version` and `updated` in `package.json`.
3. Run:

   ```sh
   npm run build && npm run docs && npm test && npm run check
   ```

4. Commit, then tag and push:

   ```sh
   git tag -a vX.Y.Z -m vX.Y.Z
   git push --follow-tags
   ```

   The Release workflow checks the tag against `package.json`, publishes to npm with provenance, and makes the GitHub release with `dist/tab-trail.js` attached.

   If `npm publish` worked but `gh release create` failed, rerun only the failed job: open the run under Actions and click Re-run failed jobs. That reruns `github-release` alone. Never rerun all jobs, since npm refuses to publish the same version twice.
5. On the site: bump the exact pin of `tab-trail`, add a "See it" scene for every new feature, and check the page.
