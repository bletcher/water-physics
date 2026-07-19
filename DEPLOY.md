# Deploying

This app deploys to AWS the same way as `events-listing`: a static build is
synced to a **shared S3 bucket** under the **`/water-physics`** subpath and served
through **CloudFront**. The pipeline lives in
[.github/workflows/deploy.yml](.github/workflows/deploy.yml) and runs on every push
to `main` (or manually via *Actions → Build and Deploy → Run workflow*).

Result URL: `https://<your-cloudfront-domain>/water-physics/`

## One-time setup

### 1. Create the GitHub repo and push

```bash
# from the project root
gh repo create water-physics --private --source=. --remote=origin --push
# (or, if the repo already exists)
git remote add origin git@github.com:<you>/water-physics.git
git push -u origin main
```

### 2. Add the repository secrets

The workflow reads the **same secret names** as events-listing. If you set them at
the **organization** level, this repo may already inherit them — otherwise add them
under *Settings → Secrets and variables → Actions*:

| Secret | What it is |
| --- | --- |
| `AWS_ACCESS_KEY_ID` | IAM key with `s3:PutObject`/`DeleteObject`/`ListBucket` on the bucket and `cloudfront:CreateInvalidation` |
| `AWS_SECRET_ACCESS_KEY` | matching secret |
| `AWS_REGION` | e.g. `us-east-1` |
| `S3_BUCKET` | the shared bucket name (no `s3://`, no path) |
| `CLOUDFRONT_DISTRIBUTION_ID` | the distribution in front of the bucket (optional — invalidation is skipped if unset) |

Set them from the CLI if you prefer:

```bash
gh secret set AWS_ACCESS_KEY_ID
gh secret set AWS_SECRET_ACCESS_KEY
gh secret set AWS_REGION            # e.g. us-east-1
gh secret set S3_BUCKET
gh secret set CLOUDFRONT_DISTRIBUTION_ID
```

That's it — the next push to `main` builds and deploys.

## The subpath coupling

Two places encode the `/water-physics` subpath and **must stay in sync**:

- `S3_PATH: water-physics` in [.github/workflows/deploy.yml](.github/workflows/deploy.yml)
- `base: '/water-physics/'` (production) in [vite.config.ts](vite.config.ts)

To host under a different path, change both. To host at the **root** of a
dedicated bucket instead, set `base: '/'` and `S3_PATH` to empty (and point
`S3_BUCKET` at that bucket).

## Verifying a build locally

```bash
npm run build          # emits dist/ with /water-physics/ asset URLs
npm run preview        # serves the production build to eyeball it
```
