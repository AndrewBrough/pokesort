# PokeSort

Deploy notes for an Ubuntu droplet on DigitalOcean. The app runs from the `main` branch. One Node process serves the built client and the game websocket on port `8787`.

The game state lives in memory. Restarting the service starts a new run.

## What to install

- Ubuntu 24.04 LTS, or another current Ubuntu LTS
- Git
- Node.js 22.6 or newer, and npm. The server runs TypeScript with Node's `--experimental-strip-types` flag, which Ubuntu's default `nodejs` package is too old to provide. Install Node.js 24, the current LTS.
- nginx, so the site and the websocket are both available on ports 80 and 443

```bash
sudo apt update
sudo apt install -y ca-certificates curl git nginx
curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
sudo apt install -y nodejs
node -v
npm -v
```

`node -v` should print `v22.6` or higher.

## Pull and build

Run the app as root, from `~/pokesort` (`/root/pokesort`), on the `main` branch.

```bash
git clone <repository-url> ~/pokesort
git -C ~/pokesort checkout main
git -C ~/pokesort pull origin main
```

Install dependencies in `client` and `server`, then build the client. The client build needs the dev dependencies, so do not use `npm ci --omit=dev`.

```bash
cd ~/pokesort
npm ci --prefix client
npm ci --prefix server
npm run build
```

`npm run build` writes the site to `client/dist`. The server reads that folder when it starts.

Check the build before enabling the service:

```bash
cd ~/pokesort
npm start
```

`PokeSort listening on 8787` means it is up. Stop it with Ctrl-C, then install the service below.

## Service

Save this as `/etc/systemd/system/pokesort.service`:

```ini
[Unit]
Description=PokeSort
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/root/pokesort
Environment=NODE_ENV=production
Environment=PORT=8787
ExecStart=/usr/bin/npm start
Restart=on-failure
RestartSec=3

[Install]
WantedBy=multi-user.target
```

`NODE_ENV=production` turns off the dev-only money grant. `npm start` also sets that variable. The unit uses `/root/pokesort` because systemd does not expand `~`. That path is root's `~/pokesort`.

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now pokesort
```

Start, stop, and status:

```bash
sudo systemctl start pokesort
sudo systemctl stop pokesort
sudo systemctl restart pokesort
sudo systemctl status pokesort
```

`status` should show `active (running)`. Follow the log with:

```bash
sudo journalctl -u pokesort -f
```

Recent logs without following:

```bash
sudo journalctl -u pokesort -n 100 --no-pager
```

A healthy process answers on this machine:

```bash
curl -fsS http://127.0.0.1:8787/health
```

That prints `ok`.

## nginx

The client opens its websocket at `ws://<the page host>/ws` (or `wss://` when the page is HTTPS). nginx has to forward both the site and that upgrade.

Save this as `/etc/nginx/sites-available/pokesort`, and replace `example.com` with the droplet's domain or IP:

```nginx
server {
    listen 80;
    server_name example.com;

    location / {
        proxy_pass http://127.0.0.1:8787;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 3600s;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/pokesort /etc/nginx/sites-enabled/pokesort
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

Open SSH, HTTP, and HTTPS. Leave port `8787` closed so the Node process is only reached through nginx.

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
sudo ufw status
```

Open `http://example.com`. The toolbar should leave "Connecting..." once the websocket is up.

For HTTPS on a domain, install a certificate and reload nginx. The client switches to `wss` on its own when the page is served over HTTPS.

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d example.com
```

## Update from main

```bash
sudo systemctl stop pokesort
git -C ~/pokesort fetch origin
git -C ~/pokesort checkout main
git -C ~/pokesort pull --ff-only origin main
cd ~/pokesort
npm ci --prefix client
npm ci --prefix server
npm run build
sudo systemctl start pokesort
sudo systemctl status pokesort
curl -fsS http://127.0.0.1:8787/health
```

Stopping first drops every connected player. Pull only fast-forwards `main`, so a local commit on the droplet will not be overwritten quietly.
