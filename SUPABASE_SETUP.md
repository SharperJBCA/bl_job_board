# Supabase setup for player registration + sessions

This project can stay statically hosted while using Supabase for auth and database features.

## 1) Create a Supabase project

1. Create a project at https://supabase.com.
2. In **Authentication > Providers**, enable Email auth.
3. In **SQL Editor**, run `supabase_schema.sql` from this repo.

## 2) Set site config values

Edit `_config.yml` and set:

```yml
supabase:
  url: "https://YOUR_PROJECT_REF.supabase.co"
  anon_key: "YOUR_PUBLIC_ANON_KEY"
```

The anon key is intended for browser usage and is safe to expose in frontend code.

## 3) Promote a GM account (for creating sessions)

By default, every new user is created as a non-GM player. To allow one user to schedule sessions:

```sql
update public.profiles
set is_gm = true
where id = '<user-uuid>';
```

You can find a user UUID in **Authentication > Users**.

## 4) Use the Sessions page

Navigate to `/sessions/` after deploying.

Players can:
- create an account or sign in
- update display name (self-registration profile)
- join or leave open sessions

GMs can:
- create new session posts (title/date/capacity/notes)

## Notes

- This implementation intentionally uses session posts + signup lists (no full calendar UI).
- If you later need enemies/factions/etc, follow the same pattern: table + RLS + client queries.
