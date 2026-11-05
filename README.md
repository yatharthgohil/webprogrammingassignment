# The Watch Journal

A watch journal with a session-based login and a placeholder watch customization portal.

## Run locally

Requires Node.js 18 or newer.

```sh
npm install
npm start
```

Open http://localhost:3000 and choose **Watch Studio** in the navigation.
Use the classroom demo account:

- Username: `watchfan`
- Password: `customize-time`

## Session flow

- `GET /login` displays the login form; `POST /login` checks the demo credentials.
- Successful login creates a fresh session and stores `username` on the server.
- `/portal` (also available at `/profile`) requires a session, displays the username, and shows the watch customization WIP placeholder.
- The **Log out** link opens `/logout`, destroys the session, clears the cookie, and redirects to `/login`.
- Account responses are not cached, and expired or logged-out sessions cannot access the portal.

The browser receives only an HTTP-only session ID cookie. Sessions expire after one hour and are kept in memory for this classroom demo, so restarting the server logs everyone out. This requires the Node server; static hosting such as GitHub Pages cannot run these endpoints.

You can override the demo credentials with `LOGIN_USERNAME` and `LOGIN_PASSWORD`, and set a stable `SESSION_SECRET`. All three are required when `NODE_ENV=production`. A deployed app also needs HTTPS and a persistent session store instead of the default memory store.

## Verify

```sh
npm test
```

Checks cover login, username display, session replacement, protected routes, logout, and private-file access.

## Code

- [Session and route code](https://github.com/yatharthgohil/webprogrammingassignment/blob/main/server.js)
- [Session tests](https://github.com/yatharthgohil/webprogrammingassignment/blob/main/test/session.test.js)

See `DATABASE-README.md` for the separate PostgreSQL classroom exercise.
