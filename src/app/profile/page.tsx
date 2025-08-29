import ProfileHeader from "../components/ProfileHeader"
import { useUser } from "@clerk/nextjs";


const Profilepage = () => {

  const { user } = useUser();
  const userId = user?.id ?? null; // ✅ avoid undefined

  console.log("Current Clerk userId:", userId);

  return (
     <section className="relative z-10 pt-12 pb-32 flex-grow container mx-auto px-4">
    <div>Profile</div>
     <ProfileHeader user={user} />
    </section>
  )
}

export default Profilepage