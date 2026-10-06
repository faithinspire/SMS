@echo off
cd /d c:\Users\OLU\Desktop\SMS
git add -A
git commit -m "fix: mark dynamic API routes to prevent Next.js static rendering errors - Add 'export const dynamic = force-dynamic' to routes using cookies() or searchParams"
git push origin main
echo Deploy triggered. Check Vercel dashboard at https://vercel.com/dashboard/projects/sms
pause
