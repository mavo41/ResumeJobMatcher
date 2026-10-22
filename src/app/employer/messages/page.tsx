
import { Suspense } from "react";

import MessagesContent from "@/components/employer/MessagesContent";
export default function MessagesPage() {
  return (
    <Suspense
      fallback={
        <div className="p-6 text-center">
          Loading messages...
        </div>
      }
    >
      <MessagesContent />
    </Suspense>
  );
}
