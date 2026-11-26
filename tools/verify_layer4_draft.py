import http.server
import socketserver
import threading
import os
import json
import shutil
from playwright.sync_api import sync_playwright

PORT = 8097
DIRECTORY = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
REPORTS_DIR = os.path.join(DIRECTORY, "reports")
ARTIFACTS_DIR = r"C:\Users\acer\.gemini\antigravity\brain\b274b952-e7d5-43e5-845c-7709f2a8956c"

class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)
    def log_message(self, format, *args):
        pass

def start_server():
    socketserver.TCPServer.allow_reuse_address = True
    httpd = socketserver.TCPServer(("", PORT), QuietHandler)
    t = threading.Thread(target=httpd.serve_forever, daemon=True)
    t.start()
    return httpd

def main():
    os.makedirs(REPORTS_DIR, exist_ok=True)
    httpd = start_server()
    print(f"Server started at http://localhost:{PORT}")

    viewports = [
        {"name": "390x844", "width": 390, "height": 844},
        {"name": "390x667", "width": 390, "height": 667},
        {"name": "360x640", "width": 360, "height": 640}
    ]

    states = ["room1", "room3", "room4", "swap", "replace"]
    all_results = []

    with sync_playwright() as p:
        browser = p.chromium.launch(
            channel="chrome",
            headless=True
        )

        for vp in viewports:
            print(f"\n--- Testing Viewport {vp['width']}x{vp['height']} ---")
            context = browser.new_context(viewport={"width": vp["width"], "height": vp["height"]})
            page = context.new_page()
            page.goto(f"http://localhost:{PORT}/index.html")
            page.wait_for_load_state("networkidle")

            for state in states:
                # Set up state in page
                setup_script = f"""() => {{
                    const sc = ScorchedCity;
                    const bank = (typeof CURRICULUM_BANK !== 'undefined' ? CURRICULUM_BANK : null);
                    // Reset state
                    window.pendingReplaceChoiceCardId = null;
                    window.isBossPrepSwapPanelOpen = false;
                    window.selectedBossSwapDiscardId = null;

                    const run = sc.startNewRun({{
                        studentCode: '09121112233',
                        grade: '10',
                        mode: 'standard',
                        seed: 'layer4-test-seed',
                        curriculumBank: bank
                    }});

                    if ('{state}' === 'room1') {{
                        run.room = 1;
                        run.activePacts = [];
                        run.pendingDraft = sc.generateDraftOffer(run, 1);
                        openScorchedCityDraftOverlay();
                    }} else if ('{state}' === 'room3') {{
                        run.room = 3;
                        run.activePacts = [
                            {{ cardId: 'flame_strike', level: 1 }}
                        ];
                        run.pendingDraft = sc.generateDraftOffer(run, 3);
                        openScorchedCityDraftOverlay();
                    }} else if ('{state}' === 'room4') {{
                        run.room = 4;
                        run.activePacts = [
                            {{ cardId: 'flame_strike', level: 1 }},
                            {{ cardId: 'golden_strike', level: 1 }}
                        ];
                        run.pendingDraft = sc.generateDraftOffer(run, 4);
                        openScorchedCityDraftOverlay();
                    }} else if ('{state}' === 'swap') {{
                        run.room = 4;
                        run.activePacts = [
                            {{ cardId: 'flame_strike', level: 1 }},
                            {{ cardId: 'golden_strike', level: 1 }}
                        ];
                        run.pendingDraft = sc.generateDraftOffer(run, 4);
                        window.isBossPrepSwapPanelOpen = true;
                        openScorchedCityDraftOverlay();
                    }} else if ('{state}' === 'replace') {{
                        run.room = 2;
                        run.activePacts = [
                            {{ cardId: 'flame_strike', level: 1 }},
                            {{ cardId: 'golden_strike', level: 1 }},
                            {{ cardId: 'threshold_guardian', level: 1 }}
                        ];
                        run.pendingDraft = sc.generateDraftOffer(run, 2);
                        window.pendingReplaceChoiceCardId = 'error_mirror';
                        openScorchedCityDraftOverlay();
                    }}

                    // Measure scroll dimensions
                    const overlay = document.getElementById('scDraftOverlay');
                    const modal = document.getElementById('scDraftModalBody');
                    return {{
                        overlayScrollHeight: overlay ? overlay.scrollHeight : 0,
                        overlayClientHeight: overlay ? overlay.clientHeight : 0,
                        modalScrollHeight: modal ? modal.scrollHeight : 0,
                        modalClientHeight: modal ? modal.clientHeight : 0,
                        hasCardsRow: Boolean(document.getElementById('scDraftCardsRow')),
                        hasEarlyClue: Boolean(document.getElementById('scRoom3EarlyClue')),
                        hasBossPrep: Boolean(document.getElementById('scRoom4BossPrepBanner')),
                        hasSwapPanel: Boolean(document.getElementById('scBossSwapPanel')),
                        hasReplaceBox: Boolean(document.getElementById('scReplacePickerBox')),
                        activeSlotsCount: sc.getActivePactSlots(run).length,
                        earlyClueData: run.pendingDraft && run.pendingDraft.earlyKeyFamilyClue ? run.pendingDraft.earlyKeyFamilyClue : null,
                        bossTelegraph: run.pendingDraft && run.pendingDraft.bossTelegraph ? {{
                            bossName: run.pendingDraft.bossTelegraph.bossName,
                            lawTitle: run.pendingDraft.bossTelegraph.lawTitle,
                            lawShortFa: run.pendingDraft.bossTelegraph.lawShortFa,
                            keyFamilyLabel: run.pendingDraft.bossTelegraph.keyFamilyLabel,
                            predictedTarget: run.pendingDraft.bossTelegraph.predictedRoom5TargetScore
                        }} : null
                    }};
                }}"""

                measure = page.evaluate(setup_script)
                page.wait_for_timeout(200)

                # Screenshot
                shot_name = f"layer4_draft_{state}_{vp['name']}.png"
                shot_path = os.path.join(REPORTS_DIR, shot_name)
                page.screenshot(path=shot_path)
                # Copy to brain artifact directory
                if os.path.exists(ARTIFACTS_DIR):
                    shutil.copy2(shot_path, os.path.join(ARTIFACTS_DIR, shot_name))

                overlay_no_scroll = measure["overlayScrollHeight"] <= measure["overlayClientHeight"] + 1
                modal_no_scroll = measure["modalScrollHeight"] <= measure["modalClientHeight"] + 1

                res = {
                    "viewport": vp["name"],
                    "state": state,
                    "overlay_scroll": measure["overlayScrollHeight"],
                    "overlay_client": measure["overlayClientHeight"],
                    "modal_scroll": measure["modalScrollHeight"],
                    "modal_client": measure["modalClientHeight"],
                    "passed": overlay_no_scroll and modal_no_scroll,
                    "measure": measure,
                    "screenshot": shot_name
                }
                all_results.append(res)
                status_icon = "PASS" if res["passed"] else "FAIL"
                print(f"[{status_icon}] State {state:7s} on {vp['name']}: modal scroll={measure['modalScrollHeight']} vs client={measure['modalClientHeight']} (overlay {measure['overlayScrollHeight']} vs {measure['overlayClientHeight']})")

            context.close()

        browser.close()

    total_tests = len(all_results)
    pass_tests = sum(1 for r in all_results if r["passed"])
    print(f"\n==========================================")
    print(f"PLAYWRIGHT VIEWPORT RESULTS: {pass_tests}/{total_tests} PASSED")
    print(f"==========================================")

    # Output detailed JSON for the report
    with open(os.path.join(REPORTS_DIR, "layer4_viewport_audit.json"), "w", encoding="utf-8") as f:
        json.dump(all_results, f, ensure_ascii=False, indent=2)

if __name__ == "__main__":
    main()
