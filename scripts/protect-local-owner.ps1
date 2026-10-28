param([Parameter(Mandatory=$true)][string]$ConfigPath)
$ErrorActionPreference='Stop'
Import-Module (Join-Path $PSHOME 'Modules/Microsoft.PowerShell.Security/Microsoft.PowerShell.Security.psd1') -ErrorAction Stop
$taskResolved=(Resolve-Path -LiteralPath $ConfigPath).Path
$taskIdentity=[System.Security.Principal.WindowsIdentity]::GetCurrent().User
foreach($taskTarget in @([System.IO.Path]::GetDirectoryName($taskResolved),$taskResolved)) {
  $taskIsDirectory=Test-Path -LiteralPath $taskTarget -PathType Container
  $taskAcl=Get-Acl -LiteralPath $taskTarget
  $taskOwner=([System.Security.Principal.NTAccount]$taskAcl.Owner).Translate([System.Security.Principal.SecurityIdentifier])
  if($taskOwner -ne $taskIdentity) { throw 'Local owner credential must be owned by the current user' }
  $taskGrant=if($taskIsDirectory) { '*'+$taskIdentity.Value+':(OI)(CI)F' } else { '*'+$taskIdentity.Value+':F' }
  & "$env:SystemRoot/System32/icacls.exe" $taskTarget '/inheritance:r' '/grant:r' $taskGrant | Out-Null
  if($LASTEXITCODE -ne 0) { throw 'Unable to protect local owner credential' }
  foreach($taskRule in $taskAcl.Access) {
    $taskTrustee=$taskRule.IdentityReference.Translate([System.Security.Principal.SecurityIdentifier])
    if(!$taskRule.IsInherited -and $taskTrustee -ne $taskIdentity) {
      & "$env:SystemRoot/System32/icacls.exe" $taskTarget '/remove' ('*'+$taskTrustee.Value) | Out-Null
      if($LASTEXITCODE -ne 0) { throw 'Unable to remove shared local access' }
    }
  }
  $taskFinal=Get-Acl -LiteralPath $taskTarget
  if(!$taskFinal.AreAccessRulesProtected -or @($taskFinal.Access | Where-Object { $_.IdentityReference.Translate([System.Security.Principal.SecurityIdentifier]) -ne $taskIdentity }).Count -gt 0) { throw 'Private access verification failed' }
}
