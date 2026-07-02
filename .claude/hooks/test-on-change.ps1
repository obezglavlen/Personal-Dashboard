# PostToolUse (Edit|Write) hook: auto-run the Vitest suite after edits to
# TS/TSX under home-dashboard/. Wired in .claude/settings.json.
#
# Reads the hook payload (JSON) from stdin, extracts the edited file path, and
# only runs when it's a .ts/.tsx inside the app (skips docs, json, build/vendor
# dirs, and files outside home-dashboard). On test failure it exits 2 so the
# output is fed straight back to Claude; on pass it prints a short systemMessage.
# Any hook-infrastructure error exits 0 so a broken hook never blocks editing.

try {
	$raw = [Console]::In.ReadToEnd()
	if ([string]::IsNullOrWhiteSpace($raw)) { exit 0 }

	try { $j = $raw | ConvertFrom-Json } catch { exit 0 }
	$fp = $j.tool_input.file_path
	if ([string]::IsNullOrWhiteSpace($fp)) { exit 0 }

	# Normalize to forward slashes, then gate on location + extension.
	$norm = ($fp -replace '\\', '/')
	if ($norm -notmatch '/home-dashboard/') { exit 0 }
	if ($norm -notmatch '\.tsx?$') { exit 0 }
	if ($norm -match '/(node_modules|\.next|generated|dist)/') { exit 0 }

	$proj = 'C:\Users\user\Documents\home\home-dashboard'
	$out = (& pnpm -C $proj test *>&1 | Out-String)
	$code = $LASTEXITCODE
	$lines = $out -split "`n"

	if ($code -ne 0) {
		$tail = ($lines | Select-Object -Last 40) -join "`n"
		[Console]::Error.WriteLine("Vitest FAILED after editing $fp (exit $code):`n$tail")
		exit 2
	}

	$summary = (($lines | Where-Object { $_ -match 'Test Files|Tests\s' } | ForEach-Object { $_.Trim() }) | Select-Object -Last 2) -join ' | '
	if ([string]::IsNullOrWhiteSpace($summary)) { $summary = 'all green' }
	(@{ systemMessage = "Vitest passed after edit - $summary"; suppressOutput = $true } | ConvertTo-Json -Compress)
	exit 0
}
catch {
	[Console]::Error.WriteLine("test-on-change hook error: $($_.Exception.Message)")
	exit 0
}
