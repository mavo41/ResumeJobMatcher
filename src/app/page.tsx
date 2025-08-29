import { title } from "process";
import { resumes } from "./constants";
import ResumeCard from "./components/ResumeCard";
import Link from "next/link";
import DebugAuth from "./components/DebugAuth";

export function meta() {

   return [
      {title: "Resume Matcher"},
      {name: "description", content: "Upload your resume and get personalized feedback for your dream job. Track your applications and resume ratings to land an interview."},
   ]
 
}
export default function HomePage() {
  return (
    <main className="bg-[url('/images/bg-main.svg')] bg-cover">
      <section className="main-section">
        <div className="flex flex-col min-h-screen text-foreground overflow-hidden">
          <section className="relative z-10 py-24 flex-grow">
            <div className="container mx-auto px-4">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
                
                {/* Left Section */}
                <div className="lg:col-span-7 space-y-8">
                  <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-tight">
                    <span className="text-black">AI </span>
                    <span className="text-primary">Resume </span>
                    <span className="text-black">Matcher</span>
                  </h1>

                  <p className="text-lg md:text-xl text-black max-w-xl">
                    Upload your resume and get a personalized smart feedback for your dream job. 
                    Track your applications and resume ratings so that you can have your resume reviewed in minutes. 
                    Land that interview.
                  </p>

                  {/* Stats */}
                  <div className="flex flex-wrap gap-10 font-mono">
                    <div className="flex flex-col items-center">
                      <p className="text-3xl text-primary">500+</p>
                      <p className="text-sm text-red-400 uppercase tracking-wide mt-1">Satistied Clients</p>
                    </div>
                    <div className="flex flex-col items-center">
                      <p className="text-3xl text-primary">3min</p>
                      <p className="text-sm text-red-400 uppercase tracking-wide mt-1">Resume Analization</p>
                    </div>
                    <div className="flex flex-col items-center">
                      <p className="text-3xl text-primary">100%</p>
                      <p className="text-sm text-red-400 uppercase tracking-wide mt-1">Personalized</p>
                    </div>
                  </div>
                  <DebugAuth />
 <Link href="/upload" className="primary-button w-fit text-xl font-semibold">
              Upload Resume
            </Link>
                  <p className="text-primary">
                    Join 500+ users with AI-customized resume matcher programs.
                  </p>
                </div>

                {/* Right Section */}
                <div className="lg:col-span-5">
                  <div className="relative aspect-square max-w-lg mx-auto rounded-lg overflow-hidden shadow-lg">
                    <img
                      src="/images/resume-scan-2.gif"
                      alt="AI Resume Matcher"
                      className="w-full h-full object-cover object-center"
                    />
                    {/* Overlay Gradient */}
                    <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      

{/* Resume Cards Section */}
    {/* Resume Cards Section */}
          {resumes.length > 0 && (
            <div className="container mx-auto px-4 py-12">
              <h2 className="text-2xl font-bold mb-6 text-black">Featured Resumes</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {resumes.map((resume) => (
                  <ResumeCard key={resume.id} resume={resume} />
                ))}
              </div>
            </div>
          )}
</section>
    </main>
  );
}      



      

    



