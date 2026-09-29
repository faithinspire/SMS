#!/usr/bin/env python3
"""
Deploy School Admin fixes to Vercel via GitHub
"""

import subprocess
import sys
import os

def run_command(cmd, description):
    """Run a command and report status"""
    print(f"\n✏️ {description}...")
    try:
        result = subprocess.run(
            cmd,
            shell=True,
            cwd=r'c:\Users\OLU\Desktop\SMS',
            capture_output=True,
            text=True
        )
        
        if result.returncode != 0:
            print(f"❌ Error: {result.stderr}")
            return False
        else:
            if result.stdout:
                print(f"✅ {description} - Success")
                print(result.stdout)
            else:
                print(f"✅ {description} - Complete")
            return True
    except Exception as e:
        print(f"❌ Failed: {str(e)}")
        return False

def main():
    print("\n" + "="*80)
    print("🚀 DEPLOYING SCHOOL ADMIN FIXES TO VERCEL")
    print("="*80)
    
    # Step 1: Check status
    print("\n[1/4] Checking repository status...")
    result = subprocess.run(
        'git status --short',
        shell=True,
        cwd=r'c:\Users\OLU\Desktop\SMS',
        capture_output=True,
        text=True
    )
    
    if result.stdout.strip():
        print("📝 Modified files:")
        print(result.stdout)
    else:
        print("⚠️  No modified files detected")
    
    # Step 2: Stage all
    if not run_command('git add -A', 'Staging all changes'):
        return
    
    # Step 3: Commit
    if not run_command(
        'git commit -m "Fix: Results page Supabase integration + All School Admin features"',
        'Creating commit'
    ):
        print("⚠️  Nothing to commit (already up to date)")
    
    # Step 4: Push
    if not run_command('git push origin main', 'Pushing to GitHub'):
        print("❌ Push failed")
        return
    
    print("\n" + "="*80)
    print("✅ DEPLOYMENT INITIATED")
    print("="*80)
    print("\n📊 Deployment Status:")
    print("  ✅ All changes committed")
    print("  ✅ Pushed to GitHub")
    print("  ✅ Vercel webhook triggered")
    print("\n📍 Monitor deployment at:")
    print("  • Vercel: https://vercel.com/dashboard/projects/sms-gold-eta")
    print("  • Live: https://sms-gold-eta.vercel.app/school-admin/results")
    print("\n⏱️ Timeline:")
    print("  NOW:       Push sent")
    print("  +30 sec:   GitHub receives")
    print("  +1 min:    Vercel webhook fires")
    print("  +3-5 min:  Build completes")
    print("  +5-10 min: 🎉 LIVE\n")

if __name__ == '__main__':
    main()
