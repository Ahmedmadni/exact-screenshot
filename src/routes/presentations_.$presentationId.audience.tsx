import { createFileRoute } from "@tanstack/react-router";
import { Maximize2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { SlideStage, useFitScale } from "@/components/editor/slide-renderer";
import { usePresentation } from "@/lib/data/store";
import { materializeSlide } from "@/lib/editor/layouts";
import { getTheme } from "@/lib/editor/themes";
import { SLIDE_H, SLIDE_W } from "@/lib/editor/model";

export const Route = createFileRoute("/presentations_/$presentationId/audience")({
  head: () => ({
    meta: [
      { title: "Audience View — Meridian Studio" },
      { name: "description", content: "Clean audience-facing presentation view synchronized with Presenter View." },
    ],
  }),
  component: AudiencePage,
});

function AudiencePage() {
  const { presentationId } = Route.useParams();
  const raw = usePresentation(presentationId);
  const [index, setIndex] = useState(0);
  const [connected, setConnected] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const channelRef = useRef<BroadcastChannel | null>(null);
  const { ref, scale } = useFitScale();

  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") return;
    const channel = new BroadcastChannel("meridian-presenter-" + presentationId);
    channelRef.current = channel;
    channel.onmessage = (event) => {
      const message = event.data;
      if (message?.type === "slide" && typeof message.index === "number") {
        setIndex(Math.max(0, Math.round(message.index)));
        setConnected(true);
      }
      if (message?.type === "ping") {
        setConnected(true);
      }
    };
    channel.postMessage({ type: "ready" });
    return () => {
      channel.close();
      channelRef.current = null;
    };
  }, [presentationId]);

  useEffect(() => {
    let timer: number | undefined;
    const reveal = () => {
      setShowControls(true);
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setShowControls(false), 2200);
    };
    window.addEventListener("mousemove", reveal);
    reveal();
    return () => {
      window.removeEventListener("mousemove", reveal);
      window.clearTimeout(timer);
    };
  }, []);

  if (!raw) {
    return (
      <div className="grid min-h-screen place-items-center bg-black p-6 text-white">
        <EmptyState icon={Maximize2} title="Presentation not found" description="The audience view could not load this presentation." />
      </div>
    );
  }

  const slides = raw.slides.map(materializeSlide);
  const safeIndex = Math.max(0, Math.min(slides.length - 1, index));
  const slide = slides[safeIndex];
  const theme = getTheme(raw.themeId, raw.themeOverrides);

  const fullscreen = () => document.documentElement.requestFullscreen?.().catch(() => {});

  return (
    <div className="fixed inset-0 bg-black">
      <div ref={ref} className="absolute inset-0 overflow-hidden" dir="ltr">
        {slide && (
          <div
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              width: SLIDE_W,
              height: SLIDE_H,
              marginLeft: -SLIDE_W / 2,
              marginTop: -SLIDE_H / 2,
              transform: "scale(" + scale + ")",
            }}
          >
            <SlideStage slide={slide} theme={theme} />
          </div>
        )}
      </div>

      <div className={"pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between p-3 transition-opacity " + (showControls ? "opacity-100" : "opacity-0")}>
        <div className="rounded-full bg-black/55 px-3 py-1 text-[11px] text-white/75 backdrop-blur">
          {connected ? "Connected to Presenter" : "Waiting for Presenter"} · {safeIndex + 1}/{slides.length}
        </div>
        <Button
          size="icon"
          variant="ghost"
          className="pointer-events-auto bg-black/45 text-white hover:bg-black/70 hover:text-white"
          onClick={fullscreen}
          aria-label="Fullscreen"
        >
          <Maximize2 className="size-4" />
        </Button>
      </div>
    </div>
  );
}
