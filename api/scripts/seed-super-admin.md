Run only from an interactive terminal on the production server, from the `api` directory,
with the existing production `DATABASE_URL` securely supplied by that environment:

```sh
NODE_ENV=production npm run seed:super-admin
```

For a PowerShell production host:

```powershell
$env:NODE_ENV = 'production'
npm run seed:super-admin
```

Review the displayed database host/name, then type the requested confirmation. Supply the
real account holder's full name and unique Egyptian mobile. Enter a new password twice
(hidden input). The email is fixed as `abdo@farmexit.com`. No password arguments are accepted.
The command follows the project's existing `npx -y tsx` tooling; tsx must be available or
installable on the production host.

The script creates the active user, active `superAdmin` membership, and enabled Dashboard
Credential in one transaction, using the existing PasswordService (Argon2id and password
policy). It does not assert OTP verification of the supplied mobile. It verifies the records
inside the transaction and again after commit without displaying hashes or secrets.

A rerun verifies an existing complete account and exits without changes or password prompts.
An incomplete/conflicting account or an occupied mobile causes an error without repairs,
password resets, or role changes. Concurrent creation is protected by unique constraints
and rollback. If post-commit verification fails, inspect the account before retrying.

Sign in at https://farm-exit-xcmz.vercel.app/en/admin/login using the fixed email and the
password entered during successful creation. This operation is never wired to install,
startup, deployment, migration, or the general Prisma seed.

Check the script without executing it:

```sh
npx tsc -p scripts/tsconfig.super-admin.json
```
