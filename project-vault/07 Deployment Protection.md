# Deployment protection

Baseline: main at 4166846d29b19de9ca6e5973fbd8f4012dd059a2. Clean working tree verified after authorized recovery move, before switching to portfolio-rebuild.

GitHub Actions uses Node 20, npm ci, npm run build, uploads out/, and deploys GitHub Pages on main. next.config.mjs enables static export and unoptimized images. public/CNAME holds the custom domain. Manifest scripts and all manifest/lockfile bytes are protected. Additional compiler, CSS build and ignore configuration are conservatively protected. No other project hosting adapters, environment files, Docker, DNS infrastructure or deployment scripts were found in the project inventory; installed dependencies and generated build directories are excluded. Never read or copy credentials.

Run `node scripts/verify-protection.mjs` after each phase. Hash mismatch is a stop condition; do not restore silently. The machine-readable inventory is protected-files.json.

| Path | SHA-256 |
|---|---|
| `.github/workflows/deploy.yml` | `0acc7279c3db2ab055c7d6f9816fdf23423ca93b8bfd6568edf186c4b8d16f7c` |
| `next.config.mjs` | `f693f0fbc511232eb19d1ce82265715c24930224268887620dc9142b7eb7fc18` |
| `public/CNAME` | `f57621a963ad8c4adbec9afd383c38228c03322f94374f78aa6437700a8ba7c9` |
| `package.json` | `df557de83f3787446f535b0548535fde5247750fb7f302ebf628cf023ed81271` |
| `package-lock.json` | `53e63c284d66ee3ea8fa686abd9b1a4e7a74908458438d3c141d6f6fd4243c13` |
| `.gitignore` | `3475892c4cddd898332c0388e7975de6079229191125b9b9482bd0a52e11a2d9` |
| `tsconfig.json` | `54202f1d6d35ba51c3daea32bf67e8da24568ec0cb0c341fa0b5ed2ceb174f2d` |
| `postcss.config.mjs` | `efa65c65e17d51d58570edce9d702b0604fdf6a9b8db65afaed8f075af8867c7` |
| `tailwind.config.ts` | `6aac07f45e18eb3082c45bc36f209582f34d9331f55c9fa0142fa2ab49b55955` |

## Contemporary desk iteration verification

Final verification on 8 September 2026: all nine recorded SHA-256 hashes match and Git diff contains no protected-file changes. Existing GitHub Pages static export succeeds. The manifest, lockfile, workflow, domain, framework and build configuration remain untouched.

After-hours pass: all nine protected hashes and deployment diffs verified unchanged after the final production export on 8 September 2026. No manifest, lockfile, domain, workflow, framework or runtime configuration was changed.
