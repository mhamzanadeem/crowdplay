# Publishing to GitHub

Requested target: https://github.com/mhamzanadeem/crowdplay.git, branch main, at least 25 meaningful commits.

The agent cannot write the root .git/index.lock in this sandbox. Isolated Git metadata is stored in ignored .publish-git with this directory as its worktree. A portable crowdplay-history.bundle is also generated and ignored. No environment secrets, installed dependencies, generated builds or publishing metadata belong in the commits.

From the user's PowerShell, inspect and push the prepared history:

```powershell
Set-Location C:\CrowdPlay
git --git-dir=.publish-git --work-tree=. log --oneline main
git --git-dir=.publish-git --work-tree=. push -u origin main
```

This is a normal push, not a force push. If GitHub already has commits on main, stop and integrate that history before retrying; do not overwrite it. The remote head could not be inspected in the agent environment because Git cannot resolve github.com and the connected GitHub account receives 404 for this repo.

The bundle is a portable backup of the prepared main history. It can be inspected with `git bundle verify crowdplay-history.bundle` and cloned into a new empty directory if needed. It is not evidence that GitHub received the commits.

Current validation: 22 unit tests, source checks, TypeScript and ESLint pass. Production build remains blocked by sandbox process/EPERM errors; live database and browser verification remain pending. Review dependency advisories reported during installation before production deployment.
