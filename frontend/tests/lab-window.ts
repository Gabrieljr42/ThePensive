export interface FrameStats {
  width: number;
  height: number;
  clientWidth: number;
  clientHeight: number;
  pixelRatio: number;
  minLum: number;
  maxLum: number;
  meanLum: number;
  variance: number;
  paintedFraction: number;
  bboxCoverage: number;
  hash: number;
  renderer: string;
  floorRange: number;
  floorReversals: number;
  shelfRange: number;
  shelfReversals: number;
  drawCalls: number;
  triangles: number;
  surface: { left: number; right: number; top: number; bottom: number } | null;
}

declare global {
  interface Window {
    pensieveAudioCreations?: number;
    pensieveLab: {
      lcp: number;
      cls: number;
      longestInteraction: number;
      longTasks: number[];
    };
    __pensieveArchive?: {
      readStats: () => FrameStats;
    };
  }
}
