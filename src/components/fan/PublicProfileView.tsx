import FriendActionButton from "@/components/fan/FriendActionButton";
import ProfileView from "@/components/fan/ProfileView";
import { PROFILE_PATH } from "@/lib/routes";
import type { PublicFanProfile } from "@/types";

interface Props {
  profile: PublicFanProfile;
  profileUserId: string;
  isOwner: boolean;
  isLoggedIn: boolean;
}

export default function PublicProfileView({ profile, profileUserId, isOwner, isLoggedIn }: Props) {
  return (
    <ProfileView
      profile={profile}
      showEmail={false}
      actionSlot={
        !isOwner ? (
          <FriendActionButton profileUserId={profileUserId} profileLogin={profile.login} isLoggedIn={isLoggedIn} />
        ) : undefined
      }
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
