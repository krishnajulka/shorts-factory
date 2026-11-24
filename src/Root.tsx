import { Composition } from "remotion";
import { FPS, StoryShort, calculateMetadata } from "./engine/StoryShort";
import { RenderStory } from "./engine/types";
import { Parkour } from "./satisfying/Parkour";
import { PARKOUR_CLIP_SECONDS } from "./satisfying/ParkourClip";
// The pipeline (scripts/make.mjs) writes the most recent story here so the
// Studio always opens on it. Renders pass their own story via --props.
import preview from "./generated/preview.props.json";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="StoryShort"
        component={StoryShort}
        durationInFrames={300}
        fps={FPS}
        width={1080}
        height={1920}
        defaultProps={{ story: preview.story as RenderStory }}
        calculateMetadata={calculateMetadata}
      />
      {/* Live 3D parkour run, pre-rendered on a PC into public/clips/ by
          scripts/render-parkour-clips.mjs (too slow to render on the GPU-less cloud). */}
      <Composition id="ParkourClip" component={Parkour} durationInFrames={PARKOUR_CLIP_SECONDS * FPS} fps={FPS} width={1080} height={960} defaultProps={{ seed: 1 }} />
    </>
  );
};
