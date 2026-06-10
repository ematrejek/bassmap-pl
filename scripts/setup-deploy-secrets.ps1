# Ustawia sekrety produkcyjne z .dev.vars (lokalnie, nie commituj tego pliku z wartościami).
# Wymaga: npx wrangler login, gh auth login, plik .dev.vars w katalogu głównym projektu.

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$devVars = Join-Path $root ".dev.vars"

if (-not (Test-Path $devVars)) {
    Write-Error "Brak pliku .dev.vars. Skopiuj .env.example do .dev.vars i uzupełnij SUPABASE_URL oraz SUPABASE_KEY."
}

$vars = @{}
Get-Content $devVars | ForEach-Object {
    if ($_ -match '^([^#=][^=]*)=(.*)$') {
        $vars[$matches[1].Trim()] = $matches[2].Trim()
    }
}

foreach ($name in @("SUPABASE_URL", "SUPABASE_KEY")) {
    if (-not $vars.ContainsKey($name) -or [string]::IsNullOrWhiteSpace($vars[$name])) {
        Write-Error "Brak wartości $name w .dev.vars"
    }
}

Write-Host "Ustawianie sekretów Cloudflare Worker (bassmap-pl)..."
Push-Location $root
try {
    $vars["SUPABASE_URL"] | npx wrangler secret put SUPABASE_URL
    $vars["SUPABASE_KEY"] | npx wrangler secret put SUPABASE_KEY

    Write-Host "Ustawianie GitHub Secrets (ematrejek/bassmap-pl)..."
    $vars["SUPABASE_URL"] | gh secret set SUPABASE_URL
    $vars["SUPABASE_KEY"] | gh secret set SUPABASE_KEY
    "7c7a038aa9b3ee5a8d9b9237bc7b5cf7" | gh secret set CLOUDFLARE_ACCOUNT_ID

    Write-Host ""
    Write-Host "CLOUDFLARE_ACCOUNT_ID ustawione."
    Write-Host "Pozostaje ręcznie utworzyć CLOUDFLARE_API_TOKEN w Cloudflare Dashboard:"
    Write-Host "  My Profile -> API Tokens -> Create Token -> Edit Cloudflare Workers"
    Write-Host "Następnie: gh secret set CLOUDFLARE_API_TOKEN"
} finally {
    Pop-Location
}
