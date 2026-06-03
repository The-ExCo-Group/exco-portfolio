# ExCo Account Team Portfolio — Setup Guide (No Developer Needed)

Everything below is done in your web browser. No command line, no coding.

---

## PART 1: Get Your Salesforce Credentials (15 min)

You need a "Connected App" in Salesforce so the sync can log in automatically.

### Step 1: Create the Connected App
1. Log into Salesforce
2. Click the **gear icon** (top right) → **Setup**
3. In the left sidebar search box, type **App Manager** and click it
4. Click **New Connected App** (top right button)
5. Fill in:
   - Connected App Name: `ExCo Portfolio Sync`
   - API Name: `ExCo_Portfolio_Sync` (auto-fills)
   - Contact Email: your email
6. Under **API (Enable OAuth Settings)**, check **Enable OAuth Settings**
   - Callback URL: `https://localhost` (this is just a placeholder, we won't use it)
   - Under **Selected OAuth Scopes**, move these to the right:
     - `Full access (full)`
   - Uncheck "Require Proof Key for Code Exchange"
7. Click **Save**, then **Continue**
8. Wait 2-10 minutes for Salesforce to activate it

### Step 2: Get Your Consumer Key and Secret
1. Go back to **Setup → App Manager**
2. Find **ExCo Portfolio Sync** in the list
3. Click the dropdown arrow on the right → **View**
4. Under **API (Enable OAuth Settings)**, click **Manage Consumer Details**
5. Salesforce will send you a verification code — enter it
6. **Copy and save these two values somewhere safe:**
   - **Consumer Key** (long string of letters/numbers)
   - **Consumer Secret** (shorter string)

### Step 3: Get Your Security Token
1. In Salesforce, click your **profile icon** (top right) → **Settings**
2. In the left sidebar, click **Reset My Security Token**
3. Click **Reset Security Token**
4. Check your email — Salesforce sends you a token
5. **Save this token** — you'll need it combined with your password

---

## PART 2: Set Up GitHub (20 min, one time)

### Step 1: Create a GitHub Account
1. Go to **https://github.com** and click **Sign up**
2. Use your ExCo email, create a password, pick a username
3. Verify your email

### Step 2: Create a Repository
1. Once logged in, click the **+** icon (top right) → **New repository**
2. Repository name: `exco-portfolio`
3. Make sure **Public** is selected (needed for free GitHub Pages hosting)
4. Check **Add a README file**
5. Click **Create repository**

### Step 3: Upload Your Files
1. You're now on your repository page
2. Click **Add file** → **Upload files**
3. Drag ALL of these files from your Downloads into the upload area:
   - `exco-portfolio.html` (rename this to `index.html` first!)
   - `data.js`
   - `salesforce-sync.js`
   - `package.json`
4. At the bottom, click **Commit changes**

### Step 4: Upload the Workflow File
GitHub Actions needs the workflow file in a specific folder structure:
1. On your repository page, click **Add file** → **Create new file**
2. In the filename box, type: `.github/workflows/sync.yml`
   (typing the `/` will auto-create the folders)
3. Paste in the ENTIRE contents of the `sync.yml` file I gave you
4. Click **Commit changes**

### Step 5: Add Your Salesforce Credentials as Secrets
1. On your repository page, click **Settings** (tab at the top)
2. In the left sidebar, click **Secrets and variables** → **Actions**
3. Click **New repository secret** and add each of these (one at a time):

   | Name | Value |
   |------|-------|
   | `SF_LOGIN_URL` | `https://login.salesforce.com` |
   | `SF_CLIENT_ID` | Your Consumer Key from Part 1 |
   | `SF_CLIENT_SECRET` | Your Consumer Secret from Part 1 |
   | `SF_USERNAME` | Your Salesforce login email |
   | `SF_PASSWORD` | Your Salesforce password + security token (mashed together, no space) |

   **Important:** For SF_PASSWORD, combine your password and token.
   Example: if password is `MyPass123` and token is `ABCXYZ`, enter `MyPass123ABCXYZ`

### Step 6: Turn On GitHub Pages
1. Still in **Settings**, click **Pages** in the left sidebar
2. Under **Source**, select **Deploy from a branch**
3. Under **Branch**, select **main** and **/ (root)**
4. Click **Save**
5. Wait 1-2 minutes, then refresh — you'll see a green banner with your live URL:
   `https://YOUR-USERNAME.github.io/exco-portfolio/`

**That URL is your live, shareable webpage.**

---

## PART 3: Verify the Auto-Sync Works

### Test It Manually
1. Go to your repository page on GitHub
2. Click the **Actions** tab
3. On the left, click **Daily Salesforce Sync**
4. Click **Run workflow** → **Run workflow**
5. Wait 1-2 minutes — you'll see it run (green check = success)
6. Check your live page — the data should now show the sync timestamp

### What Happens Automatically
- Every day at 6 AM UTC (1 AM Eastern), GitHub runs the sync
- It logs into your Salesforce, pulls all active accounts
- It updates `data.js` with fresh data
- Your live page automatically reflects the changes
- You never have to touch it again

---

## TROUBLESHOOTING

**Sync fails (red X in Actions):**
- Click the failed run → click the job → read the error
- Most common: wrong password/token combo in SF_PASSWORD secret
- Fix: go to Settings → Secrets → update the value

**Page shows old data:**
- GitHub Pages can cache for up to 10 min — just wait
- Or hard-refresh your browser: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)

**Need to update team members/roles/photos:**
- Edit `data.js` directly on GitHub: click the file → pencil icon → edit → commit
- Or tell Claude to regenerate it from Salesforce

---

## FILE REFERENCE

| File | What it does |
|------|-------------|
| `index.html` | The webpage (the thing people see) |
| `data.js` | Account data from Salesforce (auto-updated daily) |
| `salesforce-sync.js` | Script that queries Salesforce and writes data.js |
| `package.json` | Tells GitHub what software the sync needs |
| `.github/workflows/sync.yml` | Tells GitHub to run the sync every day at 6 AM UTC |
