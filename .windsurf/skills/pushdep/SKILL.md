# Push to Origin Main

## Description
This skill pushes local changes to the origin main branch.

## Usage
Use this skill when you need to push your committed changes to the remote repository's main branch.

## Steps
1. Ensure all changes are committed
2. Push to origin main

## Command
```bash
git push origin main
```

## Notes
- Make sure you have the necessary permissions to push to the main branch
- Consider using `git push origin main --force` only when absolutely necessary
- If the remote has changes you don't have locally, you may need to pull first with `git pull origin main`

