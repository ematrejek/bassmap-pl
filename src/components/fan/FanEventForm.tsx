import EventForm from "@/components/admin/EventForm";
import { MY_EVENTS_PATH } from "@/lib/routes";

interface Props {
  serverError?: string | null;
}

export default function FanEventForm({ serverError }: Props) {
  return (
    <EventForm
      mode="create"
      variant="fan"
      submitUrl="/api/fan/events"
      successRedirect={`${MY_EVENTS_PATH}?submitted=1#dodaje`}
      showCoverUpload={true}
      serverError={serverError}
    />
  );
}
