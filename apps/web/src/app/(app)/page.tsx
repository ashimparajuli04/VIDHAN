import { Suspense } from "react";

import { ChatView } from "@/features/chat/components/chat-view";

export default function Home() {
  return (
    <Suspense fallback={null}>
      <ChatView />
    </Suspense>
  );
}
