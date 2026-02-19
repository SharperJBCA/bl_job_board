---
layout: default
title: Sessions
nav: sessions
permalink: /sessions/
---

# Session Scheduler

Use this page for player self-registration and session signups.

<div id="auth-section" class="scheduler-block">
  <h2>Account</h2>
  <p class="muted">Create an account with email + password, then sign in.</p>
  <label>Email <input id="auth-email" type="email" autocomplete="email" /></label>
  <label>Password <input id="auth-password" type="password" autocomplete="current-password" /></label>
  <div class="row">
    <button id="auth-signup" type="button">Sign up</button>
    <button id="auth-signin" type="button">Sign in</button>
    <button id="auth-signout" type="button">Sign out</button>
  </div>
  <p id="session-auth-status" class="status">Checking session…</p>
</div>

<div id="scheduler-app" hidden>
  <div class="scheduler-block">
    <h2>Player profile</h2>
    <label>Display name <input id="profile-display-name" type="text" maxlength="40" /></label>
    <div class="row">
      <button id="profile-save" type="button">Save profile</button>
      <span id="profile-gm-flag" class="badge">Player mode</span>
    </div>
  </div>

  <div id="session-create-wrap" class="scheduler-block" hidden>
    <h2>Create session (GM)</h2>
    <label>Title <input id="session-title" type="text" maxlength="100" /></label>
    <label>Scheduled at <input id="session-datetime" type="datetime-local" /></label>
    <label>Max players <input id="session-max" type="number" min="1" max="12" value="5" /></label>
    <label>Notes <textarea id="session-notes" rows="4"></textarea></label>
    <button id="session-create" type="button">Post session</button>
  </div>

  <div class="scheduler-block">
    <h2>Join open sessions</h2>
    <label>Character name (optional) <input id="join-character-name" type="text" maxlength="80" /></label>
    <ul id="sessions-list" class="sessions-list">
      <li>Loading sessions…</li>
    </ul>
  </div>
</div>

<script>
  window.SUPABASE_CONFIG = {
    url: {{ site.supabase.url | jsonify }},
    anonKey: {{ site.supabase.anon_key | jsonify }}
  };
</script>
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script src="{{ '/assets/js/sessions.js' | relative_url }}"></script>
