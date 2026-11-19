import { NextRequest } from 'next/server';
import { requireRole } from '@/app/lib/auth';
import {
  subscribeRealtimeEvents,
  type RealtimeEvent,
} from '@/app/lib/realtimeBus';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const HEARTBEAT_INTERVAL_MS = 25000;

export async function GET(request: NextRequest): Promise<Response> {
  const auth = requireRole(request, ['staff', 'admin']);
  if (auth.errorResponse) {
    return auth.errorResponse;
  }

  const encoder = new TextEncoder();
  let streamController: ReadableStreamDefaultController<Uint8Array> | null = null;
  let unsubscribe: (() => void) | null = null;
  let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  let isClosed = false;

  const cleanup = (shouldCloseController: boolean) => {
    if (isClosed) {
      return;
    }
    isClosed = true;

    if (heartbeatTimer !== null) {
      clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }

    if (unsubscribe !== null) {
      unsubscribe();
      unsubscribe = null;
    }

    request.signal.removeEventListener('abort', onAbort);

    if (shouldCloseController && streamController !== null) {
      try {
        streamController.close();
      } catch {
        // Stream controller may already be closed when the client disconnects
      }
    }
    streamController = null;
  };

  const onAbort = () => {
    cleanup(true);
  };

  const enqueueText = (chunk: string) => {
    if (isClosed || streamController === null) {
      return;
    }
    try {
      streamController.enqueue(encoder.encode(chunk));
    } catch {
      cleanup(false);
    }
  };

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      streamController = controller;

      if (request.signal.aborted) {
        cleanup(true);
        return;
      }

      enqueueText(': connected\n\n');

      unsubscribe = subscribeRealtimeEvents((ev: RealtimeEvent) => {
        enqueueText(`event: ${ev.type}\ndata: ${JSON.stringify(ev)}\n\n`);
      });

      heartbeatTimer = setInterval(() => {
        enqueueText(': ping\n\n');
      }, HEARTBEAT_INTERVAL_MS);

      request.signal.addEventListener('abort', onAbort, { once: true });
    },
    cancel() {
      cleanup(false);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
