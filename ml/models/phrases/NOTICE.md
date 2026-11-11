# Offline Help/Bachao model attribution

Vosk API and the two model packages are distributed under Apache-2.0. Source: https://alphacephei.com/vosk/models and https://github.com/alphacep/vosk-api .

Unmodified upstream archives: vosk-model-small-en-us-0.15 (English) and vosk-model-small-hi-0.22 (Hindi). Archive/file hashes, sizes, sources and limited recognition grammars are pinned in manifest.json. Upstream README files remain in each package. Vosk Android0.3.75 and JNA5.18.1 are separately resolved dependencies.

SurakshaAI consumes bounded, explicitly consented PCM locally and extracts only HELP/BACHAO labels from finalized words. It never stores/uploads microphone audio or transcripts. This is a prototype word recognizer, not a validated distress detector. Ordinary speech/TV can prompt a check-in; accents/noise/whispers may be missed. No automatic SOS.
