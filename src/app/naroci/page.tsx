import { Suspense } from "react";
import BookingWizard from "./wizard";

export const dynamic = "force-dynamic";

export default function NarociPage() {
  return (
    <Suspense>
      <BookingWizard />
    </Suspense>
  );
}
