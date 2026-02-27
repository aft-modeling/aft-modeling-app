# AFT Modeling — Content Workflow App

A full-stack internal web application for managing the AFT Modeling video content production pipeline.

## Roles
- **Creative Director** — Assigns clips, monitors full pipeline Kanban board, reviews finished clips
- **Editor** — Sees assigned clips, uploads finished videos (auto-sent to Google Drive), resubmits revisions
- **QA Reviewer** — Reviews submitted clips with a 4-point checklist, approves or sends back with notes

## Workflow
```
CD assigns clip → Editor submits video → QA reviews
    → Approved → Finished Clips (file moved to /Approved in Drive)
    → Needs Revision → Back to Editor with notes → Resubmit → QA again
```

---

## Setup Guide

### 1. Supabase (Database + Auth)
1. Go to [supabase.com](https://supabase.com) and create a free account
2. Create a new project (save the database password)
3. Go to **SQL Editor** and paste the contents of `supabase/schema.sql` — click Run
4. Go to **Settings → API** and copy:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - anon/public key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - service_role key → `SUPABASE_SERVICE_ROLE_KEY`
5. Go to **Authentication → Users** and create accounts for each team member:
   - Set their email, password, and in "User Metadata" add: `{"full_name": "Their Name", "role": "editor"}`
   - Roles: `creative_director` / `editor` / `qa`

### 2. Google Drive API (File Storage)
1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create a new project called "AFT Modeling"
3. Enable the **Google Drive API**
4. Go to **Credentials → Create Credentials → Service Account**
5. Name it "aft-drive-uploader", click Create
6. Click on the service account → Keys tab → Add Key → JSON
7. Download the JSON file. From it, copy:
   - `client_email` → `GOOGLE_CLIENT_EMAIL`
   - `private_key` → `GOOGLE_PRIVATE_KEY`
8. In Google Drive, create a folder called "AFT Modeling Content"
9. Share that folder with the service account email (give it Editor access)
10. Copy the folder ID from the URL → `GOOGLE_DRIVE_FOLDER_ID`

### 3. Vercel (Deployment)
1. Go to [vercel.com](https://vercel.com) and sign up with GitHub
2. Click "Add New Project" → import `aft-modeling/aft-modeling-app`
3. In Environment Variables, add all variables from `.env.example` with real values
4. Click Deploy — your app will be live in ~2 minutes!

---

## Placeholder Credentials (replace before launch)
| Name | Email | Password | Role |
|------|-------|----------|------|
| Creative Director | cd@aftmodeling.com | ChangeMe123! | creative_director |
| Manuel | manuel@aftmodeling.com | ChangeMe123! | editor |
| Rylan | rylan@aftmodeling.com | ChangeMe123! | editor |
| Vince | vince@aftmodeling.com | ChangeMe123! | editor |
| Emelen | emelen@aftmodeling.com | ChangeMe123! | editor |
| QA Reviewer | qa@aftmodeling.com | ChangeMe123! | qa |
