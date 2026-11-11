"""Actual offline recognition of generated speech; NOT human distress accuracy."""
import argparse
import hashlib
import json
import pathlib
import shutil
import subprocess
import time
import wave
import zipfile
import numpy as np
import vosk

ROOT = pathlib.Path(__file__).resolve().parents[2]


def load_models(folder):
    manifest = json.loads((ROOT / 'ml/models/phrases/manifest.json').read_text(encoding='utf-8'))
    models = {}
    for item in manifest['models']:
        archive = ROOT / 'ml/models/phrases' / item['archive']
        if hashlib.sha256(archive.read_bytes()).hexdigest() != item['sha256']:
            raise ValueError('Phrase model archive hash mismatch')
        with zipfile.ZipFile(archive) as package:
            expected = {item['id']+'/'+entry['path']: entry for entry in item['files']}
            if {entry.filename for entry in package.infolist() if not entry.is_dir()} != set(expected):
                raise ValueError('Phrase model file allowlist mismatch')
            for name, spec in expected.items():
                if '..' in pathlib.PurePosixPath(name).parts:
                    raise ValueError('Unsafe model archive path')
                data = package.read(name)
                if len(data) != spec['size_bytes'] or hashlib.sha256(data).hexdigest() != spec['sha256']:
                    raise ValueError('Phrase model file checksum mismatch')
                target = folder / name
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_bytes(data)
        model = vosk.Model(str(folder / item['id']))
        required = 'help' if item['language'] == 'en' else 'बचाओ'
        if model.vosk_model_find_word(required) < 0:
            raise ValueError('Keyword absent from pretrained vocabulary')
        models[item['language']] = model
    return manifest, models


def hit(language, result, minimum):
    # Match the Android finalized-word policy, including confidence and timing.
    expected = 'help' if language == 'en' else 'बचाओ'
    return any(word['word'].lower() == expected and minimum <= word['conf'] <= 1 and
               word['start'] >= 0 and .08 <= word['end']-word['start'] <= 3
               for word in result.get('result', []))


def run(args):
    folder = ROOT / '.local/phrase-smoke'
    folder.mkdir(parents=True, exist_ok=True)
    tts = args.espeak or shutil.which('espeak-ng')
    bundled = ROOT / '.tools/espeak/SourceDir/eSpeak NG/espeak-ng.exe'
    if not tts and bundled.exists():
        tts = str(bundled)
    vosk.SetLogLevel(-1)
    manifest, models = load_models(folder / 'models')
    fixtures = [('en', 'help', 'HELP'), ('en', 'please help me', 'HELP'),
                ('hi', 'बचाओ', 'BACHAO'), ('hi', 'मुझे बचाओ', 'BACHAO'),
                ('en', 'hello have a lovely day', None), ('en', 'the helper is healthy', None),
                ('hi', 'बताओ', None), ('hi', 'खाना बनाओ', None)]
    cases = []
    for index, (language, text, expected) in enumerate(fixtures if args.espeak else []):
        source, target = folder / f'generated-{index}.txt', folder / f'generated-{index}.wav'
        source.write_text(text, encoding='utf-8')
        command = [str(tts)]
        # Portable Windows eSpeak needs its data directory explicitly selected.
        if (pathlib.Path(tts).parent / 'espeak-ng-data').is_dir():
            command += ['--path='+str(pathlib.Path(tts).parent)]
        subprocess.run(command+['-v', language, '-s', '145', '-w', str(target), '-f', str(source)], check=True, capture_output=True)
        with wave.open(str(target), 'rb') as audio:
            if audio.getnchannels() != 1 or audio.getsampwidth() != 2:
                raise ValueError('Synthetic speech must be mono PCM16')
            rate = audio.getframerate()
            raw = np.frombuffer(audio.readframes(audio.getnframes()), dtype='<i2')
        pcm = np.interp(np.arange(int(len(raw)*16000/rate))*rate/16000, np.arange(len(raw)), raw).astype('<i2')
        pcm = np.concatenate([pcm, np.zeros(32000, dtype='<i2')])
        cases.append((f'generated-{index}', pcm, expected))
    if args.espeak:
        cases += [('generated-silence', np.zeros(48000, dtype='<i2'), None),
                  ('generated-noise', np.random.default_rng(7).integers(-2000, 2000, 48000, dtype='<i2'), None)]
    else:
        source = ROOT / 'ml/test-fixtures/phrases'
        catalog = json.loads((source / 'manifest.json').read_text(encoding='utf-8'))
        if catalog['kind'] != 'GENERATED_ESPEAK_NG_1.52.0_TOOLCHAIN_ONLY' or len(catalog['fixtures']) != 10:
            raise ValueError('Only generated toolchain fixtures may run automatically')
        for item in catalog['fixtures']:
            target = source / item['file']
            if target.parent != source or hashlib.sha256(target.read_bytes()).hexdigest() != item['sha256']:
                raise ValueError('Generated fixture integrity mismatch')
            with wave.open(str(target), 'rb') as audio:
                if (audio.getnchannels(), audio.getsampwidth(), audio.getframerate()) != (1, 2, 16000):
                    raise ValueError('Fixture PCM mismatch')
                pcm = np.frombuffer(audio.readframes(audio.getnframes()), dtype='<i2')
            cases.append((item['file'], pcm, item['expected']))
    outcomes, seconds, compute = [], 0, 0
    for name, pcm, expected in cases:
        labels = set()
        start = time.perf_counter()
        for item in manifest['models']:
            recognizer = vosk.KaldiRecognizer(models[item['language']], 16000, json.dumps(item['grammar'], ensure_ascii=False))
            recognizer.SetWords(True)
            results = []
            for offset in range(0, len(pcm), 1600):
                if recognizer.AcceptWaveform(pcm[offset:offset+1600].tobytes()):
                    results.append(json.loads(recognizer.Result()))
            results.append(json.loads(recognizer.FinalResult()))
            if any(hit(item['language'], result, manifest['minimum_word_confidence']) for result in results):
                labels.add('HELP' if item['language'] == 'en' else 'BACHAO')
        compute += time.perf_counter()-start
        seconds += len(pcm)/16000
        wanted = {expected} if expected else set()
        outcomes.append({'fixture': name, 'expected': sorted(wanted), 'recognized': sorted(labels), 'passed': labels == wanted})
    report = {'status': 'PASS_GENERATED_SPEECH_TOOLCHAIN_ONLY' if all(r['passed'] for r in outcomes) else 'FAIL',
              'cases': outcomes, 'generated_audio_seconds': seconds, 'desktop_processing_seconds': compute,
              'desktop_real_time_factor': compute/seconds, 'human_accuracy': 'NOT_MEASURED', 'phone_runtime': 'NOT_MEASURED',
              'automatic_dispatch': False}
    (folder / 'report.json').write_text(json.dumps(report, indent=2))
    print(json.dumps(report, indent=2))
    return 0 if all(r['passed'] for r in outcomes) else 1


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--espeak')
    raise SystemExit(run(parser.parse_args()))
