import http.server
import socketserver
import threading
import os
import json
import shutil
from playwright.sync_api import sync_playwright

PORT = 8095
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
    print(f"Server started on http://localhost:{PORT}")

    viewports = [
        {"name": "390x844", "width": 390, "height": 844},
        {"name": "390x667", "width": 390, "height": 667},
        {"name": "360x640", "width": 360, "height": 640}
    ]

    states = [
        "room1_fresh",
        "room1_wrong",
        "room4",
        "room5_boss",
        "longest_qa"
    ]

    all_results = []

    with sync_playwright() as p:
        browser = p.chromium.launch(channel="chrome", headless=True)

        for vp in viewports:
            print(f"\n==========================================")
            print(f"Testing Viewport {vp['name']} ({vp['width']}x{vp['height']})")
            print(f"==========================================")
            context = browser.new_context(viewport={"width": vp["width"], "height": vp["height"]})
            page = context.new_page()
            page.goto(f"http://localhost:{PORT}/index.html")
            page.wait_for_load_state("networkidle")

            for state in states:
                setup_script = f"""() => {{
                    const sc = ScorchedCity;
                    const bank = (typeof CURRICULUM_BANK !== 'undefined' ? CURRICULUM_BANK : null);
                    const run = sc.startNewRun({{
                        studentCode: '09121112233',
                        grade: '10',
                        mode: 'standard',
                        seed: 'layer5-audit',
                        curriculumBank: bank
                    }});

                    if ('{state}' === 'room1_fresh') {{
                        run.room = 1;
                        startScorchedCityBattle('standard', true);
                    }} else if ('{state}' === 'room1_wrong') {{
                        run.room = 1;
                        startScorchedCityBattle('standard', true);
                        updateScorchedCityBattleHud({{
                            revealedAnswer: 'پاسخ صحیح واژه تمرینی جهت تثبیت یادگیری'
                        }});
                    }} else if ('{state}' === 'room4') {{
                        run.room = 4;
                        startScorchedCityBattle('standard', true);
                    }} else if ('{state}' === 'room5_boss') {{
                        run.room = 5;
                        startScorchedCityBattle('standard', true);
                    }} else if ('{state}' === 'longest_qa') {{
                        run.room = 1;
                        const longestItem = {{
                            word: "خانه‌های گلی تبریز بخشی از قصر او بودند",
                            correct: "۱) پایان (در به سر بردن)  ۲) سرِ انسان (ایهام تناسب با دست و پای)",
                            meanings: [
                                "۱) پایان (در به سر بردن)  ۲) سرِ انسان (ایهام تناسب با دست و پای)",
                                "گزینه دوم با متن نسبتا طولانی برای شبیه‌سازی دقیق شرایط پرفشار صفحه موبایل",
                                "گزینه سوم جهت آزمون چیدمان واکنش‌گرا و بررسی کادر بدون اسکرول",
                                "گزینه چهارم پاسخ انحرافی برای سنجش نهایی ارتفاع و رفتار قلم"
                            ],
                            tag: "کنایه",
                            hint: "نگاه فزون‌خواهانه و دهشت‌بار روس‌ها به فراتر از این‌ها دوخته شده بود"
                        }};
                        run.roomQueue = [longestItem];
                        startScorchedCityBattle('standard', true);
                    }}

                    const arena = document.getElementById('viewArena');
                    const rpgDialog = document.getElementById('rpgDialog');
                    const docEl = document.documentElement;

                    const arenaScroll = arena ? arena.scrollHeight : 0;
                    const arenaClient = arena ? arena.clientHeight : 0;
                    const dialogScroll = rpgDialog ? rpgDialog.scrollHeight : 0;
                    const dialogClient = rpgDialog ? rpgDialog.clientHeight : 0;
                    const docScroll = docEl ? docEl.scrollHeight : 0;
                    const docClient = docEl ? docEl.clientHeight : 0;

                    const topHud = document.querySelector('.top-hud.hud-arena');
                    const stageScene = document.getElementById('stageScene');
                    const enemyHpWrap = document.getElementById('enemyHpWrap');
                    const scHud = document.getElementById('scorchedCityBattleHud');
                    const rpgQuestion = document.querySelector('.rpg-question');
                    const qzOptions = document.getElementById('qzOptions');
                    const optionBtns = Array.from(document.querySelectorAll('.rpg-option-btn'));

                    return {{
                        arenaScroll,
                        arenaClient,
                        dialogScroll,
                        dialogClient,
                        docScroll,
                        docClient,
                        arenaNoScroll: arenaScroll <= arenaClient + 1,
                        dialogNoScroll: dialogScroll <= dialogClient + 1,
                        docNoScroll: docScroll <= docClient + 1,
                        topHudHeight: topHud ? topHud.getBoundingClientRect().height : 0,
                        stageSceneHeight: stageScene ? stageScene.getBoundingClientRect().height : 0,
                        enemyHpWrapHeight: enemyHpWrap ? enemyHpWrap.getBoundingClientRect().height : 0,
                        scHudHeight: scHud ? scHud.getBoundingClientRect().height : 0,
                        rpgQuestionHeight: rpgQuestion ? rpgQuestion.getBoundingClientRect().height : 0,
                        qzOptionsHeight: qzOptions ? qzOptions.getBoundingClientRect().height : 0,
                        optionBtnHeights: optionBtns.map(b => Math.round(b.getBoundingClientRect().height)),
                        hasLongOptionClass: optionBtns.some(b => b.classList.contains('is-long'))
                    }};
                }}"""

                measure = page.evaluate(setup_script)
                page.wait_for_timeout(200)

                shot_name = f"layer5_arena_{state}_{vp['name']}.png"
                shot_path = os.path.join(REPORTS_DIR, shot_name)
                page.screenshot(path=shot_path)
                if os.path.exists(ARTIFACTS_DIR):
                    shutil.copy2(shot_path, os.path.join(ARTIFACTS_DIR, shot_name))

                passed = measure["arenaNoScroll"] and measure["dialogNoScroll"] and measure["docNoScroll"]
                res = {
                    "viewport": vp["name"],
                    "state": state,
                    "measure": measure,
                    "passed": passed,
                    "screenshot": shot_name
                }
                all_results.append(res)
                status = "PASS" if passed else "FAIL"
                print(f"[{status}] {vp['name']} | {state:13s} | Arena: {measure['arenaScroll']}/{measure['arenaClient']} | Dialog: {measure['dialogScroll']}/{measure['dialogClient']} | Doc: {measure['docScroll']}/{measure['docClient']} | Q: {round(measure['rpgQuestionHeight'])}px | Opts: {round(measure['qzOptionsHeight'])}px")

            context.close()
        browser.close()

    total = len(all_results)
    passed_count = sum(1 for r in all_results if r["passed"])
    print(f"\n==========================================")
    print(f"DOM FLOW & VIEWPORT RESULTS: {passed_count}/{total} PASSED")
    print(f"==========================================")

    with open(os.path.join(REPORTS_DIR, "layer5_viewport_audit.json"), "w", encoding="utf-8") as f:
        json.dump(all_results, f, ensure_ascii=False, indent=2)

if __name__ == "__main__":
    main()
