"""CLI entry point — python -m verticals."""

import argparse
import json as _json
import sys
import time
from pathlib import Path

from .config import CONFIG_FILE, DRAFTS_DIR, MEDIA_DIR, run_setup
from .log import log, set_verbose
from .niche import list_niches


def cmd_draft(args):
    from .draft import generate_draft
    from .state import PipelineState
    import json

    DRAFTS_DIR.mkdir(parents=True, exist_ok=True)
    job_id = str(int(time.time()))

    niche = getattr(args, "niche", "general") or "general"
    platform = getattr(args, "platform", "tiktok") or "tiktok"
    provider = getattr(args, "provider", None)

    print(f"\n  Drafting: {args.news} [niche: {niche}, platform: {platform}]\n")
    draft = generate_draft(
        args.news,
        getattr(args, "context", ""),
        niche=niche,
        platform=platform,
        provider=provider,
        lang="vi",
    )
    draft["job_id"] = job_id

    out_path = DRAFTS_DIR / f"{job_id}.json"
    state = PipelineState(draft)
    state.complete_stage("research")
    state.complete_stage("draft")
    state.save(out_path)

    print(f"\n  Draft saved: {out_path}")
    print(f"\n  Script:\n{draft['script']}")
    print(f"\n  Title: {draft.get('title', '')}")
    print(f"\n  B-roll prompts:")
    for i, p in enumerate(draft.get("broll_prompts", [])):
        print(f"  {i+1}. {p}")

    return out_path


def cmd_produce(args):
    from .broll import generate_broll
    from .tts import generate_voiceover
    from .captions import generate_captions
    from .music import select_and_prepare_music
    from .assemble import assemble_video
    from .niche import load_niche, get_voice_config, get_caption_config, get_music_config
    from .state import PipelineState
    import json
    import shutil

    draft_path = Path(args.draft)
    draft = json.loads(draft_path.read_text())
    job_id = draft["job_id"]
    lang = "vi"
    state = PipelineState(draft)

    # Load niche profile for voice/caption/music config
    niche_name = draft.get("niche", "general")
    profile = load_niche(niche_name)

    MEDIA_DIR.mkdir(parents=True, exist_ok=True)
    work_dir = MEDIA_DIR / f"work_{job_id}_{lang}"
    work_dir.mkdir(exist_ok=True)

    force = getattr(args, "force", False)
    tts_provider = getattr(args, "voice", None)
    script = getattr(args, "script", None) or draft.get("script")

    print(f"\n  Producing {lang.upper()} video for job {job_id} [niche: {niche_name}]")

    # B-roll
    if force or not state.is_done("broll"):
        frames = generate_broll(draft.get("broll_prompts", ["Cinematic landscape"] * 3), work_dir)
        state.complete_stage("broll", {"frames": [str(f) for f in frames]})
    else:
        log("Skipping b-roll (already done)")
        frames = [Path(f) for f in state.get_artifact("broll", "frames", [])]

    # Voiceover (niche-aware voice selection)
    if force or not state.is_done("voiceover"):
        voice_config = get_voice_config(
            profile,
            provider=tts_provider or "edge_tts",
        )
        vo_path = generate_voiceover(
            script, work_dir,
            provider=tts_provider,
            voice_config=voice_config,
        )
        state.complete_stage("voiceover", {"path": str(vo_path)})
    else:
        log("Skipping voiceover (already done)")
        vo_path = Path(state.get_artifact("voiceover", "path"))

    # Whisper + Captions (niche-aware styling)
    caption_config = get_caption_config(profile)
    from .config import load_config as _load_cfg
    _cfg = _load_cfg()
    if force or not state.is_done("captions"):
        captions_result = generate_captions(
            vo_path, work_dir, lang,
            highlight_color=caption_config.get("highlight_color", "#FFFF00"),
            words_per_group=int(_cfg.get("CAPTION_MAX_WORDS", caption_config.get("words_per_group", 8))),
            split_mode=_cfg.get("CAPTION_SPLIT_MODE", "smart"),
        )
        state.complete_stage("captions", {
            "srt_path": str(captions_result.get("srt_path", "")),
            "ass_path": str(captions_result.get("ass_path", "")),
        })
    else:
        log("Skipping captions (already done)")
        captions_result = {
            "srt_path": state.get_artifact("captions", "srt_path", ""),
            "ass_path": state.get_artifact("captions", "ass_path", ""),
        }

    # Music (niche-aware mood/ducking)
    music_config = get_music_config(profile)
    if force or not state.is_done("music"):
        music_result = select_and_prepare_music(
            vo_path, work_dir,
            duck_speech=music_config.get("duck_volume_speech", 0.12),
            duck_gap=music_config.get("duck_volume_gap", 0.25),
        )
        state.complete_stage("music", {
            "track_path": str(music_result.get("track_path", "")),
            "duck_filter": music_result.get("duck_filter", ""),
        })
    else:
        log("Skipping music (already done)")
        music_result = {
            "track_path": state.get_artifact("music", "track_path", ""),
            "duck_filter": state.get_artifact("music", "duck_filter", ""),
        }

    # Assemble
    if force or not state.is_done("assemble"):
        video_path = assemble_video(
            frames=frames,
            voiceover=vo_path,
            out_dir=work_dir,
            job_id=job_id,
            ass_path=captions_result.get("ass_path"),
            music_path=music_result.get("track_path"),
            duck_filter=music_result.get("duck_filter"),
        )
        state.complete_stage("assemble", {"video_path": str(video_path)})
    else:
        log("Skipping assembly (already done)")
        video_path = Path(state.get_artifact("assemble", "video_path"))

    # Save SRT to media dir
    srt_path = captions_result.get("srt_path")
    if srt_path and Path(srt_path).exists():
        final_srt = MEDIA_DIR / f"verticals_{job_id}_{lang}.srt"
        shutil.copy(srt_path, final_srt)
        draft[f"srt_{lang}"] = str(final_srt)

    draft[f"video_{lang}"] = str(video_path)
    state.save(draft_path)

    # Register in shared DB so the dashboard sees CLI-produced videos
    try:
        from .db import register_video
        register_video(draft, video_path)
        log("Registered video in dashboard DB")
    except Exception as e:
        log(f"DB registration skipped: {e}")

    print(f"\n  Video: {video_path}")
    return video_path


