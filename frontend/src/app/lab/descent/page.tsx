import { MidnightArchive } from "@/features/archive/MidnightArchive";
import { ArchiveInquiryLab } from "@/features/archive/ui/ArchiveInquiryLab";

export default function DescentPreviewPage() {
  return (
    <>
      <MidnightArchive initialPhase="desk" />
      <ArchiveInquiryLab />
    </>
  );
}
