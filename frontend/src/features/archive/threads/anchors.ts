import * as THREE from "three";

export type AnchorSide = "left" | "right" | "top" | "bottom" | "center";

export interface DomAnchorRecord {
  kind: "dom";
  el: HTMLElement;
  side: AnchorSide;
}

export interface WorldAnchorRecord {
  kind: "world";
  getWorldPos: () => THREE.Vector3;
}

export type AnchorRecord = DomAnchorRecord | WorldAnchorRecord;

class AnchorRegistry {
  private anchors = new Map<string, AnchorRecord>();
  private tempVec = new THREE.Vector3();

  registerDom(id: string, el: HTMLElement, side: AnchorSide = "center") {
    this.anchors.set(id, { kind: "dom", el, side });
    return () => {
      if (this.anchors.get(id)?.kind === "dom") {
        this.anchors.delete(id);
      }
    };
  }

  registerWorld(id: string, getWorldPos: () => THREE.Vector3) {
    this.anchors.set(id, { kind: "world", getWorldPos });
    return () => {
      if (this.anchors.get(id)?.kind === "world") {
        this.anchors.delete(id);
      }
    };
  }

  getScreenPos(
    id: string,
    camera: THREE.Camera | null,
    width: number,
    height: number,
  ): { x: number; y: number } | null {
    const record = this.anchors.get(id);
    if (!record) return null;

    if (record.kind === "dom") {
      if (!record.el || !record.el.isConnected) return null;
      const rect = record.el.getBoundingClientRect();
      let x = rect.left + rect.width / 2;
      let y = rect.top + rect.height / 2;

      if (record.side === "left") x = rect.left;
      else if (record.side === "right") x = rect.right;
      else if (record.side === "top") y = rect.top;
      else if (record.side === "bottom") y = rect.bottom;

      return { x, y };
    }

    if (record.kind === "world" && camera) {
      const pos = record.getWorldPos();
      this.tempVec.copy(pos);
      this.tempVec.project(camera);

      // Convert NDC (-1 to +1) to screen pixels
      const x = ((this.tempVec.x + 1) * 0.5) * width;
      const y = ((-this.tempVec.y + 1) * 0.5) * height;

      // Check if behind camera
      if (this.tempVec.z > 1) return null;

      return { x, y };
    }

    return null;
  }
}

export const anchorRegistry = new AnchorRegistry();
