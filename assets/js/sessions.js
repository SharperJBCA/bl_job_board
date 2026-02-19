(function () {
  const config = window.SUPABASE_CONFIG || {};
  const statusEl = document.getElementById('session-auth-status');

  if (!config.url || !config.anonKey) {
    setStatus('Missing Supabase config. Add site.supabase.url and site.supabase.anon_key in _config.yml.', true);
    return;
  }

  const { createClient } = window.supabase;
  const supabase = createClient(config.url, config.anonKey);

  const authSection = document.getElementById('auth-section');
  const appSection = document.getElementById('scheduler-app');
  const emailInput = document.getElementById('auth-email');
  const passwordInput = document.getElementById('auth-password');
  const displayNameInput = document.getElementById('profile-display-name');
  const gmFlag = document.getElementById('profile-gm-flag');
  const sessionsList = document.getElementById('sessions-list');
  const sessionFormWrap = document.getElementById('session-create-wrap');
  const joinNameInput = document.getElementById('join-character-name');

  let currentUser = null;
  let profile = null;

  document.getElementById('auth-signup').addEventListener('click', signUp);
  document.getElementById('auth-signin').addEventListener('click', signIn);
  document.getElementById('auth-signout').addEventListener('click', signOut);
  document.getElementById('profile-save').addEventListener('click', saveProfile);
  document.getElementById('session-create').addEventListener('click', createSession);

  init();

  async function init() {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      setStatus(error.message, true);
      return;
    }

    currentUser = data.session ? data.session.user : null;
    await refreshApp();

    supabase.auth.onAuthStateChange(async (_event, session) => {
      currentUser = session ? session.user : null;
      await refreshApp();
    });
  }

  async function refreshApp() {
    if (!currentUser) {
      authSection.hidden = false;
      appSection.hidden = true;
      setStatus('Signed out. Create an account or sign in.', false);
      return;
    }

    authSection.hidden = false;
    appSection.hidden = false;
    await loadProfile();
    await loadSessions();
    setStatus(`Signed in as ${currentUser.email}`, false);
  }

  async function loadProfile() {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, display_name, is_gm')
      .eq('id', currentUser.id)
      .single();

    if (error) {
      setStatus(error.message, true);
      return;
    }

    profile = data;
    displayNameInput.value = profile.display_name || '';
    gmFlag.textContent = profile.is_gm ? 'GM enabled' : 'Player mode';
    sessionFormWrap.hidden = !profile.is_gm;
  }

  async function loadSessions() {
    sessionsList.innerHTML = '<li>Loading sessions…</li>';

    const { data, error } = await supabase
      .from('sessions')
      .select('id, title, scheduled_at, max_players, status, notes, created_by, session_signups(user_id, character_name, signup_status, profiles(display_name))')
      .order('scheduled_at', { ascending: true });

    if (error) {
      sessionsList.innerHTML = '<li>Unable to load sessions.</li>';
      setStatus(error.message, true);
      return;
    }

    if (!data.length) {
      sessionsList.innerHTML = '<li>No sessions posted yet.</li>';
      return;
    }

    sessionsList.innerHTML = '';

    data.forEach((session) => {
      const item = document.createElement('li');
      item.className = 'session-card';

      const confirmed = (session.session_signups || []).filter((s) => s.signup_status === 'confirmed');
      const isJoined = confirmed.some((s) => s.user_id === currentUser.id);

      const roster = confirmed.length
        ? confirmed
            .map((s) => `${s.profiles.display_name}${s.character_name ? ` (${s.character_name})` : ''}`)
            .join(', ')
        : 'No one signed up yet.';

      item.innerHTML = `
        <h3>${escapeHtml(session.title)}</h3>
        <p><strong>When:</strong> ${new Date(session.scheduled_at).toLocaleString()}</p>
        <p><strong>Status:</strong> ${escapeHtml(session.status)} | <strong>Capacity:</strong> ${confirmed.length}/${session.max_players}</p>
        <p><strong>Notes:</strong> ${escapeHtml(session.notes || '—')}</p>
        <p><strong>Roster:</strong> ${escapeHtml(roster)}</p>
        <div class="session-actions"></div>
      `;

      const actions = item.querySelector('.session-actions');
      if (session.status !== 'open') {
        actions.innerHTML = '<em>Session closed.</em>';
      } else if (isJoined) {
        const leaveBtn = button('Leave session', () => leaveSession(session.id));
        actions.appendChild(leaveBtn);
      } else {
        const joinBtn = button('Join session', () => joinSession(session.id));
        actions.appendChild(joinBtn);
      }

      sessionsList.appendChild(item);
    });
  }

  async function signUp() {
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    if (!email || !password) {
      setStatus('Email and password are required.', true);
      return;
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: email.split('@')[0] },
      },
    });

    if (error) {
      setStatus(error.message, true);
      return;
    }

    setStatus('Signup successful. Check your email if confirmation is enabled.', false);
  }

  async function signIn() {
    const email = emailInput.value.trim();
    const password = passwordInput.value;

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setStatus(error.message, true);
      return;
    }

    setStatus('Signed in.', false);
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) {
      setStatus(error.message, true);
      return;
    }

    setStatus('Signed out.', false);
  }

  async function saveProfile() {
    if (!currentUser) return;

    const display_name = displayNameInput.value.trim();
    if (display_name.length < 2) {
      setStatus('Display name must be at least 2 characters.', true);
      return;
    }

    const { error } = await supabase
      .from('profiles')
      .update({ display_name })
      .eq('id', currentUser.id);

    if (error) {
      setStatus(error.message, true);
      return;
    }

    setStatus('Profile updated.', false);
    await loadSessions();
  }

  async function createSession() {
    if (!profile || !profile.is_gm) {
      setStatus('Only GM accounts can create sessions.', true);
      return;
    }

    const title = document.getElementById('session-title').value.trim();
    const scheduled_at = document.getElementById('session-datetime').value;
    const max_players = Number(document.getElementById('session-max').value);
    const notes = document.getElementById('session-notes').value.trim();

    if (!title || !scheduled_at) {
      setStatus('Session title and date are required.', true);
      return;
    }

    const { error } = await supabase
      .from('sessions')
      .insert([{ title, scheduled_at, max_players, notes, created_by: currentUser.id }]);

    if (error) {
      setStatus(error.message, true);
      return;
    }

    document.getElementById('session-title').value = '';
    document.getElementById('session-datetime').value = '';
    document.getElementById('session-max').value = 5;
    document.getElementById('session-notes').value = '';

    setStatus('Session created.', false);
    await loadSessions();
  }

  async function joinSession(sessionId) {
    const { error } = await supabase.rpc('join_session', {
      p_session_id: sessionId,
      p_character_name: joinNameInput.value.trim() || null,
    });

    if (error) {
      setStatus(error.message, true);
      return;
    }

    setStatus('Signed up for session.', false);
    await loadSessions();
  }

  async function leaveSession(sessionId) {
    const { error } = await supabase
      .from('session_signups')
      .delete()
      .eq('session_id', sessionId)
      .eq('user_id', currentUser.id);

    if (error) {
      setStatus(error.message, true);
      return;
    }

    setStatus('Left session.', false);
    await loadSessions();
  }

  function setStatus(message, isError) {
    statusEl.textContent = message;
    statusEl.className = isError ? 'status status--error' : 'status';
  }

  function button(label, onClick) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = label;
    btn.addEventListener('click', onClick);
    return btn;
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }
})();
