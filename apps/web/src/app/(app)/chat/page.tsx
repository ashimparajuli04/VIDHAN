import { Suspense } from "react";

import { ChatView } from "@/features/chat/components/chat-view";

export default function Chat() {
  return (
    <Suspense fallback={null}>
      <ChatView />
    </Suspense>
  );
}
