# DS-160 Quick Reference Guide

## ⚡ Quick Start Commands

### Development

```bash
cd d:\DS-160
npm install              # Install dependencies once
npm start                # Start dev server (localhost:3000)
npm run check-env        # Verify environment variables
```

### Testing

```bash
npm run test:api-health  # Quick health check
npm run test:ci          # Full test suite (what CI runs)
npm run lint:fix         # Auto-fix linting issues
npm run format           # Auto-format code
```

### Deployment

```bash
npm run check:main       # Pre-deployment verification
git push                 # Triggers Vercel auto-deploy
```

---

## 📁 File Locations Quick Map

| What               | Where                        |
| ------------------ | ---------------------------- |
| Main form          | `public/index.html`          |
| Main script        | `public/js/script.js`        |
| Main styles        | `public/style.css`           |
| Submit handler     | `api/submit.js`              |
| Tests              | `tests/unit/` & `tests/e2e/` |
| Environment config | `.env.local` (not in git)    |
| Deployment config  | `vercel.json`                |

---

## 🐛 Troubleshooting Quick Links

### Form submission not working?

1. Check `public/js/script.js` line 650+ (form event listener)
2. Verify API endpoint at `api/submit.js`
3. Check environment variables: `npm run check-env`

### Radio toggles not showing containers?

1. Check `toggleMap` at line 3165 in `public/js/script.js`
2. Verify container ID exists in HTML
3. Check console for `[Handler]` logs
4. Verify `.is-visible` CSS class in `public/style.css:207`

### Email not sending?

1. Check `SENDINBLUE_API_KEY` is set
2. Check `SENDER_EMAIL` is verified in Brevo account
3. Test with: `npm run test:stub-email`
4. Check Brevo dashboard for API errors

### Styling issues?

1. Check `public/style.css` for conflicts
2. Test in different browsers (Chrome, Firefox)
3. Check RTL support with Arabic text
4. Verify responsive design with DevTools

---

## 🔍 Code Locations for Common Edits

### Adding a new radio toggle field

**File:** `public/js/script.js` (lines 3165-3190)

```javascript
const toggleMap = {
  NewFieldName: {
    // ← Add here
    containers: ['container_id'], // ← Reference HTML id
  },
};
```

### Changing form validation rules

**File:** `public/js/script.js` (lines 602-630)

- Edit the validation loop to add field-specific rules

### Updating email recipient

**File:** `api/submit.js` (line 330)

```javascript
sendSmtpEmail.to = [{ email: 'new-email@example.com' }];
```

### Adding new form fields

1. Edit `public/index.html` - Add HTML
2. Edit `public/style.css` - Add styles (if needed)
3. Edit `api/submit.js` - Add to field mappings (line 30+)
4. Test: `npm run smoke-docx`

---

## 📊 File Size Reference

| File                | Size       | Lines     |
| ------------------- | ---------- | --------- |
| public/index.html   | 106 KB     | 3,106     |
| public/js/script.js | 97 KB      | 3,267     |
| public/style.css    | 12 KB      | 536       |
| api/submit.js       | 8 KB       | 372       |
| **Total**           | **223 KB** | **7,281** |

---

## ✅ Pre-Deployment Checklist

Before pushing to main:

- [ ] `npm run check:main` passes (lint + tests)
- [ ] No new console errors in devtools
- [ ] Form submits successfully locally
- [ ] All radio toggles work (click "Yes" on each)
- [ ] DOCX attachment is generated
- [ ] Email is received (test with stub first)
- [ ] Mobile view works on iPhone/Android
- [ ] Arabic text displays correctly (RTL)

---

## 🔑 Environment Variables Reference

### Required

```env
SENDINBLUE_API_KEY=your_api_key_here
SENDER_EMAIL="Sender Name <sender@example.com>"
```

### Optional

```env
RECIPIENT_EMAIL="recipient@example.com"    # Defaults to nayer.nfs@gmail.com
TEST_EMAIL_TOKEN="your_test_token"         # For /api/test-email endpoint
SKIP_SEND=true                              # Test mode (don't send real emails)
```

### Getting API Key

1. Go to https://www.brevo.com
2. Account → SMTP & API → API Keys
3. Create new API key
4. Add to Vercel project settings or .env.local

---

## 📝 Common Git Commands

```bash
# View recent changes
git log --oneline -10

# See what files changed
git status

# See changes in a file
git diff public/js/script.js

# Revert last commit
git reset --soft HEAD~1

# View specific commit
git show 35fc8a7

# Create new branch for features
git checkout -b feature/new-feature-name
```

---

## 🚀 Deployment Status

**Current Live:** https://ds-160-fresh.vercel.app  
**Last Deployed:** January 16, 2026  
**Status:** ✅ Active  
**Auto-deploy:** Enabled (push to main = automatic deploy)

### Check Deployment Status

```bash
# View Vercel deployments
vercel deployments

# View logs
vercel logs ds-160-fresh --follow
```

---

## 💬 Testing Commands Explained

| Command                    | What It Does                        | Time |
| -------------------------- | ----------------------------------- | ---- |
| `npm run test:api-health`  | Checks API endpoints work           | <1s  |
| `npm run test:docx-arabic` | Verifies Arabic in DOCX files       | ~5s  |
| `npm run smoke-docx`       | Generates test DOCX                 | ~3s  |
| `npm run test:stub-email`  | Tests email without sending         | ~2s  |
| `npm run lint:ci`          | Strict linting (0 warnings allowed) | ~5s  |
| `npm run test:ci`          | Full CI suite (all of above)        | ~30s |

---

## 🎯 Today's Fixes Summary (Jan 16)

**Problem:** Visa detail containers not showing  
**Root Cause:** Conflicting event listeners + missing CSS classes  
**Fixed by:**

1. Removing old `toggleVisaDetails()` onclick handlers
2. Removing conflicting individual event listener
3. Adding `.is-visible` class toggle to nested elements

**Result:** ✅ All 13 radio toggles now work properly  
**Commits:** 4 commits, all deployed to main

---

## 🔗 Important Links

- **Live Form:** https://ds-160-fresh.vercel.app
- **GitHub Repo:** https://github.com/nayernfs-ui/DS-160
- **Brevo API:** https://www.brevo.com/api/v3
- **Vercel Project:** https://vercel.com/dashboard
- **Docx Library:** https://docx.js.org

---

## 📞 Get Help

### Check Logs

```bash
# Local development
npm start
# Check browser console (F12)

# Production
# Check Vercel dashboard → Deployments → Function Logs
```

### Debug Mode

Add to top of `script.js`:

```javascript
window.DEBUG = true;
```

Then check console for `[Handler]`, `[Container]` logs

### Email Test

```bash
curl "https://ds-160-fresh.vercel.app/api/test-email?token=YOUR_TOKEN"
```

---

## 📅 Review Schedule

- **Next Minor Review:** February 13, 2026
- **Major Review:** Quarterly (April)
- **Dependency Updates:** Monthly

---

**Last Updated:** January 16, 2026  
**Project Status:** ✅ Production Ready
