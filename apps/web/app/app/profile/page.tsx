import { requireOrgContext } from "@/lib/auth";
import { ProfileView } from "@/components/app/profile-view";

export const metadata = { title: "Profile" };
export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const context = await requireOrgContext();
  return (
    <ProfileView
      user={{
        name: context.user.fullName ?? context.user.email,
        email: context.user.email,
      }}
      organization={{ name: context.organization.name, slug: context.organization.slug }}
      role={context.membership.role}
      joinedAt={context.membership.createdAt}
    />
  );
}
