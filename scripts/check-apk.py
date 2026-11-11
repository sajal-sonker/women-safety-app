"""Static APK model/bundle/ELF checks. Not a substitute for Android16KB runtime tests."""
import hashlib
import json
import pathlib
import struct
import sys
import zipfile

apk = pathlib.Path(sys.argv[1])
manifest = json.loads(pathlib.Path("ml/models/manifest.json").read_text())
with zipfile.ZipFile(apk) as archive:
    assert "assets/index.android.bundle" in archive.namelist(), "Missing standalone JavaScript"
    model = archive.read("assets/models/yamnet.tflite")
    assert hashlib.sha256(model).hexdigest() == manifest["sha256"], "Bundled model mismatch"
    assert archive.read("assets/models/LICENSE-YAMNET.txt"), "Missing model license"
    phrase_manifest = json.loads(pathlib.Path("ml/models/phrases/manifest.json").read_text(encoding="utf-8"))
    assert json.loads(archive.read("assets/phrases/manifest.json")) == phrase_manifest, "Phrase manifest mismatch"
    assert archive.read("assets/phrases/LICENSE-VOSK.txt"), "Missing speech model license"
    for item in phrase_manifest["models"]:
        for spec in item["files"]:
            data = archive.read("assets/phrases/"+item["id"]+"/"+spec["path"])
            assert len(data) == spec["size_bytes"] and hashlib.sha256(data).hexdigest() == spec["sha256"], "Phrase model asset mismatch"
    assert not any("/private/" in name or "training-smoke" in name for name in archive.namelist()), "Private ML data in APK"
    assert not any("test-fixtures" in name or (name.rsplit("/", 1)[-1].startswith("generated-") and name.endswith(".wav")) for name in archive.namelist()), "Generated test speech must not enter app APK"
    unsupported = []
    for name in archive.namelist():
        if not name.startswith("lib/") or not name.endswith(".so"):
            continue
        data = archive.read(name)
        if data[:6] != b"\x7fELF\x02\x01":
            unsupported.append(name+":unsupported-ELF")
            continue
        offset = struct.unpack_from("<Q", data, 32)[0]
        entry_size, entries = struct.unpack_from("<HH", data, 54)
        for i in range(entries):
            entry = offset+i*entry_size
            kind = struct.unpack_from("<I", data, entry)[0]
            if kind == 1 and struct.unpack_from("<Q", data, entry+48)[0] < 16384:
                unsupported.append(name)
                break
result = {"status": "PASS_STATIC_CHECKS" if not unsupported else "NATIVE_ALIGNMENT_FAILURE",
          "apk_sha256": hashlib.sha256(apk.read_bytes()).hexdigest(), "bundled_model_verified": True,
          "embedded_javascript": True, "unverified_16kb_libraries": unsupported,
          "phrase_models_verified": [item["id"] for item in phrase_manifest["models"]],
          "physical_runtime": "NOT_TESTED"}
print(json.dumps(result, indent=2))
sys.exit(1 if unsupported else 0)
