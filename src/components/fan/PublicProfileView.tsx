import ProfileView from "@/components/fan/ProfileView";
import { PROFILE_PATH } from "@/lib/routes";
import type { FanProfile } from "@/types";

interface Props {
  profile: FanProfile;
  isOwner: boolean;
}

export default function PublicProfileView({ profile, isOwner }: Props) {
  return (
    <ProfileView
      profile={profile}
      showEmail={false}
      onEdit={
        isOwner
          ? () => {
              window.location.href = PROFILE_PATH;
            }
          : undefined
      }
    />
  );
}
