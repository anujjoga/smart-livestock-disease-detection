# Smart Livestock Disease Detection and Alert System
Monitor • Detect • Protect

## Run locally or in GitHub Codespaces
1. Open the folder (or upload it to a GitHub repo and press Code > Codespaces > Create).
2. In the terminal run:  python3 -m http.server 8000
3. Open the forwarded port 8000 (Codespaces shows an "Open in Browser" prompt).

## Optional: Supabase
1. Run `supabase.sql` in the Supabase SQL Editor.
2. Put your Project URL and anon key in `config.js`.
3. Turn off "Confirm email" in Authentication > Providers > Email for demos.

## Optional: real ML model
Set `ML_API_URL` in `config.js` to a Flask endpoint returning
{disease, confidence, severity, symptoms, prevention}.

Disease detection is SIMULATED and is not a medical diagnosis.
