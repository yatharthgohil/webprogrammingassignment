const express = require('express');
const session = require('express-session');
const { randomBytes, timingSafeEqual, createHash } = require('node:crypto');
const path = require('node:path');

const app = express();
const production = process.env.NODE_ENV === 'production';
if (production && (!process.env.SESSION_SECRET || !process.env.LOGIN_USERNAME || !process.env.LOGIN_PASSWORD)) {
  throw new Error('Set SESSION_SECRET, LOGIN_USERNAME, and LOGIN_PASSWORD in production.');
}
const username = process.env.LOGIN_USERNAME || 'watchfan';
const password = process.env.LOGIN_PASSWORD || 'customize-time';
const cookieOptions = { httpOnly: true, sameSite: 'lax', secure: production, path: '/' };

app.disable('x-powered-by');
app.use(express.urlencoded({ extended: false, limit: '4kb' }));
app.use(session({
  name: 'watch.sid',
  secret: process.env.SESSION_SECRET || randomBytes(32).toString('hex'),
  resave: false,
  saveUninitialized: false,
  cookie: { ...cookieOptions, maxAge: 60 * 60 * 1000 },
}));

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[character]));
}

function page(title, content, loggedIn = false) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} | The Watch Journal</title>
  <script src="/watch-theme.js"></script>
  <link rel="stylesheet" href="/watch-styles.css">
</head>
<body class="journal-page account-page">
  <header class="site-header">
    <a class="brand" href="/everyday-watches.html"><span class="brand-mark">TWJ</span><span>The Watch Journal</span></a>
    <div class="header-actions">
      ${loggedIn ? '<a class="account-link" href="/logout">Log out</a>' : '<a class="account-link" href="/everyday-watches.html">Back to the journal</a>'}
      <button class="theme-toggle" type="button" aria-pressed="false" hidden>Dark mode</button>
    </div>
  </header>
  <main class="account-main">${content}</main>
  <footer class="about-footer"><span>© 2026 The Watch Journal</span><span>Your time. Your design.</span></footer>
</body>
</html>`;
}

function loginPage(error = '') {
  return page('Log in', `
    <section class="account-card" aria-labelledby="login-heading">
      <p class="eyebrow">Your watch studio</p>
      <h1 id="login-heading">Make it yours.</h1>
      <p>Log in to your watch customization portal.</p>
      ${error ? `<p class="form-error" role="alert">${error}</p>` : ''}
      <form action="/login" method="post" class="login-form">
        <label for="username">Username</label>
        <input id="username" name="username" autocomplete="username" maxlength="100" required>
        <label for="password">Password</label>
        <input id="password" name="password" type="password" autocomplete="current-password" maxlength="200" required>
        <button class="account-button" type="submit">Log in</button>
      </form>
    </section>`);
}

// Account pages must be fetched again after logout, including browser back navigation.
app.use(['/login', '/portal', '/profile', '/logout'], (req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

app.get('/', (req, res) => res.redirect('/everyday-watches.html'));
app.get('/login', (req, res) => {
  if (req.session.username) return res.redirect('/portal');
  res.send(loginPage());
});

function matches(value, expected) {
  const hash = (text) => createHash('sha256').update(text).digest();
  return typeof value === 'string' && timingSafeEqual(hash(value), hash(expected));
}

app.post('/login', (req, res, next) => {
  if (!matches(req.body.username, username) || !matches(req.body.password, password)) {
    return res.status(401).send(loginPage('The username or password is incorrect.'));
  }
  // Replace the old session ID, then store only the username on the server.
  req.session.regenerate((error) => {
    if (error) return next(error);
    req.session.username = req.body.username;
    req.session.save((error) => {
      if (error) return next(error);
      res.redirect(303, '/portal');
    });
  });
});

app.get(['/portal', '/profile'], (req, res) => {
  if (!req.session.username) return res.redirect('/login');
  res.send(page('Watch portal', `
    <section class="account-card portal-card" aria-labelledby="portal-heading">
      <p class="eyebrow">Your watch studio / WIP</p>
      <h1 id="portal-heading">Welcome, ${escapeHtml(req.session.username)}.</h1>
      <p class="intro">A watch that feels like you.</p>
      <div class="portal-placeholder">
        <span class="status-label">Work in progress</span>
        <h2>Your watch customization app will live here.</h2>
        <p>Soon, you’ll be able to create and customize your own watches. For now, your studio is taking shape.</p>
      </div>
      <a class="account-button" href="/logout">Log out</a>
    </section>`, true));
});

app.get('/logout', (req, res, next) => {
  // Destroy the server session and remove its cookie from the browser.
  req.session.destroy((error) => {
    if (error) return next(error);
    res.clearCookie('watch.sid', cookieOptions);
    res.redirect(303, '/login');
  });
});

// Serve only public assets; server code and database files stay private.
for (const file of ['everyday-watches.html', 'watch-design.html', 'watch-collection.html', 'about.html', 'watch-styles.css', 'watch-theme.js']) {
  app.get(`/${file}`, (req, res) => res.sendFile(path.join(__dirname, file)));
}
app.use('/images', express.static(path.join(__dirname, 'images'), { dotfiles: 'deny' }));
app.use((error, req, res, next) => {
  console.error(error.message);
  res.status(500).send('Something went wrong. Please try again.');
});

if (require.main === module) {
  const port = process.env.PORT || 3000;
  app.listen(port, () => console.log(`The Watch Journal is running at http://localhost:${port}`));
}

module.exports = app;
