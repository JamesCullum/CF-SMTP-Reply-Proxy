# CF SMTP Reply Proxy

A Cloudflare Email Worker that lets you reply to emails from a privacy alias (e.g. SimpleLogin, addy.io, Tutanota alias) while sending through your own SMTP server — so replies appear to come from your real address, not the alias infrastructure.

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/JamesCullum/cf-smtp-reply-proxy)

## How it works

1. You receive an email via your privacy alias, which forwards it to a Cloudflare Email Routing address.
2. Cloudflare triggers this Worker with the forwarded message.
3. The Worker extracts the original sender from the quoted reply body.
4. It rewrites your alias address in the body to your real address, then relays the email to the original sender via SMTP.

## Setup

### 1. Clone and install

```bash
git clone https://github.com/your-username/cf-smtp-reply-proxy
cd cf-smtp-reply-proxy
npm install
```

### 2. Configure `wrangler.toml`

Edit the `[vars]` section with your values:

| Variable | Description |
|---|---|
| `SMTP_HOST` | Your outbound SMTP server hostname |
| `SMTP_PORT` | SMTP port (typically `587` for STARTTLS) |
| `SMTP_USER` | SMTP username / login address |
| `SMTP_AUTH` | Auth method: `plain`, `login`, or `cram-md5` |
| `FROM_NAME` | Display name used in the `From` header |
| `FROM_EMAIL` | Sender address used in the `From` header |
| `REWRITE_FROM` | Your privacy alias — occurrences in the body are replaced |
| `REWRITE_TO` | Your real address — replaces `REWRITE_FROM` in the body |
| `CC_ADDRESSES` | Optional comma-separated CC list (leave empty to disable) |

### 3. Add your SMTP password as a secret

The SMTP password must be stored as a Worker secret, not in `wrangler.toml`:

```bash
npx wrangler secret put SMTP_PASS
```

### 4. Configure Cloudflare Email Routing

In the Cloudflare dashboard, set up an Email Routing rule that sends incoming mail for your address to this Worker.

### 5. Deploy

```bash
npm run deploy
```

## Usage

To reply through the proxy, forward the original email to your Cloudflare-routed address — include the full quoted conversation so the Worker can extract the original sender from the quoted body.

The Worker supports common quoting formats:

- `From: sender@example.com` headers in the quoted block
- `On [date], Sender <sender@example.com> wrote:`
- German equivalents (`Von:`, `schrieb`)

## Dependencies

- [worker-mailer](https://github.com/Sh031224/worker-mailer) — SMTP client for Cloudflare Workers
- [postal-mime](https://github.com/postalsys/postal-mime) — email parser

## License

MIT
