# Android compilation evidence and remaining spikes

Environment: Windows, Node26.13.0, JDK17.0.21, RN0.88.1/React19.3.0, AGP via the RN Gradle plugin, Gradle9.4.1, Kotlin2.2.0, NDK27.1.12297006, CMake3.22.1, MapLibre11.5.1. Android min29, compile/target36, build-tools36.0.0. RN template requested unavailable SDK37; using installed36 compiled successfully. Reassess target SDK and store policy during Phase4; no store release is claimed.

Executed: `gradlew.bat :app:assembleDebug -PreactNativeArchitectures=arm64-v8a --console=plain`, success. Native Firebase auth, Codegen, generated Kotlin network DTOs, Android Keystore, typed location service, MapLibre and navigation native libraries were compiled. Metro production Android bundle also completed (22 assets). These are compile/packaging checks, not a launched application or physical-device pass. Build warnings include Gradle10 deprecations; no Gradle10 upgrade was attempted.

| Boundary | Current evidence / required follow-up |
|---|---|
| Android permissions, visible-start location FGS | Manifest/runtime implementation compiles; exercise API29/33/34/36, denied notification/location, coarse-only and revoked permission on physical devices |
| JS suspension, process death, reboot, offline stop | Native-owned encrypted journal and bounded retry implemented; inject lifecycle failures and verify replay/tombstone outcomes on device |
| Screen-off tracking and OEM battery saver | Not measured; service is best effort and no boot restart is promised |
| ABI /16KB page sizes | arm64 APK built; x86_64 and16KB runtime/load tests pending |
| Microphone FGS/LiteRT | Not implemented in P1/2; Phase3 needs isolated compile and physical spikes before monitoring enablement |
| Global volume keys | Unsupported claim prohibited; Phase3 may prove focused-window path or record experimental fallback; no accessibility shortcut |
| Battery/CPU/TalkBack/large text/Hindi | Two mocked component tests only; actual profiling/accessibility/localization review pending |

Location service obeys [Android foreground-service prerequisites](https://developer.android.com/develop/background-work/services/fgs/service-types#location). Emulator transport follows [Firebase local-auth guidance](https://firebase.google.com/docs/emulator-suite/connect_auth). No test results for unavailable devices or providers are inferred from a successful build.
