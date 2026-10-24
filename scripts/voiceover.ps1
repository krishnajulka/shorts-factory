# Generates one WAV per scene with Windows built-in TTS and writes word timings
# for captions. Usage: powershell -File scripts/voiceover.ps1 -StoryPath stories/gerald.json
param([Parameter(Mandatory = $true)][string]$StoryPath)

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Speech

$root = Split-Path -Parent $PSScriptRoot
$story = Get-Content -Raw -Encoding UTF8 (Join-Path $root $StoryPath) | ConvertFrom-Json
$outDir = Join-Path $root "public/voice/$($story.id)"
New-Item -ItemType Directory -Force $outDir | Out-Null

# Speaks $text at $rate into $file; returns word events (positions as SAPI reports them).
function Speak-ToFile($text, $rate, $file) {
  $synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
  $synth.SelectVoice($story.voice)
  $synth.Rate = $rate
  # Events queue up while Speak() blocks; drain them afterwards.
  Register-ObjectEvent -InputObject $synth -EventName SpeakProgress -SourceIdentifier "progress" | Out-Null
  $synth.SetOutputToWaveFile($file)
  $synth.Speak($text)
  $synth.SetOutputToNull()
  Start-Sleep -Milliseconds 100
  $events = @(Get-Event -SourceIdentifier "progress" |
    Sort-Object { $_.SourceEventArgs.CharacterPosition } |
    ForEach-Object { @{ word = $_.SourceEventArgs.Text; start = $_.SourceEventArgs.AudioPosition.TotalSeconds } })
  Remove-Event -SourceIdentifier "progress" -ErrorAction SilentlyContinue
  Unregister-Event -SourceIdentifier "progress"
  $synth.Dispose()
  return $events
}

# Total length and the time the last audible sample ends (16-bit mono PCM).
function Measure-Wav($file) {
  $bytes = [System.IO.File]::ReadAllBytes($file)
  $byteRate = [BitConverter]::ToInt32($bytes, 28)
  $i = $bytes.Length - 2
  while ($i -gt 46 -and [math]::Abs([BitConverter]::ToInt16($bytes, $i)) -lt 800) { $i -= 2 }
  return @{ duration = ($bytes.Length - 46) / $byteRate; speechEnd = ($i - 46) / $byteRate }
}

$result = @()
foreach ($scene in $story.scenes) {
  $file = Join-Path $outDir "$($scene.id).wav"
  # SAPI word positions drift from the real audio at non-zero rates;
  # scripts/align.mjs rescales them against the pauses in the WAV.
  $words = Speak-ToFile $scene.text $story.rate $file
  $wav = Measure-Wav $file
  $result += @{ id = $scene.id; text = $scene.text; file = "voice/$($story.id)/$($scene.id).wav"; duration = $wav.duration; words = @($words) }
}

$out = Join-Path $root "src/generated/$($story.id).json"
$json = @{ id = $story.id; title = $story.title; scenes = $result } | ConvertTo-Json -Depth 6
[System.IO.File]::WriteAllText($out, $json)
Write-Output "Wrote $($result.Count) scenes"
node (Join-Path $PSScriptRoot "align.mjs") $out