def cmd_run(args):
    fmt = getattr(args, "format", "text")
    quiet = getattr(args, "quiet", False)
    stage_timings = {}

    t0 = time.time()
    draft_path = cmd_draft(args)
    stage_timings["draft"] = round(time.time() - t0, 1)

    if args.dry_run:
        if not quiet:
            print("  Dry run — skipping produce")
        return

    class ProduceArgs:
        draft = str(draft_path)
        script = None
        force = False
        voice = getattr(args, "voice", None)

    t0 = time.time()
    video_path = cmd_produce(ProduceArgs())
    stage_timings["produce"] = round(time.time() - t0, 1)

    import json
    draft_data = json.loads(Path(str(draft_path)).read_text())

    if fmt == "json":
        result = {
            "status": "success",
            "video_id": draft_data.get("job_id", ""),
            "topic": getattr(args, "news", ""),
            "video_path": str(video_path),
            "duration": stage_timings.get("produce", 0),
            "stages": {k: {"status": "done", "duration": v} for k, v in stage_timings.items()},
        }
        print(_json.dumps(result, ensure_ascii=False, indent=2))
    elif not quiet:
        print(f"\n  Done! Video: {video_path}")


def cmd_topics(args):
    from .topics import TopicEngine

    niche = getattr(args, "niche", "general") or "general"
    engine = TopicEngine(niche=niche)
    candidates = engine.discover(limit=getattr(args, "limit", 15))

    if not candidates:
        print("  No topics found from enabled sources.")
        return

    print(f"\n  Trending topics for [{niche}] ({len(candidates)} found):\n")
    for i, topic in enumerate(candidates, 1):
        score = f" [{topic.trending_score:.2f}]" if topic.trending_score else ""
        print(f"  {i:2d}. [{topic.source}] {topic.title}{score}")
        if topic.summary:
            print(f"      {topic.summary[:100]}")


def cmd_api(args):
    """Start the FastAPI dev server."""
    import uvicorn
    uvicorn.run("verticals.api.main:app", host=args.host, port=args.port, reload=True)


def cmd_niches(args):
    """List all available niche profiles."""
    niches = list_niches()
    print(f"\n  Available niches ({len(niches)}):\n")
    for n in niches:
        from .niche import load_niche
        profile = load_niche(n)
        display = profile.get("display_name", n)
        desc = profile.get("description", "")[:80]
        print(f"    {n:20s}  {display}")
        if desc:
            print(f"    {' ':20s}  {desc}")


