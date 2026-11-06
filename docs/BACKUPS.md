# Backups and health checks

## Weekly backup (`.github/workflows/backup.yml`)

Every Sunday, GitHub makes a copy of SelfShelf's database: every account, shelf, book, journal entry,
memory, room and guest-book note. The copy is compressed and **locked with your passphrase** (AES-256)
before it's stored, because this repository is public. Without the passphrase the file can't be read.
Each copy is kept for 30 days under **Actions → Weekly backup → the run → Artifacts**.

Uploaded cover photos are files in Supabase Storage, so they aren't in this copy. Book covers from
Open Library and Google Books are links and are restored with the books.

### One-time setup

1. **Supabase → your project → Connect** (top bar) → **Session pooler** → copy the connection string.
   Use the Session pooler string, not "Direct connection", because GitHub can't reach the direct one.
   Replace `[YOUR-PASSWORD]` with your database password. If you've forgotten it, reset it under
   **Project Settings → Database**.
2. **GitHub → Settings → Secrets and variables → Actions → New repository secret**
   - `SUPABASE_DB_URL`: the connection string from step 1
   - `BACKUP_PASSPHRASE`: a long passphrase (12+ characters). **Save it in a password manager.
     Without it the backups can't be opened.**
3. **Actions → Weekly backup → Run workflow** once to check it. A green tick means it worked.

### Restoring

Ask for help with this; it's rarely needed. In short:

```sh
gpg -d selfshelf-YYYY-MM-DD.sql.gz.gpg | gunzip > selfshelf.sql   # asks for the passphrase
psql "<connection string>" -f selfshelf.sql                       # into a fresh Supabase project
```

## Site health check (`.github/workflows/health-check.yml`)

Every six hours GitHub checks that:

- www.selfshelf.in loads;
- selfshelf.in and the old bookshelf-three-woad.vercel.app address still forward to it;
- the book search helper (`/api/catalog`) answers;
- the database answers.

If anything fails, the run turns red and GitHub emails the repository owner. Check that **GitHub →
Settings → Notifications → Actions** is set to email you about failed workflows.

## Keep Supabase awake (`.github/workflows/keep-supabase-awake.yml`)

Twice a week, a tiny read-only request keeps the free Supabase project from pausing.
