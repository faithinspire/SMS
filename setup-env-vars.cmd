@echo off
setlocal enabledelayedexpansion

cd c:\Users\OLU\Desktop\SMS

echo Setting up Vercel environment variables...
echo.

REM Extract values from .env.local
for /f "tokens=2 delims==" %%a in ('findstr "NEXT_PUBLIC_SUPABASE_URL" .env.local') do (
  set SUPABASE_URL=%%a
  set SUPABASE_URL=!SUPABASE_URL:"=!
)

for /f "tokens=2 delims==" %%a in ('findstr "NEXT_PUBLIC_SUPABASE_ANON_KEY" .env.local') do (
  set SUPABASE_KEY=%%a
  set SUPABASE_KEY=!SUPABASE_KEY:"=!
)

echo SUPABASE_URL: %SUPABASE_URL%
echo SUPABASE_KEY: %SUPABASE_KEY%
echo.

REM Set environment secrets in Vercel
echo Setting secrets in Vercel...
vercel env add supabase_url
vercel env add supabase_key

echo.
echo Environment variables set up!
