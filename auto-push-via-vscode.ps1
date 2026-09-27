# PowerShell script to trigger VS Code Source Control commit and push
# This uses keyboard shortcuts to automate the process

# Open VS Code if not already open
$vscode = Get-Process code -ErrorAction SilentlyContinue
if (-not $vscode) {
    Write-Host "Opening VS Code..."
    Start-Process code "c:\Users\OLU\Desktop\SMS"
    Start-Sleep -Seconds 3
}

# Activate VS Code window
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class Window {
    [DllImport("user32.dll")]
    public static extern bool SetForegroundWindow(IntPtr hWnd);
}
"@

$vsProcess = Get-Process code | Select-Object -First 1
if ($vsProcess) {
    [Window]::SetForegroundWindow($vsProcess.MainWindowHandle)
    Start-Sleep -Seconds 1
}

# Simulate keyboard commands to commit and push
Write-Host "Opening Source Control (Ctrl+Shift+G)..."
[System.Windows.Forms.SendKeys]::SendWait("^+g")
Start-Sleep -Seconds 2

Write-Host "Typing commit message..."
$message = "Fix: ALL 7 critical issues - Letters, Edit, Delete, Results, Classes, Real-time Fees, Academic Tab - Syntax errors resolved"
[System.Windows.Forms.SendKeys]::SendWait($message)
Start-Sleep -Seconds 1

Write-Host "Committing (Ctrl+Enter)..."
[System.Windows.Forms.SendKeys]::SendWait("^{ENTER}")
Start-Sleep -Seconds 3

Write-Host "Pushing (Ctrl+Shift+P)..."
[System.Windows.Forms.SendKeys]::SendWait("^+p")
Start-Sleep -Seconds 1

Write-Host "Done! Check VS Code for status."
