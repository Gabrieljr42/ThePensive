import type { RunRequest } from "@/lib/contracts";
import { useArchiveStore } from "../store";
import { archiveDirector } from "../director";
import { getInquiryTransport } from "./transport";

let current: AbortController | null = null;
export async function submitInquiry(request: RunRequest, volumes: string[]) {
  current?.abort();
  const abort = new AbortController();
  current = abort;
  const requestId = useArchiveStore.getState().beginInquiry();
  const unsubscribe = useArchiveStore.subscribe((state) => {
    if (state.requestId !== requestId) abort.abort();
  });
  archiveDirector.castQuestion();
  archiveDirector.beginDive(requestId);
  try {
    for await (const update of getInquiryTransport().watch(
      request,
      [...volumes],
      abort.signal,
    )) {
      if (
        !useArchiveStore
          .getState()
          .updateInquiry(requestId, update.run, update.connection)
      )
        break;
      archiveDirector.receiveInquiry(requestId);
    }
  } catch (error) {
    const state = useArchiveStore.getState();
    if (state.requestId !== requestId || abort.signal.aborted) {
      if (
        error instanceof Error &&
        error.message.includes("confirm cancellation") &&
        current === abort &&
        state.requestId === requestId + 1
      )
        state.failInquiry(state.requestId, error.message);
      return;
    }
    state.failInquiry(
      requestId,
      error instanceof Error
        ? error.message
        : "The archive could not complete this inquiry. Try again.",
    );
    archiveDirector.finishDive(requestId);
  } finally {
    unsubscribe();
    if (current === abort) current = null;
  }
}
