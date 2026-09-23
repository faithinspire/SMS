#!/usr/bin/env pwsh
# Deployment script for SMS fixes

cd c:\Users\OLU\Desktop\SMS

Write-Host "================================" -ForegroundColor Cyan
Write-Host "SMS PRODUCTION FIX DEPLOYMENT" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "[1/5] Checking git status..." -ForegroundColor Yellow
git status --short

Write-Host ""
Write-Host "[2/5] Staging files..." -ForegroundColor Yellow
git add database/migrations/136_restore_broadcasts_rls_policies.sql
git add BROADCAST_FIX_DEPLOYMENT_GUIDE.md
git add FINAL_DEPLOYMENT_SUMMARY.md

Write-Host ""
Write-Host "[3/5] Creating commit..." -ForegroundColor Yellow
git commit -m "CRITICAL FIXES: Migration 136 RLS policies + CBT trigger sync + broadcast validation"

Write-Host ""
Write-Host "[4/5] Pushing to GitHub..." -ForegroundColor Yellow
git push origin main

Write-Host ""
Write-Host "[5/5] Deployment complete!" -ForegroundColor Green
Write-Host ""
Write-Host "✅ Changes pushed to GitHub" -ForegroundColor Green
Write-Host "✅ Vercel will auto-deploy in 2-5 minutes" -ForegroundColor Green
Write-Host "⏳ Next: Execute Migration 136 in Supabase SQL Editor" -ForegroundColor Yellow
Write-Host ""
Write-Host "Check deployment: https://vercel.com/dashboard" -ForegroundColor Cyan
Write-Host ""
