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
}

declare global {
  interface Window {
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
