# Generated speech fixtures

These ten PCM WAVs contain no human recordings or participant data. Eight were generated from the neutral phrases in `ml/runtime/phrases_smoke.py` using eSpeak NG1.52.0 (English/Hindi,145words/min), resampled to mono16kHz PCM16 and given2seconds of trailing silence. The other two are generated silence and seeded noise. File hashes and expected keyword labels are in [manifest](manifest.json).

Use only to check actual recognition/toolchain execution. They are not training data, held-out human evaluation, evidence of distress accuracy or app audio assets. Android's model asset allowlist excludes this directory. To generate an ignored alternative set, run `npm run ml:phrases-smoke -- --espeak <local-espeak-ng>` with the runtime Python environment.