def main():
    if not CONFIG_FILE.exists():
        print("  First run detected. Running setup...")
        run_setup()

    parser = argparse.ArgumentParser(
        description="Verticals v4 — AI-Native Vertical Video Engine",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="Docs: https://github.com/rushindrasinha/verticals\n"
               "Product: https://verticals.gg",
    )
    parser.add_argument("--verbose", "-v", action="store_true", help="Enable debug logging")
    sub = parser.add_subparsers(dest="cmd")

    # Shared niche/provider args
    niche_help = f"Content niche ({', '.join(list_niches()[:8])}...)"

    # draft
    p_draft = sub.add_parser("draft", help="Generate script + metadata")
    p_draft.add_argument("--news", required=False, help="Topic/news headline")
    p_draft.add_argument("--context", default="", help="Channel context")
    p_draft.add_argument("--niche", default="general", help=niche_help)
    p_draft.add_argument("--platform", default="tiktok", choices=["tiktok", "shorts", "reels"])
    p_draft.add_argument("--provider", default=None, choices=["gemini", "ollama"], help="LLM provider: gemini, ollama")
    p_draft.add_argument("--discover", action="store_true", help="Use topic engine")
    p_draft.add_argument("--auto-pick", action="store_true", help="Let LLM pick the best topic")
    p_draft.add_argument("--dry-run", action="store_true", help="Draft only")

    # produce
    p_produce = sub.add_parser("produce", help="Generate video from draft")
    p_produce.add_argument("--draft", required=True)
    p_produce.add_argument("--voice", default=None, help="TTS: edge, elevenlabs, say")
    p_produce.add_argument("--script", default=None, help="Override script text")
    p_produce.add_argument("--force", action="store_true", help="Redo all stages")

    # run (full pipeline)
    p_run = sub.add_parser("run", help="Full pipeline: draft -> produce")
    p_run.add_argument("--news", required=False, help="Topic/news headline")
    p_run.add_argument("--niche", default="general", help=niche_help)
    p_run.add_argument("--platform", default="tiktok", choices=["tiktok", "shorts", "reels"])
    p_run.add_argument("--provider", default=None, choices=["gemini", "ollama"], help="LLM provider: gemini, ollama")
    p_run.add_argument("--voice", default=None, help="TTS: edge, elevenlabs, say")
    p_run.add_argument("--dry-run", action="store_true")
    p_run.add_argument("--context", default="")
    p_run.add_argument("--discover", action="store_true", help="Auto-discover trending topics")
    p_run.add_argument("--auto-pick", action="store_true", help="Let LLM pick best topic")
    p_run.add_argument("--format", default="text", choices=["text", "json"], help="Output format")
    p_run.add_argument("--quiet", "-q", action="store_true", help="No interactive prompts")

    # topics
    p_topics = sub.add_parser("topics", help="Discover trending topics")
    p_topics.add_argument("--niche", default="general", help=niche_help)
    p_topics.add_argument("--limit", type=int, default=15, help="Max topics to show")

    # niches
    sub.add_parser("niches", help="List available niche profiles")

    # api
    p_api = sub.add_parser("api", help="Start the FastAPI dev server")
    p_api.add_argument("--port", type=int, default=8000, help="Port (default 8000)")
    p_api.add_argument("--host", default="127.0.0.1", help="Host (default 127.0.0.1)")

    args = parser.parse_args()

    if args.verbose:
        set_verbose(True)

    if not args.cmd:
        parser.print_help()
        return

    # Handle niches command
    if args.cmd == "niches":
        cmd_niches(args)
        return

    # Handle api command
    if args.cmd == "api":
        cmd_api(args)
        return

    # Handle --discover flag for draft/run
    quiet = getattr(args, "quiet", False)
    if args.cmd in ("draft", "run") and getattr(args, "discover", False):
        from .topics import TopicEngine
        niche = getattr(args, "niche", "general") or "general"
        engine = TopicEngine(niche=niche)
        candidates = engine.discover(limit=15)
        if not candidates:
            if not quiet:
                print("  No trending topics found. Use --news instead.")
            sys.exit(1)

        if getattr(args, "auto_pick", False):
            args.news = engine.auto_pick(candidates)
            if not quiet:
                print(f"  Auto-picked: {args.news}")
        elif quiet:
            # In quiet mode without auto-pick, use first topic
            args.news = candidates[0].title
        else:
            print("\n  Trending topics:\n")
            for i, t in enumerate(candidates, 1):
                print(f"  {i:2d}. [{t.source}] {t.title}")
            choice = input("\n  Pick a number (or enter custom topic): ").strip()
            if choice.isdigit() and 1 <= int(choice) <= len(candidates):
                args.news = candidates[int(choice) - 1].title
            else:
                args.news = choice
    elif args.cmd in ("draft", "run") and not getattr(args, "news", None):
        print("  Error: --news or --discover required")
        sys.exit(1)

    if args.cmd == "draft":
        cmd_draft(args)
    elif args.cmd == "produce":
        cmd_produce(args)
    elif args.cmd == "run":
        cmd_run(args)
    elif args.cmd == "topics":
        cmd_topics(args)


if __name__ == "__main__":
    main()
